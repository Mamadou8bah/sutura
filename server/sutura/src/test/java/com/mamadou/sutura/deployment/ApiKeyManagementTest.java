package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.auth.dto.APIKeyCreateRequest;
import com.mamadou.sutura.auth.service.APIKeyService;
import com.mamadou.sutura.common.Exception.APIKeyNotFoundException;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ApiKeyManagementTest {
  @Autowired APIKeyService keys;
  @Autowired UserRepository users;

  @Test
  void dashboardCanRevokeByPublicIdWithoutKnowingSecretAndCannotRevokeAnotherAccount() {
    var owner = user(Role.DEVELOPER);
    var stranger = user(Role.DEVELOPER);
    try {
      authenticate(owner);
      var issued = keys.createApiKey(new APIKeyCreateRequest("proposal-key", 7));
      assertNotNull(keys.authenticate(issued.apiKey()));
      authenticate(stranger);
      assertThrows(
          APIKeyNotFoundException.class, () -> keys.revokeOwnedPublicId(issued.publicId()));
      authenticate(owner);
      assertNotNull(keys.authenticate(issued.apiKey()));
      keys.revokeOwnedPublicId(issued.publicId());
      assertNull(keys.authenticate(issued.apiKey()));
      assertTrue(keys.listApiKeys().get(0).revoked());
      assertNull(keys.listApiKeys().get(0).apiKey());
      keys.revokeOwnedPublicId(issued.publicId());
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  @Test
  void humanCustomerCannotCreateIntegrationKeys() {
    try {
      authenticate(user(Role.USER));
      assertThrows(
          org.springframework.security.access.AccessDeniedException.class,
          () -> keys.createApiKey(new APIKeyCreateRequest("forbidden", 7)));
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  private User user(Role role) {
    return users.saveAndFlush(
        User.builder()
            .firstName("API")
            .lastName("Acceptance")
            .email(java.util.UUID.randomUUID() + "@example.invalid")
            .phoneNumber("+" + System.nanoTime())
            .passwordHash("unused-test-hash")
            .role(role)
            .enabled(true)
            .userStatus(UserStatus.ACTIVE)
            .build());
  }

  private void authenticate(User user) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
  }
}
