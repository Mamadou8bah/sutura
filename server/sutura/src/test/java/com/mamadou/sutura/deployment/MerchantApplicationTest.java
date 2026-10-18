package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import com.mamadou.sutura.kyc.entity.KycVerification;
import com.mamadou.sutura.kyc.onboarding.KycOnboardingRepository;
import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import com.mamadou.sutura.merchant.entity.MerchantProfile;
import com.mamadou.sutura.merchant.enums.*;
import com.mamadou.sutura.merchant.repository.MerchantProfileRepository;
import com.mamadou.sutura.merchant.service.MerchantApplicationService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MerchantApplicationTest {
  @Autowired com.mamadou.sutura.wallet.service.WalletService wallets;
  @Autowired MerchantApplicationService service;
  @Autowired MerchantProfileRepository profiles;
  @Autowired UserRepository users;
  @Autowired KycVerificationRepository verification;
  @Autowired KycOnboardingRepository jobs;

  @Test
  void correctionResubmitsWithoutActivatingAccountAndInvalidatesChangedIdentity() {
    var profile = profile();
    var user = profile.getUser();
    var record = new KycVerification();
    record.setUserId(user.getId());
    record.setSentinelSessionId(42L);
    record.setExternalCustomerId(Long.toString(user.getId()));
    record.setStatus("VERIFIED");
    record.setHostedUrl("https://identity.example.invalid/test");
    record.setExpiresAt(java.time.Instant.now().plusSeconds(600));
    record.setUpdatedAt(java.time.Instant.now());
    verification.saveAndFlush(record);
    var changed = service.resubmit(user.getId(), correction("Corrected"));
    assertEquals("PENDING_REVIEW", changed.status());
    assertEquals("PENDING_REVIEW", changed.userStatus());
    assertFalse(verification.existsById(user.getId()));
    assertEquals("PENDING", jobs.findById(user.getId()).orElseThrow().getStatus());
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () -> service.resubmit(user.getId(), correction("Other")));
  }

  @Test
  void currentStatusReflectsAdminApprovalAndApprovedApplicationCannotBeResubmitted() {
    var profile = profile();
    var user = profile.getUser();
    user.setUserStatus(UserStatus.ACTIVE);
    users.saveAndFlush(user);
    profile.setVerificationStatus(MerchantVerificationStatus.APPROVED);
    profiles.saveAndFlush(profile);
    var status = service.status(user.getId());
    assertEquals("APPROVED", status.status());
    assertEquals("ACTIVE", status.userStatus());
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () -> service.resubmit(user.getId(), correction("Another")));
  }

  @Test
  void approvedMerchantGetsOneLedgerLinkedCollectionsWallet() {
    var profile = profile();
    var user = profile.getUser();
    user.setUserStatus(UserStatus.ACTIVE);
    users.saveAndFlush(user);
    var first = wallets.ensureMerchantCollectionsWallet(user.getId());
    var again = wallets.ensureMerchantCollectionsWallet(user.getId());
    assertEquals(first.getId(), again.getId());
    assertEquals("GMD", first.getCurrency());
    assertNotNull(first.getLedgerAccountCode());
  }

  private MerchantProfile profile() {
    var user =
        users.saveAndFlush(
            User.builder()
                .firstName("Original")
                .lastName("Owner")
                .email(java.util.UUID.randomUUID() + "@example.invalid")
                .phoneNumber("+" + System.nanoTime())
                .passwordHash("unused")
                .role(Role.MERCHANT)
                .userStatus(UserStatus.PENDING_REVIEW)
                .enabled(true)
                .build());
    return profiles.saveAndFlush(
        MerchantProfile.builder()
            .user(user)
            .businessName("Test business")
            .category(MerchantBusinessCategory.RETAIL_SHOP)
            .region(GambiaRegion.KANIFING)
            .cityOrArea("Serekunda")
            .streetAddress("Test address")
            .ownerIdType(MerchantIdType.GAMBIAN_NATIONAL_ID)
            .ownerIdNumber("TEST123")
            .verificationStatus(MerchantVerificationStatus.MORE_INFO_REQUIRED)
            .rejectionReason("Correct owner details")
            .build());
  }

  private MerchantApplicationService.Correction correction(String first) {
    return new MerchantApplicationService.Correction(
        "Test business",
        null,
        MerchantBusinessCategory.RETAIL_SHOP,
        GambiaRegion.KANIFING,
        "Serekunda",
        "Test address",
        null,
        first,
        "Owner",
        MerchantIdType.GAMBIAN_NATIONAL_ID,
        "TEST456",
        "Corrected requested details");
  }
}
