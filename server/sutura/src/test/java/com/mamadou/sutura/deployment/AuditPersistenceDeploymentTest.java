package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.reconciliation.entity.*;
import com.mamadou.sutura.reconciliation.enums.ReconciliationType;
import com.mamadou.sutura.risk.entity.RiskFlag;
import com.mamadou.sutura.risk.enums.*;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.wallet.entity.Wallet;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuditPersistenceDeploymentTest {
  @Autowired EntityManager entityManager;

  @Test
  void auditRiskAndReconciliationPersistRequiredInheritedTimestamps() {
    var audit =
        AuditLog.builder()
            .actorId(1L)
            .actorEmail("test@example.invalid")
            .actionType("DEPLOYMENT_TEST")
            .entityType("TEST")
            .entityId(1L)
            .success(false)
            .build();
    entityManager.persist(audit);
    var report =
        ReconciliationReport.builder().reconciliationType(ReconciliationType.WALLET_LEDGER).build();
    entityManager.persist(report);
    var mismatch =
        ReconciliationMismatch.builder()
            .report(report)
            .mismatchType("TEST")
            .entityId(1L)
            .entityType("TEST")
            .build();
    entityManager.persist(mismatch);
    var user =
        User.builder()
            .firstName("Audit")
            .lastName("Test")
            .phoneNumber("+2207999988")
            .passwordHash("test-hash")
            .role(Role.USER)
            .userStatus(UserStatus.ACTIVE)
            .enabled(true)
            .build();
    entityManager.persist(user);
    var wallet = Wallet.builder().user(user).currency("GMD").build();
    entityManager.persist(wallet);
    var risk =
        RiskFlag.builder()
            .wallet(wallet)
            .transactionId(1L)
            .riskLevel(RiskLevel.HIGH)
            .triggeringRule(RiskRuleType.DAILY_THRESHOLD)
            .build();
    entityManager.persist(risk);
    entityManager.flush();
    for (var record : java.util.List.of(audit, report, mismatch, risk)) {
      assertNotNull(record.getCreatedAt());
      assertNotNull(record.getUpdatedAt());
    }
    entityManager.clear();
    assertFalse(entityManager.find(AuditLog.class, audit.getId()).isSuccess());
  }
}
