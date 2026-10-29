package com.mamadou.sutura.withdrawal.service;

import com.mamadou.sutura.common.security.SecurityRoleUtils;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.enums.TransactionType;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.wallet.service.WalletService;
import com.mamadou.sutura.webhook.client.CreatePayoutRequest;
import com.mamadou.sutura.webhook.client.CreatePayoutResponse;
import com.mamadou.sutura.webhook.client.ModemPayClient;
import com.mamadou.sutura.withdrawal.dto.CreateWithdrawalRequest;
import com.mamadou.sutura.withdrawal.dto.WithdrawalResponse;
import com.mamadou.sutura.withdrawal.entity.Withdrawal;
import com.mamadou.sutura.withdrawal.repository.WithdrawalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WithdrawalService {

    private final com.mamadou.sutura.operations.OperationalAlerts alerts;
    private final WithdrawalRepository withdrawalRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final ModemPayClient modemPayClient;
    private final com.mamadou.sutura.idempotency.service.IdempotencyService idempotencyService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
    private final WalletService walletService;
    private final com.mamadou.sutura.fraud.service.PaymentComplianceService compliance;
    private final com.mamadou.sutura.idempotency.service.PaymentRequestIdentity requestIdentity;
    private final WithdrawalReservationService reservations;

    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public Withdrawal createWithdrawal(CreateWithdrawalRequest request, Long actorId, boolean isAgent) {
        var template = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        // Persist the request (and payout hold) before a provider can act on it.
        Withdrawal pending = template.execute(status -> createPending(request, actorId, isAgent));
        if (pending.getWithdrawalMethod() == null) return pending;
        return template.execute(status -> {
            var stored = withdrawalRepository.findForCompletion(pending.getReference()).orElseThrow();
            if (stored.getStatus() == Withdrawal.WithdrawalStatus.PROCESSING
                    && stored.getExternalPaymentId() == null)
                initializeModemPayPayout(stored);
            return stored;
        });
    }

    private Withdrawal createPending(CreateWithdrawalRequest request, Long actorId, boolean isAgent) {
        User actor = userRepository.findForKycUpdate(actorId).orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User targetUser = resolveTargetUser(actor, isAgent, request.getUserId());
        Wallet wallet = resolveWallet(targetUser, request.getWalletId(), request.getCurrency());

        String currency = request.getCurrency() == null || request.getCurrency().isBlank()
                ? wallet.getCurrency() : request.getCurrency().trim().toUpperCase(java.util.Locale.ROOT);
        if (!wallet.getCurrency().equalsIgnoreCase(currency)) throw new com.mamadou.sutura.wallet.exception.WalletOperationException("Currency does not match wallet");
        if (request.getAmount() == null || request.getAmount().signum() <= 0) throw new com.mamadou.sutura.wallet.exception.WalletOperationException("Amount must be positive");
        if (request.getAmount().stripTrailingZeros().scale() > 4 || request.getAmount().compareTo(new java.math.BigDecimal("1000000000000")) > 0)
            throw new IllegalArgumentException("Amount exceeds supported precision or maximum");
        String key = requestIdentity.key("withdrawal", actorId, request.getIdempotencyKey());
        String fingerprint = requestIdentity.fingerprint(actorId, targetUser.getId(), wallet.getId(), isAgent,
                request.getAmount().stripTrailingZeros().toPlainString(), currency, request.getWithdrawalMethod(),
                request.getPhoneNumber(), request.getBankAccount(), request.getDescription());
        if (key != null) {
            var existing = withdrawalRepository.findByIdempotencyKey(key);
            if (existing.isPresent()) {
                if (!fingerprint.equals(existing.get().getRequestHash())) throw new com.mamadou.sutura.wallet.exception.WalletOperationException("Idempotency key reused with different request");
                return existing.get();
            }
        }

        boolean internalMerchantFlow = isInternalMerchantFlow(actor, request);
        if (!internalMerchantFlow) modemPayClient.requireEnabled();

        if (!internalMerchantFlow && (!java.util.Set.of("wave", "afrimoney").contains(request.getWithdrawalMethod())
                || request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()))
            throw new IllegalArgumentException("Select Wave or Afrimoney and provide the recipient phone number");
        String reference = generateReference();


        Withdrawal withdrawal = Withdrawal.builder()
                .wallet(wallet)
                .user(targetUser)
                .agent(isAgent ? actor : null)
                .withdrawalType(isAgent ? Withdrawal.WithdrawalType.AGENT : Withdrawal.WithdrawalType.SELF)
                .status(internalMerchantFlow ? Withdrawal.WithdrawalStatus.AWAITING_AGENT : Withdrawal.WithdrawalStatus.PENDING)
                .amount(request.getAmount())
                .currency(currency)
                .withdrawalMethod(internalMerchantFlow ? null : request.getWithdrawalMethod())
                .phoneNumber(request.getPhoneNumber())
                .bankAccount(request.getBankAccount())
                .description(request.getDescription())
                .reference(reference)
                .idempotencyKey(key)
                .requestHash(fingerprint)
                .build();

        withdrawal = withdrawalRepository.save(withdrawal);

        Transaction transaction = Transaction.builder()
                .reference(withdrawal.getReference())
                .type(TransactionType.WALLET_DEBIT)
                .status(TransactionStatus.PENDING)
                .sourceWallet(wallet)
                .initiatedBy(actor)
                .amount(withdrawal.getAmount())
                .currency(withdrawal.getCurrency())
                .description("Withdrawal created: " + withdrawal.getReference())
                .build();
        transactionRepository.save(transaction);

        if (!internalMerchantFlow) {
            if (compliance.assess(transaction, targetUser, wallet, "WITHDRAWAL")) {
                reservations.reserve(withdrawal);
            } else {
                withdrawal.setStatus(transaction.getStatus() == TransactionStatus.FAILED
                        ? Withdrawal.WithdrawalStatus.FAILED : Withdrawal.WithdrawalStatus.PENDING_REVIEW);
                withdrawal.setRejectionReason(transaction.getFailureReason());
                withdrawalRepository.save(withdrawal);
            }
        }

        log.info("Withdrawal created: {} for user {} internal={}", withdrawal.getReference(), targetUser.getId(), internalMerchantFlow);
        return withdrawal;
    }

    /** Commit an approved reservation before any upstream request; safe for scheduled recovery. */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public void resumeApproved(String reference) {
        var template = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        template.executeWithoutResult(status -> {
            var stored = withdrawalRepository.findForCompletion(reference).orElseThrow();
            if (stored.getWithdrawalMethod() == null || stored.getStatus() != Withdrawal.WithdrawalStatus.APPROVED) return;
            modemPayClient.requireEnabled();
            var product = transactionRepository.findForUpdateByReference(reference).orElseThrow();
            if (compliance.assess(product, stored.getUser(), stored.getWallet(), "WITHDRAWAL")) reservations.reserve(stored);
            else {
                stored.setStatus(Withdrawal.WithdrawalStatus.FAILED);
                stored.setRejectionReason(product.getFailureReason());
                withdrawalRepository.save(stored);
            }
        });
        template.executeWithoutResult(status -> {
            var stored = withdrawalRepository.findForCompletion(reference).orElseThrow();
            if (stored.getWithdrawalMethod() != null && stored.getStatus() == Withdrawal.WithdrawalStatus.PROCESSING
                    && stored.getExternalPaymentId() == null) initializeModemPayPayout(stored);
        });
    }

    @Transactional(readOnly = true)
    public List<WithdrawalResponse> listForUser(Long userId) {
        return withdrawalRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(WithdrawalResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WithdrawalResponse getById(Long id, Long userId) {
        Withdrawal withdrawal = withdrawalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Withdrawal not found"));
        if (withdrawal.getUser().getId() != userId) {
            throw new IllegalArgumentException("Withdrawal not found");
        }
        return WithdrawalResponse.from(withdrawal);
    }

    @Transactional(readOnly = true)
    public WithdrawalResponse getByReference(String reference) {
        Withdrawal withdrawal = withdrawalRepository.findByReferenceIgnoreCase(reference)
                .orElseThrow(() -> new IllegalArgumentException("Withdrawal not found"));
        return WithdrawalResponse.from(withdrawal);
    }

    private boolean isInternalMerchantFlow(User actor, CreateWithdrawalRequest request) {
        if (SecurityRoleUtils.isMerchant(actor)) {
            return true;
        }
        return request.getWithdrawalMethod() == null || request.getWithdrawalMethod().isBlank()
                || "agent".equalsIgnoreCase(request.getWithdrawalMethod());
    }

    private User resolveTargetUser(User actor, boolean isAgent, Long userId) {
        if (isAgent && userId != null) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Target user not found"));
        }
        return actor;
    }

    private Wallet resolveWallet(User targetUser, Long walletId, String currency) {
        if (walletId != null) {
            return walletService.getWalletForUser(walletId, targetUser.getId());
        }
        return walletService.resolvePrimaryWallet(targetUser.getId(), currency);
    }

    private void initializeModemPayPayout(Withdrawal withdrawal) {
        try {
            CreatePayoutRequest payoutReq = new CreatePayoutRequest();
            payoutReq.setBeneficiaryName(withdrawal.getUser().getFirstName() + " " + withdrawal.getUser().getLastName());
            payoutReq.setAmount(withdrawal.getAmount());
            payoutReq.setCurrency(withdrawal.getCurrency());
            payoutReq.setPhoneNumber(withdrawal.getPhoneNumber());
            payoutReq.setBankAccount(withdrawal.getBankAccount());
            payoutReq.setWithdrawalMethod(withdrawal.getWithdrawalMethod());
            payoutReq.setDescription(withdrawal.getDescription());
            String idemp = withdrawal.getIdempotencyKey();
            if (idemp == null || idemp.isBlank()) {
                idemp = "wd-" + withdrawal.getReference();
            }
            payoutReq.setIdempotencyKey(idemp);
            payoutReq.setReference(withdrawal.getReference());

            var recordOpt = idempotencyService.findByKey(idemp);
            if (recordOpt.isPresent() && "COMPLETED".equals(recordOpt.get().getStatus()) && recordOpt.get().getResponsePayload() != null) {
                CreatePayoutResponse cached = objectMapper.readValue(recordOpt.get().getResponsePayload(), CreatePayoutResponse.class);
                withdrawal.setExternalPaymentId(cached.getId());
                withdrawal.setStatus(Withdrawal.WithdrawalStatus.PROCESSING);
                withdrawalRepository.save(withdrawal);
            } else {
                idempotencyService.createProcessing(idemp, buildPayoutHash(payoutReq));
                CreatePayoutResponse payoutResp = modemPayClient.createPayout(payoutReq);
                if (payoutResp != null) {
                    idempotencyService.complete(idemp, payoutResp);
                    withdrawal.setExternalPaymentId(payoutResp.getId());
                    withdrawal.setStatus(Withdrawal.WithdrawalStatus.PROCESSING);
                    withdrawalRepository.save(withdrawal);
                }
            }
        } catch (Exception ex) {
            log.warn("ModemPay payout creation failed for withdrawal {}; outcome retained for reconciliation", withdrawal.getReference());
            alerts.enqueue("payout-unknown:"+withdrawal.getId(),"Payout requires reconciliation","Payout "+withdrawal.getReference()+" has an unknown provider outcome. Its reservation is retained. Verify the provider status before any refund or redispatch.");
            withdrawal.setRejectionReason("Provider outcome unknown; reservation retained for reconciliation");
            withdrawalRepository.save(withdrawal);
        }
    }

    private String generateReference() {
        return "wd-" + UUID.randomUUID().toString().replaceAll("-", "").substring(0, 12);
    }

    private String buildPayoutHash(CreatePayoutRequest req) {
        String s = req.getReference() + "|" + req.getAmount() + "|" + req.getCurrency() + "|" + req.getBankAccount() + "|" + req.getPhoneNumber();
        return Integer.toHexString(s.hashCode());
    }
}
