package com.mamadou.sutura.transfer.service;

import com.mamadou.sutura.auth.service.CurrentUserService;
import com.mamadou.sutura.common.metrics.SuturaMetricsService;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionType;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transaction.service.IdempotencyService;
import com.mamadou.sutura.transaction.service.TransactionService;
import com.mamadou.sutura.transfer.dto.TransferListItem;
import com.mamadou.sutura.transfer.dto.TransferRequest;
import com.mamadou.sutura.transfer.dto.TransferResponse;
import com.mamadou.sutura.transfer.dto.TransferValidationResult;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final TransferValidationService transferValidationService;
    private final TransferExecutionService transferExecutionService;
    private final IdempotencyService idempotencyService;
    private final TransactionService transactionService;
    private final SuturaMetricsService metricsService;
    private final TransactionRepository transactionRepository;
    private final CurrentUserService currentUserService;
    private final com.mamadou.sutura.user.repository.UserRepository userRepository;
    private final TransferComplianceService transferComplianceService;
    private final TransferFailureRecorder failureRecorder;

    @Transactional(readOnly = true)
    public List<TransferListItem> listForCurrentUser() {
        Long userId = currentUserService.getCurrentUserId();
        return transactionRepository
                .findByInitiatedByIdAndTypeOrderByCreatedAtDesc(userId, TransactionType.TRANSFER)
                .stream()
                .map(TransferListItem::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public TransferResponse transfer(TransferRequest request, String headerIdempotencyKey) {
        metricsService.recordTransferInitiationAttempt();
        Timer.Sample sample = metricsService.startTransferExecutionTimer();

        log.info("Transfer initiated from walletId={} to walletId={} amount={}",
            request.getSourceWalletId(), request.getDestinationWalletId(), request.getAmount());

        try {
            Long userId = currentUserService.getCurrentUserId();
            if (userId == null) throw new com.mamadou.sutura.transaction.exception.TransactionException("Sign in to transfer");
            userRepository.findForKycUpdate(userId).orElseThrow(() ->
                    new com.mamadou.sutura.transaction.exception.TransactionException("Account not found"));
            String rawKey = resolveIdempotencyKey(request.getIdempotencyKey(), headerIdempotencyKey);
            if (rawKey == null) rawKey = request.getReference();
            if (rawKey != null && rawKey.length() > 160) throw new IllegalArgumentException("Idempotency key is too long");
            String idempotencyKey = scopedKey(userId, rawKey);
            if (request.getRecipientPhone() != null) request.setRecipientPhone(
                    com.mamadou.sutura.transfer.validator.RecipientPhone.normalize(request.getRecipientPhone()));
            String fingerprint = fingerprint(request);

            TransferResponse response = idempotencyService.findExistingTransaction(idempotencyKey, fingerprint)
                    .map(existingTransaction -> {
                        log.info("Transfer idempotent replay detected, transactionId={}", existingTransaction.getId());
                        return TransferResponse.builder()
                                .transaction(transactionService.toResponse(existingTransaction))
                                .idempotentReplay(true)
                                .build();
                    })
                    .orElseGet(() -> {
                        TransferValidationResult validationResult = transferValidationService.validateForExecution(request);
                        Transaction transaction = transactionService.createPendingTransfer(
                                validationResult.getSourceWallet(), validationResult.getDestinationWallet(),
                                validationResult.getInitiatedBy(), request.getAmount(),
                                validationResult.getSourceWallet().getCurrency(), request.getDescription(), request.getReference());
                        if (transferComplianceService.assess(transaction)) {
                            failureRecorder.track(transaction, idempotencyKey, fingerprint);
                            transaction = transferExecutionService.executePending(transaction);
                        }
                        idempotencyService.saveKey(idempotencyKey, fingerprint, transaction);

                        log.info("Transfer processed, transactionId={}, status={}",
                            transaction.getId(), transaction.getStatus());
                        if (transaction.getStatus() == com.mamadou.sutura.transaction.enums.TransactionStatus.COMPLETED) {
                            metricsService.recordTransferInitiationSuccess();
                        } else if (transaction.getStatus() == com.mamadou.sutura.transaction.enums.TransactionStatus.FAILED) {
                            metricsService.recordTransferInitiationFailure();
                        }

                        return TransferResponse.builder()
                                .transaction(transactionService.toResponse(transaction))
                                .idempotentReplay(false)
                                .build();
                    });

            return response;
        } catch (Exception e) {
            log.error("Transfer failed with exception", e);
            metricsService.recordTransferInitiationFailure();
            throw e;
        } finally {
            metricsService.stopTransferExecutionTimer(sample);
        }
    }

    private String resolveIdempotencyKey(String requestKey, String headerKey) {
        if (headerKey != null && !headerKey.isBlank()) {
            return headerKey.trim();
        }
        if (requestKey != null && !requestKey.isBlank()) {
            return requestKey.trim();
        }
        return null;
    }

    private String fingerprint(TransferRequest request) {
        return request.getSourceWalletId() + "|"
                + request.getDestinationWalletId() + "|"
                + request.getAmount() + "|"
                + nullToBlank(request.getDescription()) + "|"
                + nullToBlank(request.getReference())
                + (request.getRecipientPhone() == null ? "" : "|phone:" + request.getRecipientPhone());
    }

    private String scopedKey(Long userId, String rawKey) {
        if (rawKey == null) return null;
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(rawKey.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return "transfer:" + userId + ":" + java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new com.mamadou.sutura.transaction.exception.TransactionException("Unable to scope idempotency key");
        }
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value.trim();
    }
}
