package com.mamadou.sutura.agent.service;

import com.mamadou.sutura.common.security.SecurityRoleUtils;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.withdrawal.entity.Withdrawal;
import com.mamadou.sutura.withdrawal.repository.WithdrawalRepository;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Opaque, rotating capabilities. Raw QR and agent approval tokens are never persisted. */
@Service
@RequiredArgsConstructor
public class CashOutQrService {
    private final WithdrawalRepository withdrawals;
    private final SecureRandom random = new SecureRandom();
    public record Qr(String token, Instant expiresAt, String status) {}
    public record Grant(String token, Instant expiresAt) {}

    @Transactional
    public Qr issue(String reference, Long ownerId) {
        var withdrawal = locked(reference);
        if (!java.util.Objects.equals(withdrawal.getUser().getId(), ownerId)) throw new WalletOperationException("This cash-out belongs to another customer");
        if (!cashStatus(withdrawal)) return new Qr(null, null, withdrawal.getStatus().name());
        Instant now = Instant.now();
        if (withdrawal.getCashClaimExpiresAt() != null && withdrawal.getCashClaimExpiresAt().isAfter(now))
            return new Qr(null, withdrawal.getCashClaimExpiresAt(), "SCANNED");
        String token = token();
        withdrawal.setCashQrHash(hash(token));
        withdrawal.setCashQrExpiresAt(now.plusSeconds(30));
        return new Qr(token, withdrawal.getCashQrExpiresAt(), "AWAITING_AGENT");
    }

    @Transactional
    public Grant scan(String reference, String token, User agent) {
        requireAgent(agent);
        var withdrawal = locked(reference);
        Instant now = Instant.now();
        if (!cashStatus(withdrawal) || withdrawal.getCashQrExpiresAt() == null
                || !withdrawal.getCashQrExpiresAt().isAfter(now) || !matches(token, withdrawal.getCashQrHash()))
            throw new WalletOperationException("Cash-out QR expired or was already scanned. Scan the customer's current QR.");
        if (withdrawal.getCashClaimExpiresAt() != null && withdrawal.getCashClaimExpiresAt().isAfter(now))
            throw new WalletOperationException("Another cash-out review is already in progress");
        String approval = token();
        withdrawal.setCashQrHash(null); // Consume the scan capability under the same row lock.
        withdrawal.setCashQrExpiresAt(null);
        withdrawal.setCashClaimHash(hash(approval));
        withdrawal.setCashClaimAgentId(agent.getId());
        withdrawal.setCashClaimExpiresAt(now.plusSeconds(90));
        return new Grant(approval, withdrawal.getCashClaimExpiresAt());
    }

    public void requireClaim(Withdrawal withdrawal, User agent, String approval) {
        requireAgent(agent);
        boolean completed = withdrawal.getStatus() == Withdrawal.WithdrawalStatus.COMPLETED;
        if (!java.util.Objects.equals(agent.getId(), withdrawal.getCashClaimAgentId())
                || !matches(approval, withdrawal.getCashClaimHash())
                || (!completed && (withdrawal.getCashClaimExpiresAt() == null
                    || !withdrawal.getCashClaimExpiresAt().isAfter(Instant.now()))))
            throw new WalletOperationException("Scan the customer's current cash-out QR before completing this operation");
    }

    private boolean cashStatus(Withdrawal w) {
        return w.getWithdrawalMethod() == null && java.util.Set.of(
                Withdrawal.WithdrawalStatus.AWAITING_AGENT, Withdrawal.WithdrawalStatus.PENDING,
                Withdrawal.WithdrawalStatus.APPROVED).contains(w.getStatus());
    }
    private Withdrawal locked(String reference) {
        return withdrawals.findForCompletion(reference).orElseThrow(() -> new WalletOperationException("Cash-out not found"));
    }
    private void requireAgent(User user) {
        if (!SecurityRoleUtils.isAgent(user) && !SecurityRoleUtils.isAdmin(user))
            throw new WalletOperationException("Only an agent can scan cash-out QR codes");
    }
    private String token() {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    private static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static boolean matches(String value, String expected) {
        return value != null && value.matches("[A-Za-z0-9_-]{43}") && expected != null
                && MessageDigest.isEqual(hash(value).getBytes(StandardCharsets.US_ASCII), expected.getBytes(StandardCharsets.US_ASCII));
    }
}
