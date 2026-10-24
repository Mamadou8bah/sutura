package com.mamadou.sutura.admin.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class InitialAdminProvisionerTest {
  @Test
  void startupBootstrapNeverResetsAnExistingAdministrator() {
    var users = mock(UserRepository.class);
    var jdbc = mock(JdbcTemplate.class);
    when(users.existsByRole(Role.ADMIN)).thenReturn(true);
    var service =
        new InitialAdminProvisioner(
            users,
            mock(AuditLogRepository.class),
            new BCryptPasswordEncoder(),
            jdbc,
            new MockEnvironment());
    assertDoesNotThrow(service::provisionIfAbsent);
    verify(jdbc).execute("SELECT pg_advisory_xact_lock(752039184)");
    verify(users, never()).saveAndFlush(any());
    assertThrows(IllegalStateException.class, service::provision);
  }
}
