package com.mamadou.sutura.reconciliation.controller;

import com.mamadou.sutura.reconciliation.dto.ManualReconciliationRequest;
import com.mamadou.sutura.reconciliation.dto.ReconciliationMismatchResponse;
import com.mamadou.sutura.reconciliation.dto.ReconciliationReportResponse;
import com.mamadou.sutura.reconciliation.enums.ReconciliationType;
import com.mamadou.sutura.reconciliation.repository.ReconciliationMismatchRepository;
import com.mamadou.sutura.reconciliation.service.ReconciliationService;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@org.springframework.transaction.annotation.Transactional
@RequestMapping("/api/v1/reconciliation")
@RequiredArgsConstructor
@Slf4j
public class ReconciliationController {

  private final ReconciliationService reconciliationService;
  private final com.mamadou.sutura.reconciliation.service.ReconciliationResolutionService
      resolutionService;
  private final ReconciliationMismatchRepository mismatchRepository;

  @PostMapping("/manual")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<ReconciliationReportResponse> triggerManualReconciliation(
      @RequestBody ManualReconciliationRequest request) {
    log.info("Manual reconciliation triggered: {}", request.reconciliationType());
    ReconciliationReportResponse report = reconciliationService.runManualReconciliation(request);
    return ResponseEntity.ok(report);
  }

  @GetMapping("/wallets/{walletId}/latest-report")
  public ResponseEntity<ReconciliationReportResponse> getLatestReport(
      @PathVariable ReconciliationType walletId) {
    try {
      ReconciliationReportResponse report = reconciliationService.getLatestReport(walletId);
      return ResponseEntity.ok(report);
    } catch (Exception e) {
      log.error("Error retrieving latest report", e);
      return ResponseEntity.notFound().build();
    }
  }

  @GetMapping("/mismatches")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<ReconciliationMismatchResponse>> getAllMismatches() {
    log.info("Fetching all unresolved mismatches");
    List<ReconciliationMismatchResponse> mismatches =
        mismatchRepository.findAll().stream()
            .filter(m -> !m.isResolved())
            .map(this::mapMismatchToResponse)
            .collect(Collectors.toList());
    return ResponseEntity.ok(mismatches);
  }

  @GetMapping("/mismatches/{reportId}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<List<ReconciliationMismatchResponse>> getMismatchesByReport(
      @PathVariable Long reportId) {
    log.info("Fetching mismatches for report {}", reportId);
    List<ReconciliationMismatchResponse> mismatches =
        mismatchRepository.findByReportId(reportId).stream()
            .map(this::mapMismatchToResponse)
            .collect(Collectors.toList());
    return ResponseEntity.ok(mismatches);
  }

  @PutMapping("/mismatches/{mismatchId}/resolve")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<ReconciliationMismatchResponse> resolveMismatch(
      @PathVariable Long mismatchId, @RequestParam String resolutionAction) {
    log.info("Resolving mismatch {}", mismatchId);
    var actor =
        (com.mamadou.sutura.user.entity.User)
            org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal();
    return ResponseEntity.ok(
        mapMismatchToResponse(resolutionService.resolve(mismatchId, resolutionAction, actor)));
  }

  @GetMapping("/status")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<ReconciliationStatusDto> getReconciliationStatus() {
    log.info("Fetching reconciliation status");
    long unresolvedCount = mismatchRepository.countAllUnresolved();
    List<ReconciliationReportResponse> reportWithMismatches =
        reconciliationService.getReportsWithMismatches();

    return ResponseEntity.ok(
        new ReconciliationStatusDto(
            unresolvedCount, reportWithMismatches.size(), reportWithMismatches));
  }

  private ReconciliationMismatchResponse mapMismatchToResponse(
      com.mamadou.sutura.reconciliation.entity.ReconciliationMismatch m) {
    return new ReconciliationMismatchResponse(
        m.getId(),
        m.getReport().getId(),
        m.getMismatchType(),
        m.getEntityId(),
        m.getEntityType(),
        m.getExpectedValue(),
        m.getActualValue(),
        m.getVariance(),
        m.getDescription(),
        m.isResolved(),
        m.getResolutionAction(),
        m.getResolvedAt(),
        m.getResolvedBy(),
        m.getCreatedAt());
  }

  public record ReconciliationStatusDto(
      long unresolvedMismatchCount,
      long reportsWithMismatches,
      List<ReconciliationReportResponse> recentReports) {}
}
