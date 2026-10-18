package com.mamadou.sutura.kyc.onboarding;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class KycOnboardingWorker {
  private final KycOnboardingRepository jobs;
  private final KycOnboardingDelivery delivery;

  @Scheduled(fixedDelayString = "${sutura.kyc.onboarding-delay-ms:10000}")
  public void process() {
    for (Long id : jobs.due(LocalDateTime.now(), PageRequest.of(0, 20))) {
      try {
        delivery.deliver(id);
      } catch (RuntimeException failure) {
        log.warn(
            "Identity onboarding retry failed for account {} ({})",
            id,
            failure.getClass().getSimpleName());
      }
    }
  }
}
