package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.notification.service.EmailSender;
import com.mamadou.sutura.operations.*;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = "sutura.notifications.alert-email=ops@example.invalid")
@ActiveProfiles("test")
class OperationalAlertsTest {
  @Autowired OperationalAlertController controller;
  @Autowired com.mamadou.sutura.audit.repository.AuditLogRepository audit;
  @Autowired OperationalAlerts alerts;
  @Autowired OperationalAlertRepository repository;
  @Autowired OperationalAlertDelivery delivery;
  @Autowired PlatformTransactionManager transactions;
  @MockitoBean EmailSender email;

  String key() {
    return "test:" + java.util.UUID.randomUUID();
  }

  OperationalAlert alert(String key) {
    alerts.enqueue(key, "Test alert", "No real customer data");
    return repository.findAll().stream()
        .filter(a -> a.getEventKey().equals(key))
        .findFirst()
        .orElseThrow();
  }

  @Test
  void rollbackDoesNotPublishAndRepeatedEventDoesNotDuplicate() {
    String rollback = key();
    new TransactionTemplate(transactions)
        .executeWithoutResult(
            status -> {
              alerts.enqueue(rollback, "Rollback", "Do not send");
              status.setRollbackOnly();
            });
    assertFalse(repository.existsByEventKey(rollback));
    String once = key();
    var first = alert(once);
    alerts.enqueue(once, "Duplicate", "Duplicate");
    assertEquals(
        1, repository.findAll().stream().filter(a -> a.getEventKey().equals(once)).count());
    delivery.deliver(first.getId());
    delivery.deliver(first.getId());
    verify(email, times(1)).send(anyString(), anyString(), anyString());
    assertEquals("SENT", repository.findById(first.getId()).orElseThrow().getStatus());
  }

  @Test
  void adminRetryRequiresFailedStateAndIsAudited() {
    var alert = alert(key());
    alert.setStatus("FAILED");
    alert.setAttempts(8);
    repository.saveAndFlush(alert);
    var actor =
        com.mamadou.sutura.user.entity.User.builder()
            .id(9001)
            .role(com.mamadou.sutura.user.enums.Role.ADMIN)
            .email("ops@example.invalid")
            .build();
    org.springframework.security.core.context.SecurityContextHolder.getContext()
        .setAuthentication(
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                actor, null, actor.getAuthorities()));
    try {
      controller.retry(
          alert.getId(),
          new OperationalAlertController.Retry("SMTP configuration repaired"),
          actor);
      assertEquals("PENDING", repository.findById(alert.getId()).orElseThrow().getStatus());
      assertEquals(1, audit.findByEntityTypeAndEntityId("OPERATIONAL_ALERT", alert.getId()).size());
      assertThrows(
          org.springframework.web.server.ResponseStatusException.class,
          () ->
              controller.retry(
                  alert.getId(), new OperationalAlertController.Retry("Repeat"), actor));
    } finally {
      org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }
  }

  @Test
  void deliveryFailuresBackOffAndEventuallyRemainVisibleAsFailed() {
    var alert = alert(key());
    doThrow(new IllegalStateException("private provider response must not be persisted"))
        .when(email)
        .send(anyString(), anyString(), anyString());
    for (int i = 0; i < 8; i++) {
      delivery.deliver(alert.getId());
      var stored = repository.findById(alert.getId()).orElseThrow();
      if (i < 7) {
        assertEquals("PENDING", stored.getStatus());
        assertTrue(stored.getNextAttemptAt().isAfter(LocalDateTime.now()));
        stored.setNextAttemptAt(LocalDateTime.now().minusSeconds(1));
        repository.saveAndFlush(stored);
      }
    }
    var failed = repository.findById(alert.getId()).orElseThrow();
    assertEquals("FAILED", failed.getStatus());
    assertEquals(8, failed.getAttempts());
    assertEquals("IllegalStateException", failed.getFailureType());
    delivery.deliver(alert.getId());
    verify(email, times(8)).send(anyString(), anyString(), anyString());
  }
}
