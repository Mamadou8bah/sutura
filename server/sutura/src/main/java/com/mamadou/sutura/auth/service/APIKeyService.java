package com.mamadou.sutura.auth.service;

import com.mamadou.sutura.auth.dto.APIKeyCreateRequest;
import com.mamadou.sutura.auth.dto.ApiKeyResponse;
import com.mamadou.sutura.auth.entity.APIKey;
import com.mamadou.sutura.auth.repository.APIKeyRepository;
import com.mamadou.sutura.common.Exception.APIKeyNotFoundException;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.scrypt.SCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class APIKeyService {

  private final SecureRandom secureRandom = new SecureRandom();
  private final APIKeyRepository apiKeyRepository;
  private final SCryptPasswordEncoder passwordEncoder;
  private final UserRepository userRepository;

  @Transactional
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DEVELOPER','MERCHANT')")
  public ApiKeyResponse createApiKey(APIKeyCreateRequest request) {
    User user = currentUser();
    String publicId = generatePublicId();
    String apiToken = publicId + "." + generateSecret();
    var apiKey =
        APIKey.builder()
            .name(request.name())
            .expiresAt(LocalDateTime.now().plusDays(request.expiresInDays()))
            .publicId(publicId)
            .secretHash(passwordEncoder.encode(apiToken))
            .createdAt(LocalDateTime.now())
            .user(user)
            .build();
    apiKeyRepository.save(apiKey);
    return new ApiKeyResponse(
        request.name(), apiKey.getPublicId(), apiKey.getExpiresAt(), apiKey.isRevoked(), apiToken);
  }

  @Transactional
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DEVELOPER','MERCHANT')")
  public ApiKeyResponse updateApiKey(APIKeyCreateRequest request) {
    User user = currentUser();
    APIKey apiKey =
        apiKeyRepository
            .findByName(request.name())
            .filter(key -> key.getUser() != null && key.getUser().getId() == user.getId())
            .orElseThrow(() -> new APIKeyNotFoundException("API key not found"));
    apiKey.setName(request.name());
    apiKeyRepository.save(apiKey);
    return new ApiKeyResponse(
        request.name(), apiKey.getPublicId(), apiKey.getExpiresAt(), apiKey.isRevoked(), null);
  }

  @Transactional(readOnly = true)
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DEVELOPER','MERCHANT')")
  public List<ApiKeyResponse> listApiKeys() {
    User user = currentUser();
    return apiKeyRepository.findByUserId(user.getId()).stream()
        .map(
            key ->
                new ApiKeyResponse(
                    key.getName(), key.getPublicId(), key.getExpiresAt(), key.isRevoked(), null))
        .collect(Collectors.toList());
  }

  @Transactional
  public User authenticate(String apiToken) {
    if (apiToken == null || !apiToken.contains(".")) {
      return null;
    }
    String[] parts = apiToken.split("\\.", 2);
    if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
      return null;
    }

    APIKey key = apiKeyRepository.findByPublicId(parts[0]).orElse(null);
    if (key == null || key.isRevoked()) {
      return null;
    }
    if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(LocalDateTime.now())) {
      return null;
    }
    if (!passwordEncoder.matches(apiToken, key.getSecretHash())) {
      return null;
    }

    User owner = key.getUser();
    if (owner == null
        || (owner.getRole() != com.mamadou.sutura.user.enums.Role.DEVELOPER
            && owner.getRole() != com.mamadou.sutura.user.enums.Role.MERCHANT)
        || !owner.isEnabled()
        || !owner.isAccountNonLocked()
        || owner.getUserStatus() == com.mamadou.sutura.user.enums.UserStatus.SUSPENDED
        || owner.getUserStatus() == com.mamadou.sutura.user.enums.UserStatus.BANNED) return null;
    key.setLastUsedAt(LocalDateTime.now());
    apiKeyRepository.save(key);
    return key.getUser();
  }

  @Transactional
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DEVELOPER','MERCHANT')")
  public String revokeOwnedPublicId(String publicId) {
    User owner = currentUser();
    APIKey key =
        apiKeyRepository
            .findByPublicId(publicId)
            .filter(k -> k.getUser() != null && k.getUser().getId() == owner.getId())
            .orElseThrow(() -> new APIKeyNotFoundException("API key not found"));
    key.setRevoked(true);
    apiKeyRepository.save(key);
    return "API key revoked";
  }

  @Transactional
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DEVELOPER','MERCHANT')")
  public String revokeApiKey(String apiKeyToken) {
    APIKey key = requireOwnedKey(apiKeyToken);
    key.setRevoked(true);
    apiKeyRepository.save(key);
    return key.getName() + " is revoked";
  }

  @Transactional
  @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DEVELOPER','MERCHANT')")
  public String deleteApiKey(String apiKeyToken) {
    APIKey key = requireOwnedKey(apiKeyToken);
    String name = key.getName();
    apiKeyRepository.delete(key);
    return name + " is deleted";
  }

  private APIKey requireOwnedKey(String apiKeyToken) {
    if (apiKeyToken == null || !apiKeyToken.contains(".")) {
      throw new APIKeyNotFoundException("API key not found");
    }
    String[] parts = apiKeyToken.split("\\.", 2);
    User user = currentUser();
    APIKey key =
        apiKeyRepository
            .findByPublicId(parts[0])
            .orElseThrow(() -> new APIKeyNotFoundException("API key not found"));
    if (key.getUser() == null || key.getUser().getId() != user.getId()) {
      throw new APIKeyNotFoundException("API key not found");
    }
    if (!passwordEncoder.matches(apiKeyToken, key.getSecretHash())) {
      throw new APIKeyNotFoundException("API key not found");
    }
    return key;
  }

  private User currentUser() {
    String userName = SecurityContextHolder.getContext().getAuthentication().getName();
    return userRepository
        .findByLoginIdentifier(userName)
        .orElseThrow(() -> new UsernameNotFoundException("Username not found"));
  }

  private String generatePublicId() {
    byte[] bytes = new byte[6];
    secureRandom.nextBytes(bytes);
    return "pf_live_" + bytesToHex(bytes);
  }

  private String generateSecret() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String bytesToHex(byte[] bytes) {
    StringBuilder hex = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
      hex.append(String.format("%02x", b));
    }
    return hex.toString();
  }
}
