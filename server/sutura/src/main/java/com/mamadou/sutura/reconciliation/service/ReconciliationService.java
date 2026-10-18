package com.mamadou.sutura.reconciliation.service;

import com.mamadou.sutura.reconciliation.dto.ManualReconciliationRequest;
import com.mamadou.sutura.reconciliation.dto.ReconciliationReportResponse;
import com.mamadou.sutura.reconciliation.entity.ReconciliationReport;
import com.mamadou.sutura.reconciliation.enums.ReconciliationStatus;
import com.mamadou.sutura.reconciliation.enums.ReconciliationType;
import com.mamadou.sutura.reconciliation.repository.ReconciliationReportRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReconciliationService {

  private final ReconciliationReportRepository reportRepository;
  private final com.mamadou.sutura.operations.OperationalAlerts alerts;
  private final WalletReconciliationService walletReconciliationService;
  private final WebhookReconciliationService webhookReconciliationService;

  @Transactional
  @CacheEvict(
      value = {"reconciliationReports", "reconciliationMismatches"},
      allEntries = true)
  public ReconciliationReportResponse runWalletLedgerReconciliation() {
    log.info("Starting wallet-ledger reconciliation");
    ReconciliationReport report = createReport(ReconciliationType.WALLET_LEDGER, true, "SYSTEM");

    try {
      report.setStatus(ReconciliationStatus.IN_PROGRESS);
      reportRepository.save(report);

      walletReconciliationService.reconcileWalletVsLedger(report);

      report.setStatus(
          report.getMismatchesFound() > 0
              ? ReconciliationStatus.COMPLETED_WITH_MISMATCHES
              : ReconciliationStatus.COMPLETED);
      report.setCompletedAt(LocalDateTime.now());

    } catch (Exception e) {
      log.error("Wallet-ledger reconciliation failed", e);
      report.setStatus(ReconciliationStatus.FAILED);
      report.setErrorDetails(e.getMessage());
      report.setCompletedAt(LocalDateTime.now());
    }

    report = reportRepository.save(report);
    if (report.getStatus() == ReconciliationStatus.FAILED || report.getMismatchesFound() > 0)
      alerts.enqueue(
          "reconciliation:" + report.getId(),
          "Reconciliation requires attention",
          "Report #"
              + report.getId()
              + " completed with status "
              + report.getStatus()
              + " and "
              + report.getMismatchesFound()
              + " mismatches. Inspect the report before resolving or changing any financial"
              + " records.");
    return mapToResponse(report);
  }

  @Transactional
  @CacheEvict(
      value = {"reconciliationReports", "reconciliationMismatches"},
      allEntries = true)
  public ReconciliationReportResponse runWebhookDepositReconciliation() {
    log.info("Starting webhook-deposit reconciliation");
    ReconciliationReport report = createReport(ReconciliationType.WEBHOOK_DEPOSIT, true, "SYSTEM");

    try {
      report.setStatus(ReconciliationStatus.IN_PROGRESS);
      reportRepository.save(report);

      webhookReconciliationService.reconcileWebhookVsDeposit(report);

      report.setStatus(
          report.getMismatchesFound() > 0
              ? ReconciliationStatus.COMPLETED_WITH_MISMATCHES
              : ReconciliationStatus.COMPLETED);
      report.setCompletedAt(LocalDateTime.now());

    } catch (Exception e) {
      log.error("Webhook-deposit reconciliation failed", e);
      report.setStatus(ReconciliationStatus.FAILED);
      report.setErrorDetails(e.getMessage());
      report.setCompletedAt(LocalDateTime.now());
    }

    report = reportRepository.save(report);
    if (report.getStatus() == ReconciliationStatus.FAILED || report.getMismatchesFound() > 0)
      alerts.enqueue(
          "reconciliation:" + report.getId(),
          "Reconciliation requires attention",
          "Report #"
              + report.getId()
              + " completed with status "
              + report.getStatus()
              + " and "
              + report.getMismatchesFound()
              + " mismatches. Inspect the report before resolving or changing any financial"
              + " records.");
    return mapToResponse(report);
  }

  @Transactional
  @CacheEvict(
      value = {"reconciliationReports", "reconciliationMismatches"},
      allEntries = true)
  public ReconciliationReportResponse runManualReconciliation(ManualReconciliationRequest request) {
    if (request == null
        || request.reconciliationType() == null
        || (request.reconciliationType() != ReconciliationType.WALLET_LEDGER
            && request.reconciliationType() != ReconciliationType.WEBHOOK_DEPOSIT))
      throw new IllegalArgumentException("Choose WALLET_LEDGER or WEBHOOK_DEPOSIT reconciliation");
    if (request.reason() == null || request.reason().isBlank() || request.reason().length() > 1000)
      throw new IllegalArgumentException(
          "A reconciliation reason is required (up to 1000 characters)");
    if (request.walletId() != null)
      throw new IllegalArgumentException(
          "Reconciliation checks all wallets; walletId filtering is not supported");
    log.info("Starting manual reconciliation: {}", request.reconciliationType());
    ReconciliationReport report =
        ReconciliationReport.builder()
            .reconciliationType(request.reconciliationType())
            .status(ReconciliationStatus.PENDING)
            .startedAt(LocalDateTime.now())
            .totalRecordsChecked(0)
            .mismatchesFound(0)
            .mismatchesResolved(0)
            .summary(request.reason())
            .triggeredBy("MANUAL")
            .automated(false)
            .build();

    try {
      report.setStatus(ReconciliationStatus.IN_PROGRESS);
      report = reportRepository.save(report);

      if (request.reconciliationType() == ReconciliationType.WALLET_LEDGER) {
        walletReconciliationService.reconcileWalletVsLedger(report);
      } else if (request.reconciliationType() == ReconciliationType.WEBHOOK_DEPOSIT) {
        webhookReconciliationService.reconcileWebhookVsDeposit(report);
      }

      report.setStatus(
          report.getMismatchesFound() > 0
              ? ReconciliationStatus.COMPLETED_WITH_MISMATCHES
              : ReconciliationStatus.COMPLETED);
      report.setCompletedAt(LocalDateTime.now());

    } catch (Exception e) {
      log.error("Manual reconciliation failed", e);
      report.setStatus(ReconciliationStatus.FAILED);
      report.setErrorDetails(e.getMessage());
      report.setCompletedAt(LocalDateTime.now());
    }

    report = reportRepository.save(report);
    if (report.getStatus() == ReconciliationStatus.FAILED || report.getMismatchesFound() > 0)
      alerts.enqueue(
          "reconciliation:" + report.getId(),
          "Reconciliation requires attention",
          "Report #"
              + report.getId()
              + " completed with status "
              + report.getStatus()
              + " and "
              + report.getMismatchesFound()
              + " mismatches. Inspect the report before resolving or changing any financial"
              + " records.");
    return mapToResponse(report);
  }

  @Cacheable(value = "reconciliationReports", key = "'latest:' + #type")
  public ReconciliationReportResponse getLatestReport(ReconciliationType type) {
    return reportRepository
        .findFirstByReconciliationTypeOrderByStartedAtDesc(type)
        .map(this::mapToResponse)
        .orElseThrow(
            () -> new RuntimeException("No reconciliation report found for type: " + type));
  }

  @Cacheable(value = "reconciliationMismatches", key = "'reportsWithMismatches'")
  public List<ReconciliationReportResponse> getReportsWithMismatches() {
    return reportRepository.findReportsWithMismatches().stream()
        .map(this::mapToResponse)
        .collect(Collectors.toList());
  }

  @Cacheable(value = "reconciliationMismatches", key = "'unresolvedCount'")
  public long getUnresolvedMismatchesCount() {
    return reportRepository.findReportsWithMismatches().stream()
        .mapToLong(r -> r.getMismatchesFound() - r.getMismatchesResolved())
        .sum();
  }

  private ReconciliationReport createReport(
      ReconciliationType type, boolean automated, String triggeredBy) {
    return ReconciliationReport.builder()
        .reconciliationType(type)
        .status(ReconciliationStatus.PENDING)
        .startedAt(LocalDateTime.now())
        .totalRecordsChecked(0)
        .mismatchesFound(0)
        .mismatchesResolved(0)
        .automated(automated)
        .triggeredBy(triggeredBy)
        .build();
  }

  private ReconciliationReportResponse mapToResponse(ReconciliationReport report) {
    return new ReconciliationReportResponse(
        report.getId(),
        report.getReconciliationType(),
        report.getStatus(),
        report.getStartedAt(),
        report.getCompletedAt(),
        report.getTotalRecordsChecked(),
        report.getMismatchesFound(),
        report.getMismatchesResolved(),
        report.getSummary(),
        report.getErrorDetails(),
        report.getTriggeredBy(),
        report.isAutomated(),
        report.getCreatedAt(),
        report.getUpdatedAt());
  }
}
