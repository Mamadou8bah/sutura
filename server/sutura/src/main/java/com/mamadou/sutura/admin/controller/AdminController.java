package com.mamadou.sutura.admin.controller;

import com.mamadou.sutura.admin.dto.AdminDashboardResponse;
import com.mamadou.sutura.admin.dto.AdminWalletResponse;
import com.mamadou.sutura.admin.dto.AuditLogEntryResponse;
import com.mamadou.sutura.admin.dto.FreezeWalletAdminRequest;
import com.mamadou.sutura.admin.dto.ReprocessWebhookAdminRequest;
import com.mamadou.sutura.admin.dto.ReverseTransactionAdminRequest;
import com.mamadou.sutura.admin.service.*;
import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.reconciliation.dto.ReconciliationReportResponse;
import com.mamadou.sutura.risk.enums.RiskLevel;
import com.mamadou.sutura.risk.repository.RiskFlagRepository;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.wallet.enums.WalletStatus;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminWalletService adminWalletService;
    private final AdminTransactionService adminTransactionService;
    private final AdminWebhookService adminWebhookService;
    private final AdminReconciliationService adminReconciliationService;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final RiskFlagRepository riskFlagRepository;
    private final AuditLogRepository auditLogRepository;

    // ==================== WALLET OPERATIONS ====================

    @GetMapping("/wallets")
    public ResponseEntity<List<AdminWalletResponse>> listWallets() {
        return ResponseEntity.ok(adminWalletService.listWallets());
    }

    @PostMapping("/wallets/freeze")
    public ResponseEntity<String> freezeWallet(
        @RequestBody FreezeWalletAdminRequest request,
        Authentication authentication
    ) {
        log.info("Admin freeze wallet request: {}", request.walletId());
        Long adminId = extractAdminId(authentication);
        String adminEmail = authentication.getName();

        adminWalletService.freezeWallet(request.walletId(), request.reason(), adminId, adminEmail);
        return ResponseEntity.ok("Wallet " + request.walletId() + " has been frozen");
    }

    @PostMapping("/wallets/{walletId}/unfreeze")
    public ResponseEntity<String> unfreezeWallet(
        @PathVariable Long walletId,
        Authentication authentication
    ) {
        log.info("Admin unfreeze wallet request: {}", walletId);
        Long adminId = extractAdminId(authentication);
        String adminEmail = authentication.getName();

        adminWalletService.unfreezeWallet(walletId, adminId, adminEmail);
        return ResponseEntity.ok("Wallet " + walletId + " has been unfrozen");
    }

    // ==================== TRANSACTION OPERATIONS ====================

    @PostMapping("/transactions/reverse")
    public ResponseEntity<String> reverseTransaction(
        @RequestBody ReverseTransactionAdminRequest request,
        Authentication authentication
    ) {
        log.info("Admin reverse transaction request: {}", request.transactionId());
        Long adminId = extractAdminId(authentication);
        String adminEmail = authentication.getName();

        adminTransactionService.reverseTransaction(
            request.transactionId(),
            request.reason(),
            request.refundToWallet(),
            adminId,
            adminEmail
        );
        return ResponseEntity.ok("Transaction " + request.transactionId() + " has been reversed");
    }

    // ==================== WEBHOOK OPERATIONS ====================

    @PostMapping("/webhooks/reprocess")
    public ResponseEntity<String> reprocessWebhook(
        @RequestBody ReprocessWebhookAdminRequest request,
        Authentication authentication
    ) {
        log.info("Admin reprocess webhook request: {}", request.webhookId());
        Long adminId = extractAdminId(authentication);
        String adminEmail = authentication.getName();

        adminWebhookService.reprocessWebhook(request.webhookId(), request.reason(), adminId, adminEmail);
        return ResponseEntity.ok("Webhook " + request.webhookId() + " marked for reprocessing");
    }

    // ==================== RECONCILIATION OPERATIONS ====================

    @PostMapping("/reconciliation/wallet-ledger")
    public ResponseEntity<ReconciliationReportResponse> triggerWalletReconciliation(
        Authentication authentication
    ) {
        log.info("Admin triggering wallet reconciliation");
        Long adminId = extractAdminId(authentication);
        String adminEmail = authentication.getName();

        ReconciliationReportResponse report = adminReconciliationService.triggerWalletReconciliation(adminId, adminEmail);
        return ResponseEntity.ok(report);
    }

    @PostMapping("/reconciliation/webhook-deposit")
    public ResponseEntity<ReconciliationReportResponse> triggerWebhookReconciliation(
        Authentication authentication
    ) {
        log.info("Admin triggering webhook reconciliation");
        Long adminId = extractAdminId(authentication);
        String adminEmail = authentication.getName();

        ReconciliationReportResponse report = adminReconciliationService.triggerWebhookReconciliation(adminId, adminEmail);
        return ResponseEntity.ok(report);
    }

    // ==================== DASHBOARD & METRICS ====================

    @GetMapping("/dashboard")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        log.info("Fetching admin dashboard");

        long totalWallets = walletRepository.count();
        long activeWallets = walletRepository.countByStatus(WalletStatus.ACTIVE);
        long frozenWallets = adminWalletService.getFrozenWalletCount();

        long totalTransactions = transactionRepository.count();
        long failedTransactions = adminTransactionService.getFailedTransactionCount();
        long pendingTransactions = adminTransactionService.getPendingTransactionCount();

        long totalRiskFlags = riskFlagRepository.count();
        long criticalRiskFlags = riskFlagRepository.countByRiskLevelAndResolvedFalse(RiskLevel.CRITICAL);

        long unresolvedMismatches = adminReconciliationService.getUnresolvedMismatchesCount();
        long failedOperations = auditLogRepository.countBySuccessFalse();

        // Operation counts for last 24 hours
        Map<String, Long> operationCounts = new HashMap<>();
        LocalDateTime last24h = LocalDateTime.now().minusHours(24);
        operationCounts.put("freezes", auditLogRepository.countRecentByActionType("FREEZE_WALLET", last24h));
        operationCounts.put("reversals", auditLogRepository.countRecentByActionType("REVERSE_TRANSACTION", last24h));
        operationCounts.put("reprocesses", auditLogRepository.countRecentByActionType("REPROCESS_WEBHOOK", last24h));

        // System health
        Map<String, Object> systemHealth = new HashMap<>();
        systemHealth.put("database", "Responding");
        systemHealth.put("externalServices", "Not checked by this overview");
        systemHealth.put("lastCheck", LocalDateTime.now());

        AdminDashboardResponse dashboard = new AdminDashboardResponse(
            totalWallets,
            activeWallets,
            frozenWallets,
            totalTransactions,
            failedTransactions,
            pendingTransactions,
            totalRiskFlags,
            criticalRiskFlags,
            unresolvedMismatches,
            failedOperations,
            operationCounts,
            systemHealth
        );

        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/audit-trail")
    public ResponseEntity<com.mamadou.sutura.admin.dto.AdminPageResponse<AuditLogEntryResponse>> getAuditTrail(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Page<AuditLog> logs = auditLogRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"))
        );
        return ResponseEntity.ok(com.mamadou.sutura.admin.dto.AdminPageResponse.from(logs.map(this::toAuditEntry)));
    }

    private AuditLogEntryResponse toAuditEntry(AuditLog log) {
        return new AuditLogEntryResponse(
                log.getId(),
                log.getActorId(),
                log.getActorEmail(),
                log.getTimestamp(),
                log.getActionType(),
                log.getEntityType(),
                log.getEntityId(),
                log.getChangeDescription(),
                log.isSuccess()
        );
    }

    private Long extractAdminId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user.getId();
        }
        return null;
    }
}
