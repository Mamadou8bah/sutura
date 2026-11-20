package com.mamadou.sutura.agent.service;

import com.mamadou.sutura.agent.dto.AgentOperationResponse;
import com.mamadou.sutura.common.security.SecurityRoleUtils;
import com.mamadou.sutura.deposit.entity.Deposit;
import com.mamadou.sutura.deposit.repository.DepositRepository;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import com.mamadou.sutura.wallet.service.LedgerWalletMovementService;
import com.mamadou.sutura.withdrawal.entity.Withdrawal;
import com.mamadou.sutura.withdrawal.repository.WithdrawalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AgentOperationService {

    private final DepositRepository depositRepository;
    private final WithdrawalRepository withdrawalRepository;
    private final CashOutQrService cashOutQrService;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final LedgerWalletMovementService ledgerWalletMovementService;
    private final com.mamadou.sutura.fraud.service.PaymentComplianceService compliance;

    @Transactional(readOnly = true)
    public java.util.List<AgentOperationResponse> history(User agent) {
        requireAgent(agent);
        var items = new java.util.ArrayList<AgentOperationResponse>();
        depositRepository.findTop100ByAgentIdOrderByCreatedAtDesc(agent.getId()).forEach(d ->
            items.add(toResponse("DEPOSIT", d.getReference(), d.getWallet(), d.getAmount(), d.getStatus().name(), d.getUser(), d.getCreatedAt(), d.getCompletedAt())));
        withdrawalRepository.findTop100ByAgentIdOrderByCreatedAtDesc(agent.getId()).forEach(w ->
            items.add(toResponse("WITHDRAWAL", w.getReference(), w.getWallet(), w.getAmount(), w.getStatus().name(), w.getUser(), w.getCreatedAt(), w.getCompletedAt())));
        items.sort(java.util.Comparator.comparing(AgentOperationResponse::getCreatedAt,
            java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())));
        return items;
    }

    @Transactional(readOnly = true)
    public AgentOperationResponse lookup(String reference, User agent) {
        return lookup(reference, agent, null);
    }

    @Transactional(readOnly = true)
    public AgentOperationResponse lookup(String reference, User agent, String authorizationToken) {
        requireAgent(agent);
        Deposit deposit = depositRepository.findByReferenceIgnoreCase(reference).orElse(null);
        if (deposit != null) {
            return toResponse("DEPOSIT", deposit.getReference(), deposit.getWallet(), deposit.getAmount(), deposit.getStatus().name(), deposit.getUser(), deposit.getCreatedAt(), deposit.getCompletedAt());
        }
        Withdrawal withdrawal = withdrawalRepository.findByReferenceIgnoreCase(reference)
                .orElseThrow(() -> new IllegalArgumentException("Operation not found for reference " + reference));
        cashOutQrService.requireClaim(withdrawal, agent, authorizationToken);
        return toResponse("WITHDRAWAL", withdrawal.getReference(), withdrawal.getWallet(), withdrawal.getAmount(), withdrawal.getStatus().name(), withdrawal.getUser(), withdrawal.getCreatedAt(), withdrawal.getCompletedAt());
    }

    @Transactional
    public AgentOperationResponse complete(String reference, User agent) {
        return complete(reference, agent, null);
    }

    @Transactional
    public AgentOperationResponse complete(String reference, User agent, String authorizationToken) {
        requireAgent(agent);
        Deposit deposit = depositRepository.findForCompletion(reference).orElse(null);
        if (deposit != null) {
            return completeDeposit(deposit, agent);
        }
        Withdrawal withdrawal = withdrawalRepository.findForCompletion(reference)
                .orElseThrow(() -> new IllegalArgumentException("Operation not found for reference " + reference));
        cashOutQrService.requireClaim(withdrawal, agent, authorizationToken);
        return completeWithdrawal(withdrawal, agent);
    }

    private AgentOperationResponse completeDeposit(Deposit deposit, User agent) {
        if (deposit.getPaymentMethod() != null && !deposit.getPaymentMethod().isBlank()) {
            throw new WalletOperationException("External provider deposits cannot be completed as agent cash");
        }
        if (deposit.getStatus() == Deposit.DepositStatus.COMPLETED) {
            return toResponse("DEPOSIT", deposit.getReference(), deposit.getWallet(), deposit.getAmount(), deposit.getStatus().name(), deposit.getUser(), deposit.getCreatedAt(), deposit.getCompletedAt());
        }
        if (deposit.getStatus() == Deposit.DepositStatus.PENDING_REVIEW || deposit.getStatus() == Deposit.DepositStatus.FAILED)
            return toResponse("DEPOSIT", deposit.getReference(), deposit.getWallet(), deposit.getAmount(), deposit.getStatus().name(), deposit.getUser(), deposit.getCreatedAt(), deposit.getCompletedAt());
        if (deposit.getStatus() != Deposit.DepositStatus.AWAITING_AGENT && deposit.getStatus() != Deposit.DepositStatus.PENDING
                && deposit.getStatus() != Deposit.DepositStatus.APPROVED) {
            throw new WalletOperationException("Deposit cannot be completed in status " + deposit.getStatus());
        }

        var product = transactionRepository.findForUpdateByReference(deposit.getReference()).orElseThrow();
        if (!compliance.assess(product, deposit.getUser(), deposit.getWallet(), "deposit")) {
            deposit.setStatus(product.getStatus() == TransactionStatus.FAILED ? Deposit.DepositStatus.FAILED : Deposit.DepositStatus.PENDING_REVIEW);
            deposit.setFailureReason(product.getFailureReason()); depositRepository.save(deposit);
            return toResponse("DEPOSIT", deposit.getReference(), deposit.getWallet(), deposit.getAmount(), deposit.getStatus().name(), deposit.getUser(), deposit.getCreatedAt(), deposit.getCompletedAt());
        }
        ledgerWalletMovementService.creditWallet(
                deposit.getWallet(),
                deposit.getUser(),
                deposit.getAmount(),
                deposit.getReference(),
                "Agent-assisted deposit"
        );

        deposit.setAgent(agent);
        deposit.setDepositType(Deposit.DepositType.AGENT);
        deposit.setStatus(Deposit.DepositStatus.COMPLETED);
        deposit.setCompletedAt(LocalDateTime.now());
        depositRepository.save(deposit);

        transactionRepository.findByReference(deposit.getReference()).ifPresent(txn -> {
            txn.setStatus(TransactionStatus.COMPLETED);
            transactionRepository.save(txn);
        });

        return toResponse("DEPOSIT", deposit.getReference(), deposit.getWallet(), deposit.getAmount(), deposit.getStatus().name(), deposit.getUser(), deposit.getCreatedAt(), deposit.getCompletedAt());
    }

    private AgentOperationResponse completeWithdrawal(Withdrawal withdrawal, User agent) {
        if (withdrawal.getWithdrawalMethod() != null && !withdrawal.getWithdrawalMethod().isBlank()) {
            throw new WalletOperationException("External provider withdrawals cannot be completed as agent cash");
        }
        if (withdrawal.getStatus() == Withdrawal.WithdrawalStatus.COMPLETED) {
            return toResponse("WITHDRAWAL", withdrawal.getReference(), withdrawal.getWallet(), withdrawal.getAmount(), withdrawal.getStatus().name(), withdrawal.getUser(), withdrawal.getCreatedAt(), withdrawal.getCompletedAt());
        }
        if (withdrawal.getStatus() == Withdrawal.WithdrawalStatus.PENDING_REVIEW || withdrawal.getStatus() == Withdrawal.WithdrawalStatus.FAILED)
            return toResponse("WITHDRAWAL", withdrawal.getReference(), withdrawal.getWallet(), withdrawal.getAmount(), withdrawal.getStatus().name(), withdrawal.getUser(), withdrawal.getCreatedAt(), withdrawal.getCompletedAt());
        if (withdrawal.getStatus() != Withdrawal.WithdrawalStatus.AWAITING_AGENT
                && withdrawal.getStatus() != Withdrawal.WithdrawalStatus.PENDING
                && withdrawal.getStatus() != Withdrawal.WithdrawalStatus.APPROVED) {
            throw new WalletOperationException("Withdrawal cannot be completed in status " + withdrawal.getStatus());
        }

        var product = transactionRepository.findForUpdateByReference(withdrawal.getReference()).orElseThrow();
        if (!compliance.assess(product, withdrawal.getUser(), withdrawal.getWallet(), "withdrawal")) {
            withdrawal.setStatus(product.getStatus() == TransactionStatus.FAILED ? Withdrawal.WithdrawalStatus.FAILED : Withdrawal.WithdrawalStatus.PENDING_REVIEW);
            withdrawal.setRejectionReason(product.getFailureReason()); withdrawalRepository.save(withdrawal);
            return toResponse("WITHDRAWAL", withdrawal.getReference(), withdrawal.getWallet(), withdrawal.getAmount(), withdrawal.getStatus().name(), withdrawal.getUser(), withdrawal.getCreatedAt(), withdrawal.getCompletedAt());
        }
        ledgerWalletMovementService.debitWallet(
                withdrawal.getWallet(),
                withdrawal.getUser(),
                withdrawal.getAmount(),
                withdrawal.getReference(),
                "Agent-assisted withdrawal"
        );

        withdrawal.setAgent(agent);
        withdrawal.setWithdrawalType(Withdrawal.WithdrawalType.AGENT);
        withdrawal.setStatus(Withdrawal.WithdrawalStatus.COMPLETED);
        withdrawal.setApprovedAt(LocalDateTime.now());
        withdrawal.setCompletedAt(LocalDateTime.now());
        withdrawalRepository.save(withdrawal);

        transactionRepository.findByReference(withdrawal.getReference()).ifPresent(txn -> {
            txn.setStatus(TransactionStatus.COMPLETED);
            transactionRepository.save(txn);
        });

        return toResponse("WITHDRAWAL", withdrawal.getReference(), withdrawal.getWallet(), withdrawal.getAmount(), withdrawal.getStatus().name(), withdrawal.getUser(), withdrawal.getCreatedAt(), withdrawal.getCompletedAt());
    }

    private void requireAgent(User user) {
        if (!SecurityRoleUtils.isAgent(user) && !SecurityRoleUtils.isAdmin(user)) {
            throw new WalletOperationException("Only agents can perform this operation");
        }
    }

    private AgentOperationResponse toResponse(String operation, String reference, Wallet wallet, java.math.BigDecimal amount, String status, User user, LocalDateTime createdAt, LocalDateTime completedAt) {
        String merchantName = user.getFirstName() + " " + user.getLastName();
        return AgentOperationResponse.builder()
                .createdAt(createdAt).completedAt(completedAt)
                .operation(operation)
                .reference(reference)
                .walletId(wallet.getId())
                .walletName(wallet.getName())
                .amount(amount)
                .currency(wallet.getCurrency())
                .status(status)
                .userId(user.getId())
                .merchantName(merchantName.trim())
                .build();
    }
}
