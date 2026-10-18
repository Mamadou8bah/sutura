package com.mamadou.sutura.risk.service;

import com.mamadou.sutura.risk.dto.RiskFlagResponse;
import com.mamadou.sutura.risk.entity.RiskFlag;
import com.mamadou.sutura.risk.enums.RiskLevel;
import com.mamadou.sutura.risk.enums.RiskRuleType;
import com.mamadou.sutura.risk.repository.RiskFlagRepository;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service to manage risk flags - creation, retrieval, and resolution.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RiskFlagService {

    private final RiskFlagRepository riskFlagRepository;
    private final com.mamadou.sutura.operations.OperationalAlerts alerts;
    private final WalletRepository walletRepository;

    @Transactional
    @CacheEvict(value = {"riskFlags", "riskSummary"}, allEntries = true)
    public RiskFlag createRiskFlag(Long walletId, Long transactionId, RiskLevel riskLevel,
                                   RiskRuleType triggeringRule, BigDecimal riskScore, String reason) {
        Wallet wallet = walletRepository.findById(walletId)
            .orElseThrow(() -> new RuntimeException("Wallet not found: " + walletId));

        RiskFlag flag = RiskFlag.builder()
            .wallet(wallet)
            .transactionId(transactionId)
            .riskLevel(riskLevel)
            .triggeringRule(triggeringRule)
            .riskScore(riskScore)
            .reason(reason)
            .resolved(false)
            .flaggedAt(LocalDateTime.now())
            .build();

        RiskFlag saved = riskFlagRepository.save(flag);
        if(riskLevel==RiskLevel.CRITICAL)alerts.enqueue("critical-risk:"+saved.getId(),"Critical risk flag","Critical risk flag #"+saved.getId()+" requires operator review. Wallet #"+walletId+", transaction #"+transactionId+". Inspect the risk desk before taking action.");
        log.info("Risk flag created: walletId={}, transactionId={}, riskLevel={}, score={}",
            walletId, transactionId, riskLevel, riskScore);
        return saved;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "riskFlags", key = "#walletId + ':unresolved'")
    public List<RiskFlagResponse> getUnresolvedFlagsForWallet(Long walletId) {
        return riskFlagRepository.findByWalletIdAndResolvedFalse(walletId).stream()
            .map(this::mapToResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public Page<RiskFlagResponse> getFlagsForWallet(Long walletId, Pageable pageable) {
        return riskFlagRepository.findByWalletId(walletId, pageable)
            .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<RiskFlagResponse> getFlagsByRiskLevel(Long walletId, RiskLevel riskLevel, Pageable pageable) {
        return riskFlagRepository.findByWalletIdAndRiskLevel(walletId, riskLevel, pageable)
            .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "riskFlags", key = "'tx:' + #transactionId")
    public RiskFlagResponse getFlagByTransactionId(Long transactionId) {
        return riskFlagRepository.findByTransactionId(transactionId)
            .map(this::mapToResponse)
            .orElse(null);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "riskFlags", key = "#walletId + ':recent:' + #hoursBack")
    public List<RiskFlagResponse> getRecentFlags(Long walletId, int hoursBack) {
        LocalDateTime startTime = LocalDateTime.now().minusHours(hoursBack);
        return riskFlagRepository.findByWalletIdAndFlaggedAtAfter(walletId, startTime).stream()
            .map(this::mapToResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public long countUnresolvedFlags(Long walletId) {
        return riskFlagRepository.countByWalletIdAndResolvedFalse(walletId);
    }

    @Transactional(readOnly = true)
    public long countUnresolvedFlagsByLevel(Long walletId, RiskLevel riskLevel) {
        return riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, riskLevel);
    }

    @Transactional
    @CacheEvict(value = {"riskFlags", "riskSummary"}, allEntries = true)
    public RiskFlagResponse resolveFlag(Long flagId, String resolutionAction) {
        RiskFlag flag = riskFlagRepository.findById(flagId)
            .orElseThrow(() -> new IllegalArgumentException("Risk flag not found: " + flagId));

        flag.setResolved(true);
        flag.setResolutionAction(resolutionAction);
        flag.setResolvedAt(LocalDateTime.now());

        RiskFlag updated = riskFlagRepository.save(flag);
        log.info("Risk flag resolved: flagId={}, action={}", flagId, resolutionAction);
        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "riskFlags", key = "#walletId + ':critical'")
    public boolean hasCriticalFlags(Long walletId) {
        return riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, RiskLevel.CRITICAL) > 0;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "riskFlags", key = "#walletId + ':highRisk'")
    public boolean hasHighRiskActivity(Long walletId) {
        long highFlags = riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, RiskLevel.HIGH);
        long criticalFlags = riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, RiskLevel.CRITICAL);
        return (highFlags + criticalFlags) >= 2;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "riskSummary", key = "#walletId")
    public Map<String, Long> getRiskSummary(Long walletId) {
        return Map.of(
            "total", riskFlagRepository.countByWalletIdAndResolvedFalse(walletId),
            "critical", riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, RiskLevel.CRITICAL),
            "high", riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, RiskLevel.HIGH),
            "medium", riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, RiskLevel.MEDIUM),
            "low", riskFlagRepository.countByWalletIdAndRiskLevelAndResolvedFalse(walletId, RiskLevel.LOW)
        );
    }

    /**
     * Map entity to response DTO
     */
    private RiskFlagResponse mapToResponse(RiskFlag flag) {
        return new RiskFlagResponse(
            flag.getId(),
            flag.getWallet() != null ? flag.getWallet().getId() : null,
            flag.getTransactionId(),
            flag.getRiskLevel(),
            flag.getTriggeringRule(),
            flag.getRiskScore(),
            flag.getReason(),
            flag.isResolved(),
            flag.getResolutionAction(),
            flag.getFlaggedAt(),
            flag.getResolvedAt()
        );
    }
}
