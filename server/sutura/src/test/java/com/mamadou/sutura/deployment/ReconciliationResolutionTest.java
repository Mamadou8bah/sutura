package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.reconciliation.entity.*;
import com.mamadou.sutura.reconciliation.enums.ReconciliationType;
import com.mamadou.sutura.reconciliation.repository.*;
import com.mamadou.sutura.reconciliation.service.ReconciliationResolutionService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ReconciliationResolutionTest {
  @Autowired ReconciliationResolutionService service;
  @Autowired ReconciliationMismatchRepository mismatches;
  @Autowired ReconciliationReportRepository reports;
  @Autowired AuditLogRepository audit;

  @Test
  void resolutionIsReasonedIdempotentAndAttributedToTheRealAdmin() {
    var report =
        reports.saveAndFlush(
            ReconciliationReport.builder()
                .reconciliationType(ReconciliationType.WALLET_LEDGER)
                .mismatchesFound(1)
                .build());
    var mismatch =
        mismatches.saveAndFlush(
            ReconciliationMismatch.builder()
                .report(report)
                .entityId(1L)
                .entityType("WALLET")
                .mismatchType("TEST")
                .build());
    var actor = User.builder().id(9002).email("ops@example.invalid").role(Role.ADMIN).build();
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(actor, null, actor.getAuthorities()));
    try {
      assertThrows(
          org.springframework.web.server.ResponseStatusException.class,
          () -> service.resolve(mismatch.getId(), " ", actor));
      service.resolve(mismatch.getId(), "Verified and corrected source records", actor);
      service.resolve(mismatch.getId(), "Repeated request", actor);
      var stored = mismatches.findById(mismatch.getId()).orElseThrow();
      assertTrue(stored.isResolved());
      assertEquals("9002", stored.getResolvedBy());
      assertEquals(1, reports.findById(report.getId()).orElseThrow().getMismatchesResolved());
      assertEquals(
          1, audit.findByEntityTypeAndEntityId("RECONCILIATION_MISMATCH", mismatch.getId()).size());
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
