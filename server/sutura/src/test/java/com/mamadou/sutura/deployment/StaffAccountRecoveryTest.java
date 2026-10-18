package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.admin.service.StaffAccountRecovery;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.auth.service.RefreshTokenService;
import com.mamadou.sutura.operations.OperationalAlerts;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class StaffAccountRecoveryTest {
  @Test
  void infrastructureRecoveryRevokesSessionsAuditsAndPreservesRestrictions() {
    var users = mock(UserRepository.class);
    var sessions = mock(RefreshTokenService.class);
    var audit = mock(AuditLogRepository.class);
    var alerts = mock(OperationalAlerts.class);
    var passwords = new BCryptPasswordEncoder(4);
    var user =
        User.builder()
            .id(17L)
            .role(Role.ADMIN)
            .userStatus(UserStatus.SUSPENDED)
            .passwordHash(passwords.encode("previous-test-password"))
            .tokenVersion(3)
            .failedLoginAttempts(5)
            .lockedAt(java.time.LocalDateTime.now())
            .build();
    when(users.findForKycUpdate(17L)).thenReturn(java.util.Optional.of(user));
    var env =
        new MockEnvironment()
            .withProperty("SUTURA_RECOVERY_ACCOUNT_ID", "17")
            .withProperty("SUTURA_RECOVERY_PASSWORD", "new-secure-test-password")
            .withProperty("SUTURA_RECOVERY_OPERATOR", "operator@example.invalid")
            .withProperty("SUTURA_RECOVERY_REASON", "Verified staff access recovery");
    var command = new StaffAccountRecovery(users, sessions, passwords, audit, alerts, env);
    command.recover();
    assertTrue(passwords.matches("new-secure-test-password", user.getPasswordHash()));
    assertEquals(4, user.getTokenVersion());
    assertEquals(UserStatus.SUSPENDED, user.getUserStatus());
    assertTrue(user.isTwoFactorEnabled());
    assertNull(user.getLockedAt());
    verify(sessions).revokeAllUserRefreshTokens(user);
    verify(audit)
        .save(
            argThat(
                a -> a.getActorId() == 0L && a.getActionType().equals("STAFF_ACCOUNT_RECOVERED")));
    verify(alerts).enqueue(anyString(), anyString(), anyString());
    user.setRole(Role.USER);
    assertThrows(IllegalArgumentException.class, command::recover);
    verify(sessions, times(1)).revokeAllUserRefreshTokens(user);
  }
}
