package com.mamadou.sutura.transfer.service;

import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.*;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transaction.service.IdempotencyService;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;

/**
 * Record execution failures only after the transaction containing financial writes has rolled back.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransferFailureRecorder {
  private final PlatformTransactionManager transactionManager;
  private final TransactionRepository transactions;
  private final UserRepository users;
  private final WalletRepository wallets;
  private final IdempotencyService idempotency;

  private record Attempt(
      long userId,
      long source,
      long destination,
      BigDecimal amount,
      String currency,
      String reference,
      String description,
      String sentinelTransactionId,
      String recommendation) {}

  public void track(Transaction transaction, String key, String fingerprint) {
    if (!TransactionSynchronizationManager.isActualTransactionActive())
      throw new IllegalStateException("Transfer failure tracking requires a transaction");
    var attempt =
        new Attempt(
            transaction.getInitiatedBy().getId(),
            transaction.getSourceWallet().getId(),
            transaction.getDestinationWallet().getId(),
            transaction.getAmount(),
            transaction.getCurrency(),
            transaction.getReference(),
            transaction.getDescription(),
            transaction.getSentinelTransactionId(),
            transaction.getSentinelRecommendation());
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCompletion(int status) {
            if (status != STATUS_ROLLED_BACK) return;
            var independent = new TransactionTemplate(transactionManager);
            independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            try {
              independent.executeWithoutResult(
                  tx -> {
                    var owner = users.findForKycUpdate(attempt.userId()).orElseThrow();
                    // Serialize with retries and never replace a concurrently committed result.
                    if (idempotency.findExistingTransaction(key, fingerprint).isPresent()
                        || transactions.existsByReference(attempt.reference())) return;
                    var failed =
                        transactions.saveAndFlush(
                            Transaction.builder()
                                .reference(attempt.reference())
                                .type(TransactionType.TRANSFER)
                                .status(TransactionStatus.FAILED)
                                .initiatedBy(owner)
                                .sourceWallet(wallets.getReferenceById(attempt.source()))
                                .destinationWallet(wallets.getReferenceById(attempt.destination()))
                                .amount(attempt.amount())
                                .currency(attempt.currency())
                                .description(attempt.description())
                                .sentinelTransactionId(attempt.sentinelTransactionId())
                                .sentinelRecommendation(attempt.recommendation())
                                .failureReason(
                                    "Transfer execution rolled back; no funds moved. Create a new"
                                        + " request to try again.")
                                .build());
                    idempotency.saveKey(key, fingerprint, failed);
                  });
            } catch (RuntimeException failure) {
              log.error(
                  "Unable to persist rolled-back transfer outcome for reference={}; database"
                      + " recovery may be required",
                  attempt.reference(),
                  failure);
            }
          }
        });
  }
}
