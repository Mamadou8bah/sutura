package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.user.entity.User;
import org.junit.jupiter.api.Test;

class CredentialSerializationTest {
  @Test
  void userJsonAndLogsNeverContainAuthenticationSecrets() throws Exception {
    var user =
        User.builder()
            .role(com.mamadou.sutura.user.enums.Role.USER)
            .passwordHash("private-password-hash")
            .twoFactorCodeHash("private-code-hash")
            .twoFactorChallengeId("private-challenge")
            .build();
    String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(user);
    assertFalse(json.contains("private-"));
    assertFalse(user.toString().contains("private-"));
  }
}
