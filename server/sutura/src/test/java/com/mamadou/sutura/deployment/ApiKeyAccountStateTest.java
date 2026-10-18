package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.auth.entity.APIKey;
import com.mamadou.sutura.auth.repository.APIKeyRepository;
import com.mamadou.sutura.auth.service.APIKeyService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.scrypt.SCryptPasswordEncoder;

class ApiKeyAccountStateTest {
  @Test
  void validApiKeyCannotBypassSuspensionOrDisabledAccount() {
    var keys = mock(APIKeyRepository.class);
    var encoder = mock(SCryptPasswordEncoder.class);
    var service = new APIKeyService(keys, encoder, mock(UserRepository.class));
    var user =
        User.builder().role(Role.MERCHANT).enabled(true).userStatus(UserStatus.SUSPENDED).build();
    var key = APIKey.builder().user(user).publicId("test").secretHash("hash").build();
    when(keys.findByPublicId("test")).thenReturn(Optional.of(key));
    when(encoder.matches("test.secret", "hash")).thenReturn(true);
    assertNull(service.authenticate("test.secret"));
    user.setUserStatus(UserStatus.ACTIVE);
    user.setEnabled(false);
    assertNull(service.authenticate("test.secret"));
    user.setEnabled(true);
    assertSame(user, service.authenticate("test.secret"));
    verify(keys, times(1)).save(key);
  }

  @Test
  void productionScryptCanHashAndVerify() {
    var encoder = new SCryptPasswordEncoder(16, 1, 1, 32, 16);
    var encoded = encoder.encode("test.secret");
    assertTrue(encoder.matches("test.secret", encoded));
  }
}
