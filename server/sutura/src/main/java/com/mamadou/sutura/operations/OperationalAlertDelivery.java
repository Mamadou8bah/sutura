package com.mamadou.sutura.operations;

import com.mamadou.sutura.notification.service.EmailSender;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperationalAlertDelivery {
  private final OperationalAlertRepository repository;
  private final EmailSender email;

  @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
  public void deliver(Long id) {
    var alert = repository.findForDelivery(id).orElse(null);
    if (alert == null
        || !"PENDING".equals(alert.getStatus())
        || alert.getNextAttemptAt().isAfter(LocalDateTime.now())) return;
    alert.setAttempts(alert.getAttempts() + 1);
    try {
      email.send(
          alert.getRecipient(),
          "[Sutura alert #" + alert.getId() + "] " + alert.getSubject(),
          alert.getBody());
      alert.setStatus("SENT");
      alert.setSentAt(LocalDateTime.now());
      alert.setFailureType(null);
    } catch (RuntimeException failure) {
      alert.setFailureType(failure.getClass().getSimpleName());
      if (alert.getAttempts() >= 8) alert.setStatus("FAILED");
      else
        alert.setNextAttemptAt(
            LocalDateTime.now()
                .plusSeconds(Math.min(3600, 30L * (1L << Math.min(alert.getAttempts(), 7)))));
    }
    repository.save(alert);
  }
}
