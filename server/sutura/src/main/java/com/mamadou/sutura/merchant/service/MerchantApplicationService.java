package com.mamadou.sutura.merchant.service;

import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.kyc.onboarding.KycOnboardingService;
import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import com.mamadou.sutura.merchant.entity.MerchantProfile;
import com.mamadou.sutura.merchant.enums.*;
import com.mamadou.sutura.merchant.repository.MerchantProfileRepository;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MerchantApplicationService {
  private final MerchantProfileRepository profiles;
  private final UserRepository users;
  private final KycVerificationRepository verification;
  private final KycOnboardingService onboarding;
  private final AuditLogRepository audit;

  public record Application(
      String businessName,
      String tradingName,
      String category,
      String region,
      String cityOrArea,
      String streetAddress,
      String businessRegistrationNumber,
      String firstName,
      String lastName,
      String ownerIdType,
      String ownerIdNumber,
      String status,
      String userStatus,
      String reviewReason,
      LocalDateTime submittedAt) {}

  public record Correction(
      @NotBlank @Size(max = 120) String businessName,
      @Size(max = 120) String tradingName,
      @NotNull MerchantBusinessCategory category,
      @NotNull GambiaRegion region,
      @NotBlank @Size(max = 80) String cityOrArea,
      @NotBlank @Size(max = 255) String streetAddress,
      @Size(max = 60) String businessRegistrationNumber,
      @NotBlank @Size(max = 100) String firstName,
      @NotBlank @Size(max = 100) String lastName,
      @NotNull MerchantIdType ownerIdType,
      @NotBlank @Size(max = 40) String ownerIdNumber,
      @NotBlank @Size(max = 1000) String explanation) {}

  @Transactional(readOnly = true)
  public Application status(long id) {
    return view(
        profiles
            .findByUserId(id)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Merchant application not found")));
  }

  @Transactional
  public Application resubmit(long id, Correction c) {
    // Lock before hydrating the profile, preserving the administrative profile -> user order.
    var profile =
        profiles
            .findForOwnerUpdate(id)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Merchant application not found"));
    var user = users.findForKycUpdate(id).orElseThrow();
    if (user.getRole() != Role.MERCHANT
        || !user.isEnabled()
        || user.getUserStatus() != UserStatus.PENDING_REVIEW)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Only a pending merchant account can resubmit an application");
    var before = profile.getVerificationStatus();
    if (before != MerchantVerificationStatus.REJECTED
        && before != MerchantVerificationStatus.MORE_INFO_REQUIRED)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Only rejected applications or requested corrections can be resubmitted");
    boolean identityChanged =
        !c.firstName().trim().equals(user.getFirstName())
            || !c.lastName().trim().equals(user.getLastName())
            || c.ownerIdType() != profile.getOwnerIdType()
            || !c.ownerIdNumber().trim().equals(profile.getOwnerIdNumber());
    profile.setBusinessName(c.businessName().trim());
    profile.setTradingName(clean(c.tradingName()));
    profile.setCategory(c.category());
    profile.setRegion(c.region());
    profile.setCityOrArea(c.cityOrArea().trim());
    profile.setStreetAddress(c.streetAddress().trim());
    profile.setBusinessRegistrationNumber(clean(c.businessRegistrationNumber()));
    profile.setOwnerIdType(c.ownerIdType());
    profile.setOwnerIdNumber(c.ownerIdNumber().trim());
    user.setFirstName(c.firstName().trim());
    user.setLastName(c.lastName().trim());
    users.save(user);
    if (identityChanged) {
      verification.deleteById(id);
      onboarding.restart(user);
    }
    profile.setVerificationStatus(MerchantVerificationStatus.PENDING_REVIEW);
    profile.setRejectionReason(null);
    profile.setReviewedAt(null);
    profile.setSubmittedAt(LocalDateTime.now());
    profiles.save(profile);
    audit.save(
        AuditLog.builder()
            .actorId(id)
            .actorEmail(user.getEmail())
            .actionType("MERCHANT_RESUBMITTED")
            .entityType("MERCHANT")
            .entityId(profile.getId())
            .previousState(before.name())
            .newState("PENDING_REVIEW")
            .changeDescription(
                c.explanation().trim()
                    + (identityChanged ? "; owner identity changed, verification restarted" : ""))
            .timestamp(LocalDateTime.now())
            .success(true)
            .build());
    return view(profile);
  }

  private String clean(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private Application view(MerchantProfile p) {
    var u = p.getUser();
    return new Application(
        p.getBusinessName(),
        p.getTradingName(),
        p.getCategory().name(),
        p.getRegion().name(),
        p.getCityOrArea(),
        p.getStreetAddress(),
        p.getBusinessRegistrationNumber(),
        u.getFirstName(),
        u.getLastName(),
        p.getOwnerIdType().name(),
        p.getOwnerIdNumber(),
        p.getVerificationStatus().name(),
        u.getUserStatus().name(),
        p.getRejectionReason(),
        p.getSubmittedAt());
  }
}
