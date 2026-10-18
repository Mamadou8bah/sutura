package com.mamadou.sutura.auth.recovery;

import com.mamadou.sutura.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/recovery")
@RequiredArgsConstructor
public class PasswordRecoveryController {
  private final PasswordRecoveryService service;

  public record Request(@NotBlank @Size(max = 254) String identifier) {}

  public record Started(String requestId) {}

  public record Confirm(
      @NotBlank @Size(max = 36) String requestId,
      @NotBlank @Pattern(regexp = "[0-9]{6}") String code,
      @NotBlank @Size(min = 12, max = 72) String newPassword) {}

  @PostMapping("/request")
  public ApiResponse<Started> request(@Valid @RequestBody Request request) {
    return ApiResponse.success(
        "If the account is eligible, a recovery code has been sent",
        new Started(service.request(request.identifier())));
  }

  @PostMapping("/confirm")
  public ApiResponse<Void> confirm(@Valid @RequestBody Confirm request) {
    service.confirm(request.requestId(), request.code(), request.newPassword());
    return ApiResponse.success("Password changed. Sign in again.", null);
  }
}
