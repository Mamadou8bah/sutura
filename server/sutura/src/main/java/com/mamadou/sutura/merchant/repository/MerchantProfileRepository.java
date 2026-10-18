package com.mamadou.sutura.merchant.repository;

import com.mamadou.sutura.merchant.entity.MerchantProfile;
import com.mamadou.sutura.merchant.enums.MerchantVerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MerchantProfileRepository extends JpaRepository<MerchantProfile, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from MerchantProfile m where m.id = :id")
    Optional<MerchantProfile> findForReview(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from MerchantProfile m where m.user.id = :userId")
    Optional<MerchantProfile> findForOwnerUpdate(@org.springframework.data.repository.query.Param("userId") Long userId);
    Optional<MerchantProfile> findByUserId(Long userId);
    List<MerchantProfile> findByVerificationStatusOrderBySubmittedAtDesc(MerchantVerificationStatus status);
}
