package com.mamadou.sutura.operations;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperationalAlerts {
  private final OperationalAlertRepository repository;

  @Value("${sutura.notifications.alert-email:}")
  private String recipient;

  /** Joins the owning operation: rolled-back payments must not create alerts. */
  @Transactional
  public void enqueue(String eventKey, String subject, String body) {
    if (recipient == null || recipient.isBlank())
      return; // Explicitly disabled outside configured environments.
    if (repository.existsByEventKey(eventKey)) return;
    repository.save(
        OperationalAlert.builder()
            .eventKey(eventKey)
            .recipient(recipient)
            .subject(subject)
            .body(body)
            .status("PENDING")
            .createdAt(LocalDateTime.now())
            .nextAttemptAt(LocalDateTime.now())
            .build());
  }
}
