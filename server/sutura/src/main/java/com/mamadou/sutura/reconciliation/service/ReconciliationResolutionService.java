package com.mamadou.sutura.reconciliation.service;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.reconciliation.entity.ReconciliationMismatch;
import com.mamadou.sutura.reconciliation.repository.*;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReconciliationResolutionService {
  private final ReconciliationMismatchRepository mismatches;
  private final ReconciliationReportRepository reports;
  private final AuditLogRepository audit;

  @Transactional
  @PreAuthorize("hasRole('ADMIN')")
  public ReconciliationMismatch resolve(Long id, String reason, User actor) {
    if (actor == null || actor.getRole() != Role.ADMIN)
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin account required");
    if (reason == null || reason.isBlank() || reason.length() > 1000)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Enter a resolution reason (up to 1000 characters)");
    var mismatch =
        mismatches
            .findForResolution(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mismatch not found"));
    if (mismatch.isResolved()) return mismatch;
    mismatch.setResolved(true);
    mismatch.setResolutionAction(reason.trim());
    mismatch.setResolvedAt(LocalDateTime.now());
    mismatch.setResolvedBy(String.valueOf(actor.getId()));
    mismatches.save(mismatch);
    reports.incrementResolved(mismatch.getReport().getId());
    audit.save(
        AuditLog.builder()
            .actorId(actor.getId())
            .actorEmail(actor.getEmail() == null ? actor.getPhoneNumber() : actor.getEmail())
            .actionType("RECONCILIATION_RESOLVED")
            .entityType("RECONCILIATION_MISMATCH")
            .entityId(id)
            .previousState("UNRESOLVED")
            .newState("RESOLVED")
            .changeDescription(reason.trim())
            .timestamp(LocalDateTime.now())
            .success(true)
            .build());
    return mismatch;
  }
}
