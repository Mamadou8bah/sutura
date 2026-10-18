package com.mamadou.sutura.user.entity;

import com.mamadou.sutura.auth.entity.RefreshToken;
import com.mamadou.sutura.common.utils.AuthorityUtils;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.enums.UserStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Table(name = "users")
@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @Column(nullable = false)
  private String firstName;

  @Column(nullable = false)
  private String lastName;

  private String middleName;

  @Column(nullable = false, length = 20, unique = true)
  private String phoneNumber;

  @NotNull @com.fasterxml.jackson.annotation.JsonIgnore @lombok.ToString.Exclude
  private String passwordHash;

  @Email private String email;

  private boolean enabled;

  private int registrationStage;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserStatus userStatus;

  private boolean phoneVerified;

  @Column(nullable = false)
  private long tokenVersion;

  private LocalDateTime lastLoginAt;

  private LocalDateTime lockedAt;

  private Integer failedLoginAttempts;

  @Column(nullable = false)
  private boolean twoFactorEnabled;

  @com.fasterxml.jackson.annotation.JsonIgnore @lombok.ToString.Exclude
  private String twoFactorCodeHash;

  @com.fasterxml.jackson.annotation.JsonIgnore @lombok.ToString.Exclude
  private String twoFactorChallengeId;

  private LocalDateTime twoFactorCodeExpiresAt;

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  @com.fasterxml.jackson.annotation.JsonIgnore
  @lombok.ToString.Exclude
  private List<RefreshToken> refreshTokens;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role role;

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return AuthorityUtils.getGrantedAuthorities(role);
  }

  @Override
  @com.fasterxml.jackson.annotation.JsonIgnore
  public String getPassword() {
    return passwordHash;
  }

  @Override
  public String getUsername() {
    return role == Role.MERCHANT || role == Role.DEVELOPER ? email : phoneNumber;
  }

  @Override
  public boolean isAccountNonLocked() {
    return lockedAt == null || !lockedAt.plusMinutes(15).isAfter(LocalDateTime.now());
  }

  @Override
  public boolean isEnabled() {
    return enabled;
  }
}
