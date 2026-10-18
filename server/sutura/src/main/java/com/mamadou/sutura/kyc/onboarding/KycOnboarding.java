package com.mamadou.sutura.kyc.onboarding;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "kyc_onboarding_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KycOnboarding {
  @Id private Long userId;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(nullable = false)
  private int attempts;

  @Column(nullable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime nextAttemptAt;

  private LocalDateTime completedAt;

  @Column(length = 160)
  private String failureType;
}
