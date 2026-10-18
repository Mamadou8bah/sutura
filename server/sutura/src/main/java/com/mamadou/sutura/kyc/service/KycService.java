package com.mamadou.sutura.kyc.service;

import com.mamadou.sutura.auth.service.CurrentUserService;
import com.mamadou.sutura.kyc.client.SentinelKycClient;
import com.mamadou.sutura.kyc.dto.*;
import com.mamadou.sutura.kyc.entity.KycVerification;
import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class KycService {
  private final CurrentUserService currentUserService;
  private final UserRepository userRepository;
  private final KycVerificationRepository repository;
  private final SentinelKycClient client;

  @Transactional(readOnly = true)
  public KycStatusResponse status() {
    return KycStatusResponse.from(repository.findById(requireUser().getId()).orElse(null));
  }

  @Transactional
  public KycStatusResponse start() {
    User user = lockUser();
    return startLocked(user);
  }

  /** Internal onboarding entry; no caller-supplied identity is accepted over HTTP. */
  @Transactional(noRollbackFor = ResponseStatusException.class)
  public KycStatusResponse startForOnboarding(Long userId) {
    User user =
        userRepository
            .findForKycUpdate(userId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    if (user.getRole() != Role.USER
        && user.getRole() != Role.MERCHANT
        && user.getRole() != Role.DEVELOPER)
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "This account does not support identity onboarding");
    return startLocked(user);
  }

  private KycStatusResponse startLocked(User user) {
    var current = repository.findById(user.getId()).orElse(null);
    if (current != null
        && ("VERIFIED".equals(current.getStatus())
            || "FLAGGED".equals(current.getStatus())
            || ("PENDING".equals(current.getStatus())
                && current.getExpiresAt().isAfter(Instant.now())))) {
      return KycStatusResponse.from(current);
    }
    try {
      var response = client.start(Long.toString(user.getId()));
      KycVerification record = current == null ? new KycVerification() : current;
      record.setUserId(user.getId());
      return apply(record, response);
    } catch (RestClientException e) {
      log.warn("Sentinel KYC session creation unavailable or invalid for user {}", user.getId());
      throw unavailable();
    }
  }

  @Transactional
  public KycStatusResponse refresh() {
    User user = lockUser();
    var record =
        repository
            .findById(user.getId())
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Start identity verification first"));
    try {
      return apply(record, client.get(record.getSentinelSessionId(), Long.toString(user.getId())));
    } catch (RestClientException e) {
      log.warn(
          "Sentinel KYC refresh unavailable or invalid for user {}, session {}",
          user.getId(),
          record.getSentinelSessionId());
      throw unavailable();
    }
  }

  private KycStatusResponse apply(KycVerification record, SentinelKycResponse response) {
    record.setSentinelSessionId(response.sessionId());
    record.setExternalCustomerId(response.externalCustomerId());
    record.setSentinelCustomerId(response.customerId());
    record.setStatus("COMPLETE".equals(response.status()) ? response.kycStatus() : "PENDING");
    record.setHostedUrl(response.hostedUrl());
    record.setExplanation(response.explanation());
    record.setExpiresAt(response.expiresAt());
    record.setUpdatedAt(Instant.now());
    return KycStatusResponse.from(repository.save(record));
  }

  @Transactional
  public void refreshFromCallback(Long userId, Long sessionId) {
    userRepository
        .findForKycUpdate(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    var record =
        repository
            .findById(userId)
            .orElseThrow(
                () ->
                    new ResponseStatusException(HttpStatus.CONFLICT, "KYC session not stored yet"));
    // A delayed callback from an older session must not overwrite the latest one.
    if (!sessionId.equals(record.getSentinelSessionId())) return;
    try {
      apply(record, client.get(sessionId, Long.toString(userId)));
    } catch (RestClientException e) {
      throw unavailable();
    }
  }

  private User lockUser() {
    return userRepository
        .findForKycUpdate(requireUser().getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
  }

  private User requireUser() {
    User user = currentUserService.getCurrentUser();
    if (user == null)
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to verify your identity");
    if (user.getRole() != Role.USER
        && user.getRole() != Role.MERCHANT
        && user.getRole() != Role.DEVELOPER) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Identity verification is for customer, merchant and developer account owners");
    }
    return user;
  }

  private ResponseStatusException unavailable() {
    return new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "Identity verification is temporarily unavailable. Your verification status has not"
            + " changed.");
  }
}
