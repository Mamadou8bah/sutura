package com.mamadou.sutura.webhook.service;

import com.mamadou.sutura.deposit.entity.Deposit;
import com.mamadou.sutura.deposit.repository.DepositRepository;
import com.mamadou.sutura.fraud.service.PaymentComplianceService;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.wallet.service.LedgerWalletMovementService;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProviderDepositSettlementService {
    private final DepositRepository deposits;
    private final TransactionRepository transactions;
    private final LedgerWalletMovementService movements;
    private final PaymentComplianceService compliance;

    @Transactional
    public void complete(String reference, Long walletId, BigDecimal amount, String currency, String providerId) {
        var deposit = matched(reference, walletId, amount, currency, providerId);
        if (deposit.getStatus() == Deposit.DepositStatus.COMPLETED) return;
        if (deposit.getStatus() != Deposit.DepositStatus.PENDING && deposit.getStatus() != Deposit.DepositStatus.PENDING_REVIEW && deposit.getStatus() != Deposit.DepositStatus.APPROVED)
            throw new WalletOperationException("Deposit is not pending; reconcile provider outcome");
        deposit.setExternalPaymentId(providerId);
        var product = transactions.findForUpdateByReference(reference).orElseThrow();
        if (!compliance.assess(product, deposit.getUser(), deposit.getWallet(), "DEPOSIT")) {
            deposit.setStatus(product.getStatus() == TransactionStatus.FAILED
                    ? Deposit.DepositStatus.FAILED : product.getSentinelRecommendation() == null
                        ? Deposit.DepositStatus.PENDING : Deposit.DepositStatus.PENDING_REVIEW);
            deposit.setFailureReason(product.getFailureReason());
            deposits.save(deposit);
            return;
        }
        movements.creditWalletFrom(deposit.getWallet(), deposit.getUser(), amount, deposit.getReference(),
                "ModemPay deposit", "MODEMPAY:CLEARING:");
        deposit.setStatus(Deposit.DepositStatus.COMPLETED);
        deposit.setExternalPaymentId(providerId);
        deposit.setCompletedAt(LocalDateTime.now());
        deposits.save(deposit);
    }

    @Transactional
    public void updateStatus(String reference, BigDecimal amount, String currency, String providerId,
            Deposit.DepositStatus status, String reason) {
        var deposit = matched(reference, null, amount, currency, providerId);
        // Terminal results cannot be reversed by late pending/failure notifications.
        if (deposit.getStatus() != Deposit.DepositStatus.PENDING) return;
        if (status == Deposit.DepositStatus.PENDING) return;
        var tx = transactions.findForUpdateByReference(deposit.getReference()).orElseThrow();
        if (tx.getStatus() != TransactionStatus.PENDING) throw new WalletOperationException("Deposit product is not pending");
        tx.setStatus(status == Deposit.DepositStatus.CANCELLED ? TransactionStatus.CANCELLED : TransactionStatus.FAILED);
        tx.setExternalTransactionId(providerId);
        transactions.save(tx);
        deposit.setStatus(status);
        deposit.setFailureReason(reason);
        deposit.setExternalPaymentId(providerId);
        deposits.save(deposit);
    }

    private Deposit matched(String reference, Long walletId, BigDecimal amount, String currency, String providerId) {
        if (reference == null || reference.isBlank()) throw new WalletOperationException("Deposit reference is required");
        var d = deposits.findForCompletion(reference).orElseThrow(() -> new WalletOperationException("Unknown deposit reference"));
        if (d.getPaymentMethod() == null || d.getPaymentMethod().isBlank()
                || amount == null || amount.compareTo(d.getAmount()) != 0
                || currency == null || !currency.equalsIgnoreCase(d.getCurrency())
                || (walletId != null && !walletId.equals(d.getWallet().getId()))
                || providerId == null || providerId.isBlank()
                || (d.getExternalPaymentId() != null && !providerId.equals(d.getExternalPaymentId())))
            throw new WalletOperationException("Provider deposit does not match the stored request");
        return d;
    }
}
