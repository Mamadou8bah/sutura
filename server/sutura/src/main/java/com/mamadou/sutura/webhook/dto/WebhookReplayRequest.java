package com.mamadou.sutura.webhook.dto;

import jakarta.validation.constraints.NotNull;

public record WebhookReplayRequest(
    @NotNull Long webhookEventId,
    @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 1000)
        String reason) {}
