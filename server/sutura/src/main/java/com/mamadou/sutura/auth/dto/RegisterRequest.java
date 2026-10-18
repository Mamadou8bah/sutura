package com.mamadou.sutura.auth.dto;

import com.mamadou.sutura.user.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Size(max = 100) String firstName,
    @NotBlank @Size(max = 100) String lastName,
    @NotBlank @jakarta.validation.constraints.Pattern(regexp = "\\+[1-9][0-9]{7,14}")
        String phoneNumber,
    @Email @Size(max = 254) String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    Role role,
    boolean twoFactorEnabled) {}
