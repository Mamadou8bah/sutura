package com.mamadou.sutura.admin;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.mamadou.sutura.auth.service.JwtAuthenticationFilter;
import com.mamadou.sutura.common.config.JWTConfig;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class AccountAccessTest {
  @Test
  void existingAccessTokenIsDeniedForRestrictedAccounts() throws Exception {
    JWTConfig jwt = mock(JWTConfig.class);
    UserRepository users = mock(UserRepository.class);
    Claims claims = mock(Claims.class);
    when(jwt.validateToken("token")).thenReturn(true);
    when(jwt.extractAllClaims("token")).thenReturn(claims);
    when(claims.get("type", String.class)).thenReturn("access_token");
    when(jwt.extractSubject("token")).thenReturn("+2207000000");
    var filter = new JwtAuthenticationFilter(jwt, users);
    try {
      for (UserStatus status :
          new UserStatus[] {UserStatus.SUSPENDED, UserStatus.BANNED, UserStatus.ACTIVE}) {
        SecurityContextHolder.clearContext();
        User user =
            User.builder()
                .id(2)
                .phoneNumber("+2207000000")
                .role(Role.AGENT)
                .enabled(true)
                .userStatus(status)
                .build();
        when(users.findByLoginIdentifier("+2207000000")).thenReturn(Optional.of(user));
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {});
        assertEquals(
            status == UserStatus.ACTIVE,
            SecurityContextHolder.getContext().getAuthentication() != null);
      }
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  @Test
  void olderAccessTokenStaysInvalidAfterAccountRestoration() throws Exception {
    JWTConfig jwt = mock(JWTConfig.class);
    UserRepository users = mock(UserRepository.class);
    Claims claims = mock(Claims.class);
    when(jwt.validateToken("token")).thenReturn(true);
    when(jwt.extractAllClaims("token")).thenReturn(claims);
    when(claims.get("type", String.class)).thenReturn("access_token");
    when(claims.get("tokenVersion", Number.class)).thenReturn(2L);
    when(jwt.extractSubject("token")).thenReturn("+2207000000");
    User user =
        User.builder()
            .id(2L)
            .phoneNumber("+2207000000")
            .role(Role.USER)
            .enabled(true)
            .userStatus(UserStatus.ACTIVE)
            .tokenVersion(3)
            .build();
    when(users.findByLoginIdentifier("+2207000000")).thenReturn(Optional.of(user));
    var request = new MockHttpServletRequest();
    request.addHeader("Authorization", "Bearer token");
    try {
      new JwtAuthenticationFilter(jwt, users)
          .doFilter(request, new MockHttpServletResponse(), (req, res) -> {});
      assertNull(SecurityContextHolder.getContext().getAuthentication());
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
