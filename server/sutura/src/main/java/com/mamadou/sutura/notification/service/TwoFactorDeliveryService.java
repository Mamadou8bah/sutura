package com.mamadou.sutura.notification.service;

import com.mamadou.sutura.common.Exception.InvalidTokenException;
import com.mamadou.sutura.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TwoFactorDeliveryService {
    private final EmailSender emailSender;

    public void sendCode(User user, String code) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new InvalidTokenException("An email address is required for login verification. Contact support to add one to your account.");
        }
        emailSender.send(user.getEmail(), "Your Sutura verification code",
                "Your Sutura verification code is " + code + ". It expires in 5 minutes.");
    }
}
