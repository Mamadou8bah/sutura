package com.mamadou.sutura.auth.recovery;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "password_recovery_challenges")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecoveryChallenge {
  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false)
  private String codeHash;

  @Column(nullable = false)
  private int attempts;

  @Column(nullable = false)
  private long tokenVersion;

  @Column(nullable = false)
  private LocalDateTime expiresAt;

  @Column(nullable = false)
  private LocalDateTime createdAt;

  private LocalDateTime usedAt;
}
