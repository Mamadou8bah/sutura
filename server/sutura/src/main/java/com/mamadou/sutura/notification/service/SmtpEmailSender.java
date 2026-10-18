package com.mamadou.sutura.notification.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
    prefix = "sutura.notifications.email",
    name = "provider",
    havingValue = "smtp")
public class SmtpEmailSender implements EmailSender {
  private final JavaMailSender sender;
  private final String from;

  public SmtpEmailSender(
      JavaMailSender sender, @Value("${sutura.notifications.email.from}") String from) {
    this.sender = sender;
    this.from = from;
  }

  @Override
  public void send(String email, String subject, String body) {
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(from);
    message.setTo(email);
    message.setSubject(subject);
    message.setText(body);
    sender.send(message);
  }
}
