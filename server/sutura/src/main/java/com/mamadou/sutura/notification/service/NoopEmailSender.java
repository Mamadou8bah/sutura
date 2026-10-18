package com.mamadou.sutura.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(prefix="sutura.notifications.email",name="provider",havingValue="noop",matchIfMissing=true)
public class NoopEmailSender implements EmailSender {

    @Value("${sutura.notifications.email.from:no-reply@sutura.local}")
    private String fromAddress;

    @Override
    public void send(String email, String subject, String body) {
        log.warn("Email provider is noop; message not delivered");
    }
}
