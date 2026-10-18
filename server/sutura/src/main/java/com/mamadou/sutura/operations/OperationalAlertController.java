package com.mamadou.sutura.operations;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.user.entity.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/admin/alerts")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class OperationalAlertController {
  private final OperationalAlertRepository repository;
  private final AuditLogRepository audit;

  public record Summary(
      Long id,
      String eventKey,
      String subject,
      String status,
      int attempts,
      LocalDateTime createdAt,
      LocalDateTime nextAttemptAt,
      LocalDateTime sentAt,
      String failureType) {}

  @GetMapping
  @Transactional(readOnly = true)
  public Page<Summary> list(@RequestParam(defaultValue = "0") int page) {
    if (page < 0 || page > 100000)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page");
    return repository
        .findAll(PageRequest.of(page, 50, Sort.by(Sort.Direction.DESC, "id")))
        .map(
            a ->
                new Summary(
                    a.getId(),
                    a.getEventKey(),
                    a.getSubject(),
                    a.getStatus(),
                    a.getAttempts(),
                    a.getCreatedAt(),
                    a.getNextAttemptAt(),
                    a.getSentAt(),
                    a.getFailureType()));
  }

  @GetMapping("/counts")
  public Map<String, Long> counts() {
    return Map.of(
        "pending",
        repository.countByStatus("PENDING"),
        "failed",
        repository.countByStatus("FAILED"));
  }

  public record Retry(@NotBlank @Size(max = 1000) String reason) {}

  @PostMapping("/{id}/retry")
  @Transactional
  public Map<String, String> retry(
      @PathVariable Long id,
      @Valid @RequestBody Retry request,
      @AuthenticationPrincipal User actor) {
    if (actor == null || actor.getRole() != com.mamadou.sutura.user.enums.Role.ADMIN)
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin account required");
    var alert =
        repository
            .findForDelivery(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found"));
    if (!"FAILED".equals(alert.getStatus()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Only failed alerts can be retried");
    alert.setStatus("PENDING");
    alert.setAttempts(0);
    alert.setNextAttemptAt(LocalDateTime.now());
    repository.save(alert);
    audit.save(
        AuditLog.builder()
            .actorId(actor.getId())
            .actorEmail(actor.getEmail() == null ? actor.getPhoneNumber() : actor.getEmail())
            .actionType("ALERT_RETRY")
            .entityType("OPERATIONAL_ALERT")
            .entityId(id)
            .previousState("FAILED")
            .newState("PENDING")
            .changeDescription(request.reason().trim())
            .timestamp(LocalDateTime.now())
            .success(true)
            .build());
    return Map.of("status", "PENDING");
  }
}
