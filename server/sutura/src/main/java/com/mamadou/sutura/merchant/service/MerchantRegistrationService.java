package com.mamadou.sutura.merchant.service;

import com.mamadou.sutura.auth.dto.AuthResponse;
import com.mamadou.sutura.auth.mapper.AuthMapper;
import com.mamadou.sutura.auth.service.RefreshTokenService;
import com.mamadou.sutura.common.Exception.ProfileAlreadyExistException;
import com.mamadou.sutura.merchant.dto.*;
import com.mamadou.sutura.merchant.entity.MerchantProfile;
import com.mamadou.sutura.merchant.entity.MerchantRegistrationSession;
import com.mamadou.sutura.merchant.enums.MerchantVerificationStatus;
import com.mamadou.sutura.merchant.repository.MerchantProfileRepository;
import com.mamadou.sutura.merchant.repository.MerchantRegistrationSessionRepository;
import com.mamadou.sutura.notification.service.SmsSender;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MerchantRegistrationService {

    private static final long ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
    private static final int SESSION_HOURS = 24;

    private final MerchantRegistrationSessionRepository sessionRepository;
    private final MerchantProfileRepository merchantProfileRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SmsSender smsSender;
    private final com.mamadou.sutura.common.ratelimit.DistributedRateLimiter otpLimits;
    private final RefreshTokenService refreshTokenService;
    private final AuthMapper authMapper;
    private final com.mamadou.sutura.kyc.onboarding.KycOnboardingService onboarding;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public MerchantRegistrationStepResponse startPhoneVerification(MerchantPhoneRequest request) {
        String phone = normalizeGambianPhone(request.phoneNumber());
        if (userRepository.existsByPhoneNumber(phone)) {
            throw new ProfileAlreadyExistException("This phone number is already registered");
        }

        if(!otpLimits.tryConsume("merchant-otp:"+otpPhoneHash(phone),3,java.time.Duration.ofMinutes(10)))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,"Too many verification codes requested. Please wait before retrying.");
        String code = String.format("%06d", secureRandom.nextInt(1_000_000));
        String token = UUID.randomUUID().toString();

        MerchantRegistrationSession session = MerchantRegistrationSession.builder()
                .token(token)
                .phoneNumber(phone)
                .phoneVerified(false)
                .otpHash(passwordEncoder.encode(code))
                .otpExpiresAt(LocalDateTime.now().plusMinutes(10))
                .stage(1)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(SESSION_HOURS))
                .build();

        sessionRepository.save(session);
        smsSender.send(phone, "Your Sutura merchant verification code is " + code + ". Valid for 10 minutes.");
        log.info("Merchant registration OTP dispatched");

        return new MerchantRegistrationStepResponse(
                token,
                1,
                "We sent a 6-digit code to your phone. Enter it to continue.",
                session.getExpiresAt()
        );
    }

    @Transactional(noRollbackFor=IllegalArgumentException.class)
    public MerchantRegistrationStepResponse verifyPhone(MerchantVerifyPhoneRequest request) {
        MerchantRegistrationSession session = requireSession(request.registrationToken());
        ensureNotExpired(session);

        if (session.getOtpExpiresAt() == null || session.getOtpExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Verification code expired. Request a new code.");
        }
        if(session.isPhoneVerified()||session.getFailedVerificationAttempts()>=5||session.getOtpHash()==null)throw new IllegalArgumentException("Verification session cannot be reused. Request a new code.");
        if (!passwordEncoder.matches(request.code(), session.getOtpHash())) {
            session.setFailedVerificationAttempts(session.getFailedVerificationAttempts()+1);
            if(session.getFailedVerificationAttempts()>=5){session.setOtpHash(null);session.setOtpExpiresAt(null);}
            sessionRepository.save(session);
            throw new IllegalArgumentException("Invalid verification code");
        }

        session.setPhoneVerified(true);
        session.setOtpHash(null);
        session.setOtpExpiresAt(null);
        session.setStage(2);
        sessionRepository.save(session);

        return new MerchantRegistrationStepResponse(
                session.getToken(),
                2,
                "Phone verified. Tell us about your business.",
                session.getExpiresAt()
        );
    }

    @Transactional
    public MerchantRegistrationStepResponse saveBusiness(MerchantBusinessRequest request) {
        MerchantRegistrationSession session = requireVerifiedSession(request.registrationToken(), 2);

        session.setBusinessName(request.businessName().trim());
        session.setTradingName(blankToNull(request.tradingName()));
        session.setCategory(request.category());
        session.setRegion(request.region());
        session.setCityOrArea(request.cityOrArea().trim());
        session.setStreetAddress(request.streetAddress().trim());
        session.setBusinessRegistrationNumber(blankToNull(request.businessRegistrationNumber()));
        session.setStage(3);
        sessionRepository.save(session);

        return new MerchantRegistrationStepResponse(
                session.getToken(),
                3,
                "Business details saved. Now verify the business owner.",
                session.getExpiresAt()
        );
    }

    @Transactional
    public MerchantRegistrationStepResponse saveOwner(MerchantOwnerRequest request) {
        MerchantRegistrationSession session = requireVerifiedSession(request.registrationToken(), 3);

        session.setFirstName(request.firstName().trim());
        session.setLastName(request.lastName().trim());
        session.setOwnerIdType(request.ownerIdType());
        session.setOwnerIdNumber(request.ownerIdNumber().trim());
        session.setStage(4);
        sessionRepository.save(session);

        return new MerchantRegistrationStepResponse(
                session.getToken(),
                4,
                "Owner details saved. Create your login credentials.",
                session.getExpiresAt()
        );
    }

    @Transactional
    public MerchantRegistrationCompleteResponse complete(MerchantCompleteRequest request) {
        if (!request.passwordsMatch()) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        MerchantRegistrationSession session = requireVerifiedSession(request.registrationToken(), 4);
        if (userRepository.existsByPhoneNumber(session.getPhoneNumber())) {
            throw new ProfileAlreadyExistException("This phone number is already registered");
        }
        if (userRepository.existsByEmail(request.email().trim())) {
            throw new ProfileAlreadyExistException("This email is already registered");
        }

        User user = User.builder()
                .firstName(session.getFirstName())
                .lastName(session.getLastName())
                .phoneNumber(session.getPhoneNumber())
                .email(request.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .enabled(true)
                .registrationStage(4)
                .userStatus(UserStatus.PENDING_REVIEW)
                .phoneVerified(true)
                .lastLoginAt(LocalDateTime.now())
                .failedLoginAttempts(0)
                .twoFactorEnabled(false)
                .role(Role.MERCHANT)
                .build();
        user = userRepository.save(user);

        MerchantProfile profile = MerchantProfile.builder()
                .user(user)
                .businessName(session.getBusinessName())
                .tradingName(session.getTradingName())
                .category(session.getCategory())
                .region(session.getRegion())
                .cityOrArea(session.getCityOrArea())
                .streetAddress(session.getStreetAddress())
                .businessRegistrationNumber(session.getBusinessRegistrationNumber())
                .ownerIdType(session.getOwnerIdType())
                .ownerIdNumber(session.getOwnerIdNumber())
                .verificationStatus(MerchantVerificationStatus.PENDING_REVIEW)
                .submittedAt(LocalDateTime.now())
                .build();
        merchantProfileRepository.save(profile);
        onboarding.enqueue(user);

        sessionRepository.delete(session);

        String refreshToken = refreshTokenService.generateRefreshToken(user);
        String accessToken = refreshTokenService.generateAccessToken(user);
        AuthResponse auth = authMapper.authenticated(user, accessToken, refreshToken, refreshTokenService.accessTokenTtlSeconds());

        return new MerchantRegistrationCompleteResponse(
                auth,
                profile.getBusinessName(),
                profile.getVerificationStatus().name(),
                "Your application has been submitted. Our team typically reviews Gambian merchant accounts within 1–2 business days."
        );
    }

    private MerchantRegistrationSession requireSession(String token) {
        return sessionRepository.findForUpdate(token)
                .orElseThrow(() -> new IllegalArgumentException("Registration session not found or expired"));
    }

    private MerchantRegistrationSession requireVerifiedSession(String token, int expectedStage) {
        MerchantRegistrationSession session = requireSession(token);
        ensureNotExpired(session);
        if (!session.isPhoneVerified()) {
            throw new IllegalArgumentException("Phone number must be verified first");
        }
        if (session.getStage() < expectedStage) {
            throw new IllegalArgumentException("Complete the previous step first");
        }
        return session;
    }

    private void ensureNotExpired(MerchantRegistrationSession session) {
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            sessionRepository.delete(session);
            throw new IllegalArgumentException("Registration session expired. Please start again.");
        }
    }

    static String normalizeGambianPhone(String input) {
        String digits = input.replaceAll("\\s+", "");
        if (digits.startsWith("+220")) {
            return digits;
        }
        if (digits.startsWith("220") && digits.length() == 10) {
            return "+" + digits;
        }
        if (digits.matches("^[235679]\\d{6}$")) {
            return "+220" + digits;
        }
        return digits;
    }

    private String otpPhoneHash(String phone){try{return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(phone.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException("SHA-256 unavailable",e);}}

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
