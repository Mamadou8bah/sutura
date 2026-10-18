package com.mamadou.sutura.kyc.onboarding;

import com.mamadou.sutura.kyc.service.KycService;
import com.mamadou.sutura.operations.OperationalAlerts;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class KycOnboardingDelivery {
  private final KycOnboardingRepository jobs;
  private final UserRepository users;
  private final KycService kyc;
  private final OperationalAlerts alerts;

  @Transactional
  public void deliver(Long id) {
    var user = users.findForKycUpdate(id).orElse(null);
    var job = jobs.findForUpdate(id).orElse(null);
    if (user == null
        || job == null
        || !"PENDING".equals(job.getStatus())
        || job.getNextAttemptAt().isAfter(LocalDateTime.now())) return;
    if (!user.isEnabled()
        || user.getUserStatus() == UserStatus.BANNED
        || user.getUserStatus() == UserStatus.SUSPENDED) {
      job.setNextAttemptAt(LocalDateTime.now().plusHours(1));
      return;
    }
    job.setAttempts(job.getAttempts() + 1);
    try {
      kyc.startForOnboarding(id);
      job.setStatus("COMPLETED");
      job.setCompletedAt(LocalDateTime.now());
      job.setFailureType(null);
    } catch (ResponseStatusException failure) {
      job.setFailureType("SentinelUnavailable");
      job.setNextAttemptAt(
          LocalDateTime.now()
              .plusSeconds(Math.min(3600, 10L * (1L << Math.min(job.getAttempts(), 9)))));
      if (job.getAttempts() == 5)
        alerts.enqueue(
            "kyc-onboarding:" + id,
            "Identity onboarding requires attention",
            "Automatic identity session creation for account #"
                + id
                + " has failed five times. Retries continue with backoff; no identity privileges"
                + " have been granted.");
    }
    jobs.save(job);
  }
}
