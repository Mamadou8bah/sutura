package com.mamadou.sutura.webhook.repository;

import com.mamadou.sutura.webhook.entity.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {
    Optional<WebhookEvent> findByProviderAndExternalEventId(String provider, String externalEventId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from WebhookEvent e where e.id = :id")
    Optional<WebhookEvent> findForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Query("select e.id from WebhookEvent e where e.provider='MODEMPAY_NATIVE' and e.status in ('RECEIVED','RETRY') and e.nextAttemptAt <= CURRENT_TIMESTAMP order by e.nextAttemptAt, e.id")
    java.util.List<Long> findNativeReady(org.springframework.data.domain.Pageable page);
}
