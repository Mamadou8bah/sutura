package com.mamadou.sutura.admin.service;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.auth.service.RefreshTokenService;
import com.mamadou.sutura.operations.OperationalAlerts;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.LocalDateTime;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Trusted infrastructure operators only; deliberately unavailable through HTTP. */
@Service
@Profile("recover-staff")
public class StaffAccountRecovery {
  private final UserRepository users;
  private final RefreshTokenService sessions;
  private final BCryptPasswordEncoder passwords;
  private final AuditLogRepository audit;
  private final OperationalAlerts alerts;
  private final Environment env;

  public StaffAccountRecovery(
      UserRepository users,
      RefreshTokenService sessions,
      BCryptPasswordEncoder passwords,
      AuditLogRepository audit,
      OperationalAlerts alerts,
      Environment env) {
    this.users = users;
    this.sessions = sessions;
    this.passwords = passwords;
    this.audit = audit;
    this.alerts = alerts;
    this.env = env;
  }

  @Transactional
  public void recover() {
    long id = Long.parseLong(required("SUTURA_RECOVERY_ACCOUNT_ID"));
    String password = required("SUTURA_RECOVERY_PASSWORD"),
        operator = required("SUTURA_RECOVERY_OPERATOR"),
        reason = required("SUTURA_RECOVERY_REASON");
    if (password.length() < 14
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalArgumentException(
          "Recovery password must contain at least 14 characters and at most 72 UTF-8 bytes");
    if (operator.length() > 254 || reason.length() > 1000)
      throw new IllegalArgumentException("Operator or recovery reason is too long");
    var user =
        users
            .findForKycUpdate(id)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    if (user.getRole() != Role.ADMIN && user.getRole() != Role.DEVELOPER)
      throw new IllegalArgumentException("This command is only for staff accounts");
    if (passwords.matches(password, user.getPasswordHash()))
      throw new IllegalArgumentException("Choose a different password");
    user.setPasswordHash(passwords.encode(password));
    user.setTokenVersion(user.getTokenVersion() + 1);
    user.setLockedAt(null);
    user.setFailedLoginAttempts(0);
    user.setTwoFactorEnabled(true);
    user.setTwoFactorChallengeId(null);
    user.setTwoFactorCodeHash(null);
    user.setTwoFactorCodeExpiresAt(null);
    users.save(user);
    sessions.revokeAllUserRefreshTokens(user);
    audit.save(
        AuditLog.builder()
            .actorId(0L)
            .actorEmail(operator)
            .entityType("USER")
            .entityId(id)
            .actionType("STAFF_ACCOUNT_RECOVERED")
            .changeDescription("Infrastructure operator: " + reason)
            .timestamp(LocalDateTime.now())
            .success(true)
            .build());
    alerts.enqueue(
        "staff-recovery:" + id + ":" + user.getTokenVersion(),
        "Staff account recovered",
        "Infrastructure operator "
            + operator
            + " recovered account #"
            + id
            + ". Reason: "
            + reason
            + ". All sessions were invalidated; account restrictions remain in place.");
  }

  private String required(String key) {
    String value = env.getProperty(key);
    if (value == null || value.isBlank()) throw new IllegalArgumentException(key + " is required");
    return value;
  }
}
