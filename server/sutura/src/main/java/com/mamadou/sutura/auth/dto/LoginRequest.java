package com.mamadou.sutura.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank @jakarta.validation.constraints.Size(max = 254) String username,
    @NotBlank @jakarta.validation.constraints.Size(max = 72) String password,
    @jakarta.validation.constraints.Size(max = 36) String twoFactorChallengeId,
    @jakarta.validation.constraints.Pattern(regexp = "[0-9]{6}") String twoFactorCode) {}
