package com.mamadou.sutura.transaction.mapper;

import com.mamadou.sutura.ledger.dto.LedgerPostingResponse;
import com.mamadou.sutura.transaction.dto.TransactionDetailResponse;
import com.mamadou.sutura.transaction.dto.TransactionResponse;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TransactionMapper {

    public TransactionResponse toResponse(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .reference(transaction.getReference())
                .type(transaction.getType())
                .status(transaction.getStatus())
                .sourceWalletId(walletId(transaction.getSourceWallet()))
                .destinationWalletId(walletId(transaction.getDestinationWallet()))
                .sourceName(ownerName(transaction.getSourceWallet()))
                .destinationName(ownerName(transaction.getDestinationWallet()))
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .description(transaction.getDescription())
                .sentinelRecommendation(transaction.getSentinelRecommendation())
                .failureReason(transaction.getFailureReason())
                .reversible(isReversible(transaction))
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .build();
    }

    public TransactionDetailResponse toDetailResponse(
            Transaction transaction,
            List<LedgerPostingResponse> ledgerPostings
    ) {
        return TransactionDetailResponse.builder()
                .id(transaction.getId())
                .reference(transaction.getReference())
                .type(transaction.getType())
                .status(transaction.getStatus())
                .sourceWalletId(walletId(transaction.getSourceWallet()))
                .destinationWalletId(walletId(transaction.getDestinationWallet()))
                .initiatedById(transaction.getInitiatedBy() == null ? null : transaction.getInitiatedBy().getId())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .description(transaction.getDescription())
                .ledgerTraceId(transaction.getLedgerTraceId())
                .failureReason(transaction.getFailureReason())
                .parentTransactionId(transaction.getParentTransaction() == null ? null : transaction.getParentTransaction().getId())
                .reversalTransactionId(transaction.getReversalTransaction() == null ? null : transaction.getReversalTransaction().getId())
                .reversedAt(transaction.getReversedAt())
                .reversible(isReversible(transaction))
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .ledgerPostings(ledgerPostings)
                .build();
    }

    private String ownerName(com.mamadou.sutura.wallet.entity.Wallet wallet) {
        if (wallet == null || wallet.getUser() == null) return null;
        var user = wallet.getUser();
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private Long walletId(com.mamadou.sutura.wallet.entity.Wallet wallet) {
        return wallet == null ? null : wallet.getId();
    }

    private boolean isReversible(Transaction transaction) {
        return transaction.getStatus() == TransactionStatus.COMPLETED
                && transaction.getReversalTransaction() == null
                && transaction.getReversedAt() == null;
    }
}
