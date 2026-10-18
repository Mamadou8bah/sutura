package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.admin.service.InitialAdminProvisioner;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class InitialAdminProvisionerTest {
  @Test
  void createsOnlyFirstAdminWithTwoFactorAndHashedPassword() {
    var users = mock(UserRepository.class);
    var audit = mock(AuditLogRepository.class);
    var jdbc = mock(JdbcTemplate.class);
    var passwords = new BCryptPasswordEncoder(4);
    var env =
        new MockEnvironment()
            .withProperty("SUTURA_BOOTSTRAP_FIRST_NAME", "Platform")
            .withProperty("SUTURA_BOOTSTRAP_LAST_NAME", "Admin")
            .withProperty("SUTURA_BOOTSTRAP_EMAIL", "admin@example.invalid")
            .withProperty("SUTURA_BOOTSTRAP_PHONE", "+2207000000")
            .withProperty("SUTURA_BOOTSTRAP_PASSWORD", "a-long-test-password");
    when(users.saveAndFlush(any()))
        .thenAnswer(
            i -> {
              User user = i.getArgument(0);
              user.setId(1);
              return user;
            });
    var provisioner = new InitialAdminProvisioner(users, audit, passwords, jdbc, env);
    provisioner.provision();
    verify(users)
        .saveAndFlush(
            argThat(
                user ->
                    user.getRole() == Role.ADMIN
                        && user.isTwoFactorEnabled()
                        && user.isEnabled()
                        && passwords.matches("a-long-test-password", user.getPasswordHash())));
    verify(audit).save(any());
    when(users.existsByRole(Role.ADMIN)).thenReturn(true);
    assertThrows(IllegalStateException.class, provisioner::provision);
    verify(users, times(1)).saveAndFlush(any());
  }
}
