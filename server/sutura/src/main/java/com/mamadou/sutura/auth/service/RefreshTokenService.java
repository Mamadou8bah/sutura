package com.mamadou.sutura.auth.service;

import com.mamadou.sutura.auth.dto.RefreshTokenResponse;
import com.mamadou.sutura.auth.entity.RefreshToken;
import com.mamadou.sutura.auth.repository.RefreshTokenRepository;
import com.mamadou.sutura.common.Exception.InvalidTokenException;
import com.mamadou.sutura.common.config.JWTConfig;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {
  private final RefreshTokenRepository refreshTokenRepository;
  private final JWTConfig jwtConfig;
  private final UserRepository users;

  @Transactional
  public String generateRefreshToken(User user) {
    String id = UUID.randomUUID().toString();
    Map<String, Object> claims = claims(user, "refresh_token");
    String raw = jwtConfig.generateRefreshToken(user.getUsername(), id, claims);
    refreshTokenRepository.save(
        RefreshToken.builder()
            .tokenId(id)
            .tokenHash(fingerprint(raw))
            .createdAt(LocalDateTime.now())
            .expiredAt(jwtConfig.getHelper().refreshExpiryDateTime())
            .revoked(false)
            .user(user)
            .build());
    return raw;
  }

  /** One successful exchange consumes the previous token in the same database transaction. */
  @Transactional
  public RefreshTokenResponse rotateRefreshToken(String raw) {
    RefreshToken stored = lockedToken(raw);
    User user = stored.getUser();
    verify(raw, stored);
    stored.setRevoked(true);
    refreshTokenRepository.save(stored);
    String next = generateRefreshToken(user);
    return new RefreshTokenResponse(
        generateAccessToken(user), next, "Bearer", accessTokenTtlSeconds());
  }

  public long accessTokenTtlSeconds() {
    return jwtConfig.getAccessTokenExpirationMinutes() * 60;
  }

  public String generateAccessToken(User user) {
    return jwtConfig.generateAccessToken(user.getUsername(), claims(user, "access_token"));
  }

  private Map<String, Object> claims(User user, String type) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("type", type);
    claims.put("role", user.getRole().name());
    claims.put("username", user.getUsername());
    claims.put("userId", user.getId());
    claims.put("tokenVersion", user.getTokenVersion());
    return claims;
  }

  @Transactional
  public String revokeRefreshToken(String raw) {
    RefreshToken stored = lockedToken(raw);
    verify(raw, stored);
    stored.setRevoked(true);
    refreshTokenRepository.save(stored);
    return "Refresh token revoked successfully";
  }

  @Transactional
  public void logoutAll(String raw) {
    RefreshToken stored = lockedToken(raw);
    verify(raw, stored);
    User user = stored.getUser();
    user.setTokenVersion(user.getTokenVersion() + 1);
    users.save(user);
    revokeAllUserRefreshTokens(user);
  }

  @Transactional
  public void revokeAllUserRefreshTokens(User user) {
    var active = refreshTokenRepository.findAllByUserAndRevokedFalse(user);
    for (var token : active) token.setRevoked(true);
    refreshTokenRepository.saveAll(active);
  }

  @Transactional(readOnly = true)
  public User getUserForRefreshToken(String raw) {
    String id = parse(raw);
    var stored = refreshTokenRepository.findByTokenId(id).orElseThrow(() -> invalid());
    verify(raw, stored);
    return stored.getUser();
  }

  private RefreshToken lockedToken(String raw) {
    String id = parse(raw);
    Long owner = refreshTokenRepository.findOwnerId(id).orElseThrow(() -> invalid());
    // Match account-control lock order: user first, then session rows.
    User user = users.findForKycUpdate(owner).orElseThrow(() -> invalid());
    var stored = refreshTokenRepository.findForUpdate(id).orElseThrow(() -> invalid());
    stored.setUser(user);
    return stored;
  }

  private String parse(String raw) {
    if (raw == null
        || !jwtConfig.validateToken(raw)
        || !"refresh_token".equals(jwtConfig.extractAllClaims(raw).get("type", String.class)))
      throw invalid();
    String id = jwtConfig.extractTokenId(raw);
    if (id == null || id.isBlank()) throw invalid();
    return id;
  }

  private void verify(String raw, RefreshToken token) {
    if (token.isRevoked() || !token.getExpiredAt().isAfter(LocalDateTime.now())) throw invalid();
    if (token.getTokenHash() == null
        || !MessageDigest.isEqual(
            fingerprint(raw).getBytes(StandardCharsets.UTF_8),
            token.getTokenHash().getBytes(StandardCharsets.UTF_8))) throw invalid();
    User user = token.getUser();
    Number version = jwtConfig.extractAllClaims(raw).get("tokenVersion", Number.class);
    if (!user.isEnabled()
        || !user.isAccountNonLocked()
        || user.getUserStatus() == UserStatus.SUSPENDED
        || user.getUserStatus() == UserStatus.BANNED
        || version == null
        || version.longValue() != user.getTokenVersion()) throw invalid();
  }

  private String fingerprint(String raw) {
    try {
      return "sha256:"
          + HexFormat.of()
              .formatHex(
                  MessageDigest.getInstance("SHA-256")
                      .digest(raw.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 unavailable", e);
    }
  }

  private InvalidTokenException invalid() {
    return new InvalidTokenException("Invalid, expired or revoked refresh token");
  }
}
