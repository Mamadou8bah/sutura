package com.mamadou.sutura.operations;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "sutura.notifications.email.provider", havingValue = "smtp")
public class OperationalAlertWorker {
  private final OperationalAlertRepository repository;
  private final OperationalAlertDelivery delivery;

  @Scheduled(fixedDelayString = "${sutura.notifications.alert-delay-ms:10000}")
  public void dispatch() {
    for (var alert :
        repository.findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            "PENDING", LocalDateTime.now())) {
      try {
        delivery.deliver(alert.getId());
      } catch (RuntimeException failure) {
        log.warn("Alert {} retained after delivery transaction failure", alert.getId());
      }
    }
  }
}
