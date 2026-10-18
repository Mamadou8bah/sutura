package com.mamadou.sutura.kyc.onboarding;

import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class KycOnboardingService {
  private final KycOnboardingRepository jobs;
  private final KycVerificationRepository verification;

  /** Caller holds the account row lock (new account creation also owns the row). */
  @Transactional
  public void enqueue(User user) {
    if (user.getRole() != Role.USER
        && user.getRole() != Role.MERCHANT
        && user.getRole() != Role.DEVELOPER) return;
    if (jobs.existsById(user.getId()) || verification.existsById(user.getId())) return;
    var now = LocalDateTime.now();
    jobs.save(
        KycOnboarding.builder()
            .userId(user.getId())
            .status("PENDING")
            .attempts(0)
            .createdAt(now)
            .nextAttemptAt(now)
            .build());
  }

  @Transactional
  public void restart(User user) {
    var job = jobs.findForUpdate(user.getId()).orElse(null);
    if (job == null) {
      enqueue(user);
      return;
    }
    job.setStatus("PENDING");
    job.setAttempts(0);
    job.setNextAttemptAt(LocalDateTime.now());
    job.setCompletedAt(null);
    job.setFailureType(null);
    jobs.save(job);
  }
}
