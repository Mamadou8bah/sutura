package com.mamadou.sutura.deposit.service;

import com.mamadou.sutura.common.security.SecurityRoleUtils;
import com.mamadou.sutura.deposit.dto.CreateDepositRequest;
import com.mamadou.sutura.deposit.dto.DepositResponse;
import com.mamadou.sutura.deposit.entity.Deposit;
import com.mamadou.sutura.deposit.repository.DepositRepository;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.enums.TransactionType;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import com.mamadou.sutura.wallet.service.WalletService;
import com.mamadou.sutura.webhook.client.CreateChargeRequest;
import com.mamadou.sutura.webhook.client.CreateChargeResponse;
import com.mamadou.sutura.webhook.client.ModemPayClient;
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
public class DepositService {

    private final DepositRepository depositRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final ModemPayClient modemPayClient;
    private final com.mamadou.sutura.idempotency.service.IdempotencyService idempotencyService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
    private final WalletService walletService;
    private final com.mamadou.sutura.idempotency.service.PaymentRequestIdentity requestIdentity;

    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public Deposit createDeposit(CreateDepositRequest request, Long actorId, boolean isAgent) {
        var template = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        // Commit the deposit intent before a provider can act on it.
        Deposit pending = template.execute(status -> createPending(request, actorId, isAgent));
        if (pending.getPaymentMethod() == null) return pending;
        return template.execute(status -> {
            var stored = depositRepository.findForCompletion(pending.getReference()).orElseThrow();
            if (stored.getStatus() == Deposit.DepositStatus.PENDING
                    && stored.getPaymentUrl() == null)
                initializeModemPayCharge(request, stored);
            return stored;
        });
    }

    private Deposit createPending(CreateDepositRequest request, Long actorId, boolean isAgent) {
        User actor = userRepository.findForKycUpdate(actorId).orElseThrow(() -> new IllegalArgumentException("Actor not found"));
        User targetUser = resolveTargetUser(actor, isAgent, request.getUserId());
        Wallet wallet = resolveWallet(targetUser, request.getWalletId(), request.getCurrency());

        String currency = request.getCurrency() == null || request.getCurrency().isBlank()
                ? wallet.getCurrency() : request.getCurrency().trim().toUpperCase(java.util.Locale.ROOT);
        if (!wallet.getCurrency().equalsIgnoreCase(currency)) throw new WalletOperationException("Currency does not match wallet");
        if (request.getAmount() == null || request.getAmount().signum() <= 0) throw new WalletOperationException("Amount must be positive");
        if (request.getAmount().stripTrailingZeros().scale() > 4 || request.getAmount().compareTo(new java.math.BigDecimal("1000000000000")) > 0)
            throw new IllegalArgumentException("Amount exceeds supported precision or maximum");
        String key = requestIdentity.key("deposit", actorId, request.getIdempotencyKey());
        String fingerprint = requestIdentity.fingerprint(actorId, targetUser.getId(), wallet.getId(), isAgent,
                request.getAmount().stripTrailingZeros().toPlainString(), currency, request.getPaymentMethod(),
                request.getPhoneNumber(), request.getDescription());
        if (key != null) {
            var existing = depositRepository.findByIdempotencyKey(key);
            if (existing.isPresent()) {
                if (!fingerprint.equals(existing.get().getRequestHash())) throw new WalletOperationException("Idempotency key reused with different request");
                return existing.get();
            }
        }

        boolean internalMerchantFlow = isInternalMerchantFlow(actor, request);
        if (!internalMerchantFlow) modemPayClient.requireEnabled();

        String reference = generateReference();


        Deposit deposit = Deposit.builder()
                .wallet(wallet)
                .user(targetUser)
                .agent(isAgent ? actor : null)
                .depositType(isAgent ? Deposit.DepositType.AGENT : Deposit.DepositType.SELF)
                .status(internalMerchantFlow ? Deposit.DepositStatus.AWAITING_AGENT : Deposit.DepositStatus.PENDING)
                .amount(request.getAmount())
                .currency(currency)
                .paymentMethod(internalMerchantFlow ? null : request.getPaymentMethod().toLowerCase(java.util.Locale.ROOT))
                .phoneNumber(request.getPhoneNumber())
                .description(request.getDescription())
                .reference(reference)
                .idempotencyKey(key)
                .requestHash(fingerprint)
                .build();

        deposit = depositRepository.save(deposit);

        Transaction transaction = Transaction.builder()
                .reference(deposit.getReference())
                .type(TransactionType.WALLET_CREDIT)
                .status(TransactionStatus.PENDING)
                .destinationWallet(wallet)
                .initiatedBy(actor)
                .amount(deposit.getAmount())
                .currency(deposit.getCurrency())
                .description("Deposit created: " + deposit.getReference())
                .build();
        transactionRepository.save(transaction);


        log.info("Deposit created: {} for user {} internal={}", deposit.getReference(), targetUser.getId(), internalMerchantFlow);
        return deposit;
    }

    @Transactional(readOnly = true)
    public List<DepositResponse> listForUser(Long userId) {
        return depositRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(DepositResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DepositResponse getById(Long id, Long userId) {
        Deposit deposit = depositRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Deposit not found"));
        if (deposit.getUser().getId() != userId) {
            throw new IllegalArgumentException("Deposit not found");
        }
        return DepositResponse.from(deposit);
    }

    @Transactional(readOnly = true)
    public DepositResponse getByReference(String reference) {
        Deposit deposit = depositRepository.findByReferenceIgnoreCase(reference)
                .orElseThrow(() -> new IllegalArgumentException("Deposit not found"));
        return DepositResponse.from(deposit);
    }

    private boolean isInternalMerchantFlow(User actor, CreateDepositRequest request) {
        if (SecurityRoleUtils.isMerchant(actor)) {
            return true;
        }
        return request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()
                || "agent".equalsIgnoreCase(request.getPaymentMethod());
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

    private void initializeModemPayCharge(CreateDepositRequest request, Deposit deposit) {
        try {
            CreateChargeRequest chargeReq = new CreateChargeRequest();
            chargeReq.setAmount(deposit.getAmount());
            chargeReq.setCurrency(deposit.getCurrency());
            chargeReq.setPhoneNumber(deposit.getPhoneNumber());
            chargeReq.setPaymentMethod(deposit.getPaymentMethod());
            chargeReq.setDescription(deposit.getDescription());
            chargeReq.setReference(deposit.getReference());

            String idempotency = deposit.getIdempotencyKey();
            if (idempotency == null || idempotency.isBlank()) {
                idempotency = "dep-" + deposit.getReference();
            }
            chargeReq.setIdempotencyKey(idempotency);

            var recordOpt = idempotencyService.findByKey(idempotency);
            if (recordOpt.isPresent() && "COMPLETED".equals(recordOpt.get().getStatus()) && recordOpt.get().getResponsePayload() != null) {
                CreateChargeResponse cached = objectMapper.readValue(recordOpt.get().getResponsePayload(), CreateChargeResponse.class);
                deposit.setExternalPaymentId(cached.getId());
                deposit.setPaymentUrl(cached.getPaymentUrl());
                deposit.setIdempotencyKey(idempotency);
                depositRepository.save(deposit);
            } else {
                idempotencyService.createProcessing(idempotency, buildRequestHash(chargeReq));
                CreateChargeResponse chargeResp = modemPayClient.createCharge(chargeReq);
                if (chargeResp != null) {
                    idempotencyService.complete(idempotency, chargeResp);
                    deposit.setExternalPaymentId(chargeResp.getId());
                    deposit.setPaymentUrl(chargeResp.getPaymentUrl());
                    deposit.setIdempotencyKey(idempotency);
                    depositRepository.save(deposit);
                }
            }
        } catch (Exception ex) {
            log.warn("ModemPay charge creation failed for deposit {}: {}", deposit.getReference(), ex.getMessage());
        }
    }

    private String generateReference() {
        return "dep-" + UUID.randomUUID().toString().replaceAll("-", "").substring(0, 12);
    }

    private String buildRequestHash(CreateChargeRequest req) {
        String s = req.getReference() + "|" + req.getAmount() + "|" + req.getCurrency() + "|" + req.getPhoneNumber();
        return Integer.toHexString(s.hashCode());
    }
}
