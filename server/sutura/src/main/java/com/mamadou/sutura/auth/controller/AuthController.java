package com.mamadou.sutura.auth.controller;

import com.mamadou.sutura.auth.dto.APIKeyCreateRequest;
import com.mamadou.sutura.auth.dto.ApiKeyResponse;
import com.mamadou.sutura.auth.dto.AuthResponse;
import com.mamadou.sutura.auth.dto.LoginRequest;
import com.mamadou.sutura.auth.dto.LogoutRequest;
import com.mamadou.sutura.auth.dto.RefreshTokenRequest;
import com.mamadou.sutura.auth.dto.RefreshTokenResponse;
import com.mamadou.sutura.auth.dto.RegisterRequest;
import com.mamadou.sutura.auth.service.APIKeyService;
import com.mamadou.sutura.auth.service.AuthService;
import com.mamadou.sutura.common.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;
  private final APIKeyService apiKeyService;

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
    return new ApiResponse<>(true, "Registered successfully", authService.register(request));
  }

  @PostMapping("/login")
  public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    AuthResponse response = authService.login(request);
    String message = response.twoFactorRequired() ? "2FA code required" : "Logged in successfully";
    return new ApiResponse<>(true, message, response);
  }

  @PostMapping("/refresh")
  public ApiResponse<RefreshTokenResponse> refresh(
      @Valid @RequestBody RefreshTokenRequest request) {
    return new ApiResponse<>(true, "Access token refreshed", authService.refresh(request));
  }

  @PostMapping("/logout")
  public ApiResponse<String> logout(@Valid @RequestBody LogoutRequest request) {
    return new ApiResponse<>(true, authService.logout(request), null);
  }

  @GetMapping("/api-keys")
  public ApiResponse<List<ApiKeyResponse>> listApiKeys() {
    return new ApiResponse<>(true, "API keys", apiKeyService.listApiKeys());
  }

  @PostMapping("/api-keys")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<ApiKeyResponse> createApiKey(@Valid @RequestBody APIKeyCreateRequest request) {
    return new ApiResponse<>(true, "API key created", apiKeyService.createApiKey(request));
  }

  @PatchMapping("/api-keys")
  public ApiResponse<ApiKeyResponse> updateApiKey(@Valid @RequestBody APIKeyCreateRequest request) {
    return new ApiResponse<>(true, "API key updated", apiKeyService.updateApiKey(request));
  }

  @PostMapping("/api-keys/revoke")
  public ApiResponse<String> revokeApiKey(@RequestHeader("X-Api-Key") String apiKey) {
    return new ApiResponse<>(true, apiKeyService.revokeApiKey(apiKey), null);
  }

  @PostMapping("/api-keys/{publicId}/revoke")
  public ApiResponse<String> revokeOwnedKey(
      @org.springframework.web.bind.annotation.PathVariable String publicId) {
    return ApiResponse.success("API key revoked", apiKeyService.revokeOwnedPublicId(publicId));
  }

  @DeleteMapping("/api-keys")
  public ApiResponse<String> deleteApiKey(@RequestHeader("X-Api-Key") String apiKey) {
    return new ApiResponse<>(true, apiKeyService.deleteApiKey(apiKey), null);
  }
}
