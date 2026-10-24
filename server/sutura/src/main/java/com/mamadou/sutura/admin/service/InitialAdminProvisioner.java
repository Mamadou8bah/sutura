package com.mamadou.sutura.admin.service;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.LocalDateTime;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Only available to the one-shot process, never through HTTP. */
@Service
@Profile({"bootstrap-admin", "render-free"})
public class InitialAdminProvisioner {
  private final UserRepository users;
  private final AuditLogRepository audit;
  private final BCryptPasswordEncoder passwords;
  private final JdbcTemplate jdbc;
  private final Environment env;

  public InitialAdminProvisioner(
      UserRepository users,
      AuditLogRepository audit,
      BCryptPasswordEncoder passwords,
      JdbcTemplate jdbc,
      Environment env) {
    this.users = users;
    this.audit = audit;
    this.passwords = passwords;
    this.jdbc = jdbc;
    this.env = env;
  }

  @Transactional
  public void provisionIfAbsent() {
    jdbc.execute("SELECT pg_advisory_xact_lock(752039184)");
    if (!users.existsByRole(Role.ADMIN)) provision();
  }

  @Transactional
  public void provision() {
    jdbc.execute("SELECT pg_advisory_xact_lock(752039184)");
    if (users.existsByRole(Role.ADMIN))
      throw new IllegalStateException(
          "An administrator already exists; bootstrap is only for the first administrator");
    String first = required("SUTURA_BOOTSTRAP_FIRST_NAME"),
        last = required("SUTURA_BOOTSTRAP_LAST_NAME"),
        email = required("SUTURA_BOOTSTRAP_EMAIL").toLowerCase(java.util.Locale.ROOT),
        phone = required("SUTURA_BOOTSTRAP_PHONE"),
        password = required("SUTURA_BOOTSTRAP_PASSWORD");
    if (first.length() > 100
        || last.length() > 100
        || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
        || email.length() > 254
        || !phone.matches("\\+[1-9][0-9]{7,14}"))
      throw new IllegalArgumentException("Invalid bootstrap name, email or international phone");
    if (password.length() < 14
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalArgumentException(
          "Bootstrap password must contain at least 14 characters and at most 72 UTF-8 bytes");
    if (users.existsByEmail(email) || users.existsByPhoneNumber(phone))
      throw new IllegalStateException("Bootstrap email or phone is already registered");
    User admin =
        users.saveAndFlush(
            User.builder()
                .firstName(first)
                .lastName(last)
                .email(email)
                .phoneNumber(phone)
                .passwordHash(passwords.encode(password))
                .role(Role.ADMIN)
                .userStatus(UserStatus.ACTIVE)
                .enabled(true)
                .twoFactorEnabled(true)
                .phoneVerified(false)
                .registrationStage(0)
                .failedLoginAttempts(0)
                .build());
    audit.save(
        AuditLog.builder()
            .actorId(admin.getId())
            .actorEmail(email)
            .entityType("USER")
            .entityId(admin.getId())
            .actionType("INITIAL_ADMIN_CREATED")
            .newState("ACTIVE")
            .changeDescription(
                "One-time administrator bootstrap; two-factor authentication required")
            .timestamp(LocalDateTime.now())
            .success(true)
            .build());
  }

  private String required(String key) {
    String value = env.getProperty(key);
    if (value == null || value.isBlank()) throw new IllegalArgumentException(key + " is required");
    return value;
  }
}
