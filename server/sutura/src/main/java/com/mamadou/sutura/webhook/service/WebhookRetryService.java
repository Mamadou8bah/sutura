package com.mamadou.sutura.webhook.service;

import com.mamadou.sutura.webhook.dto.WebhookResponse;
import com.mamadou.sutura.webhook.entity.WebhookEvent;
import com.mamadou.sutura.webhook.repository.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WebhookRetryService {

  private final WebhookEventRepository webhookEventRepository;
  private final WebhookService webhookService;
  private final com.mamadou.sutura.audit.repository.AuditLogRepository audit;

  @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public WebhookResponse replay(
      Long webhookEventId, String reason, com.mamadou.sutura.user.entity.User actor) {
    if (actor == null || actor.getRole() != com.mamadou.sutura.user.enums.Role.ADMIN)
      throw new org.springframework.security.access.AccessDeniedException("Admin account required");
    if (reason == null || reason.isBlank() || reason.length() > 1000)
      throw new IllegalArgumentException("Enter a replay reason (up to 1000 characters)");
    WebhookEvent event =
        webhookEventRepository
            .findById(webhookEventId)
            .orElseThrow(() -> new IllegalArgumentException("Webhook event not found"));

    if ("PROCESSED".equals(event.getStatus()) || "IGNORED".equals(event.getStatus())) {
      return new WebhookResponse(true, event.getId(), event.getStatus(), "Webhook already handled");
    }
    if ("SIGNATURE_FAILED".equals(event.getStatus())) {
      return new WebhookResponse(
          false, event.getId(), event.getStatus(), "Cannot replay a signature-failed webhook");
    }

    var result = webhookService.processStoredEvent(event);
    audit.save(
        com.mamadou.sutura.audit.entity.AuditLog.builder()
            .actorId(actor.getId())
            .actorEmail(actor.getEmail() == null ? actor.getPhoneNumber() : actor.getEmail())
            .actionType("WEBHOOK_REPLAY")
            .entityType("WEBHOOK_EVENT")
            .entityId(webhookEventId)
            .changeDescription(reason.trim())
            .newState(result.status())
            .success(result.accepted())
            .timestamp(java.time.LocalDateTime.now())
            .build());
    return result;
  }
}
