package com.mamadou.sutura.transaction.service;

import com.mamadou.sutura.common.Exception.AccountNotFoundException;
import com.mamadou.sutura.ledger.dto.LedgerPostingResponse;
import com.mamadou.sutura.ledger.mapper.LedgerMapper;
import com.mamadou.sutura.ledger.repository.LedgerPostingRepository;
import com.mamadou.sutura.transaction.dto.TransactionDetailResponse;
import com.mamadou.sutura.transaction.dto.TransactionFilterRequest;
import com.mamadou.sutura.transaction.dto.TransactionResponse;
import com.mamadou.sutura.transaction.dto.TransactionSearchRequest;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.exception.TransactionException;
import com.mamadou.sutura.transaction.mapper.TransactionMapper;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionQueryService {

    private final TransactionRepository transactionRepository;
    private final LedgerPostingRepository ledgerPostingRepository;
    private final LedgerMapper ledgerMapper;
    private final TransactionMapper transactionMapper;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<TransactionResponse> history(TransactionFilterRequest filter) {
        Long currentUserId = currentUser().getId();
        return transactionRepository.findAll(ownedBy(currentUserId).and(matches(filter)))
                .stream()
                .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
                .map(transactionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> search(TransactionSearchRequest request) {
        Long currentUserId = currentUser().getId();
        String query = request == null || request.getQuery() == null ? "" : request.getQuery().trim().toLowerCase();
        return transactionRepository.findAll(ownedBy(currentUserId).and((root, cq, cb) -> {
                    if (query.isBlank()) {
                        return cb.conjunction();
                    }
                    return cb.or(
                            cb.like(cb.lower(root.get("reference")), "%" + query + "%"),
                            cb.like(cb.lower(root.get("description")), "%" + query + "%")
                    );
                }))
                .stream()
                .sorted((left, right) -> right.getCreatedAt().compareTo(left.getCreatedAt()))
                .map(transactionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TransactionDetailResponse getById(Long id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new TransactionException("Transaction not found"));
        ensureVisibleToCurrentUser(transaction);
        return toDetail(transaction);
    }

    @Transactional(readOnly = true)
    public TransactionDetailResponse getByReference(String reference) {
        Transaction transaction = transactionRepository.findByReference(reference)
                .orElseThrow(() -> new TransactionException("Transaction not found"));
        ensureVisibleToCurrentUser(transaction);
        return toDetail(transaction);
    }

    private TransactionDetailResponse toDetail(Transaction transaction) {
        List<LedgerPostingResponse> postings = transaction.getLedgerTraceId() == null
                ? List.of()
                : ledgerPostingRepository.findByTraceIdOrderByIdAsc(transaction.getLedgerTraceId())
                .stream()
                .map(ledgerMapper::toPostingResponse)
                .toList();
        return transactionMapper.toDetailResponse(transaction, postings);
    }

    private Specification<Transaction> ownedBy(Long userId) {
        return (root, cq, cb) -> {
            if (cq != null && Transaction.class.equals(cq.getResultType())) {
                root.fetch("sourceWallet", jakarta.persistence.criteria.JoinType.LEFT).fetch("user", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("destinationWallet", jakarta.persistence.criteria.JoinType.LEFT).fetch("user", jakarta.persistence.criteria.JoinType.LEFT);
            }
            return cb.or(
                cb.equal(root.get("sourceWallet").get("user").get("id"), userId),
                cb.equal(root.get("destinationWallet").get("user").get("id"), userId)
            );
        };
    }

    private Specification<Transaction> matches(TransactionFilterRequest filter) {
        return (root, cq, cb) -> {
            if (filter == null) {
                return cb.conjunction();
            }

            var predicate = cb.conjunction();
            if (filter.getWalletId() != null) {
                predicate = cb.and(predicate, cb.or(
                        cb.equal(root.get("sourceWallet").get("id"), filter.getWalletId()),
                        cb.equal(root.get("destinationWallet").get("id"), filter.getWalletId())
                ));
            }
            if (filter.getType() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("type"), filter.getType()));
            }
            if (filter.getStatus() != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), filter.getStatus()));
            }
            if (filter.getFrom() != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("createdAt"), filter.getFrom()));
            }
            if (filter.getTo() != null) {
                predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("createdAt"), filter.getTo()));
            }
            return predicate;
        };
    }

    private void ensureVisibleToCurrentUser(Transaction transaction) {
        Long currentUserId = currentUser().getId();
        boolean sourceOwned = transaction.getSourceWallet() != null
                && transaction.getSourceWallet().getUser().getId() == currentUserId.longValue();
        boolean destinationOwned = transaction.getDestinationWallet() != null
                && transaction.getDestinationWallet().getUser().getId() == currentUserId.longValue();
        if (!sourceOwned && !destinationOwned) {
            throw new TransactionException("Transaction not found");
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccountNotFoundException("Authenticated user not found");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }

        String username = authentication.getName();
        return userRepository.findByEmail(username)
                .or(() -> userRepository.findByPhoneNumber(username))
                .orElseThrow(() -> new AccountNotFoundException("Authenticated user not found"));
    }
}
