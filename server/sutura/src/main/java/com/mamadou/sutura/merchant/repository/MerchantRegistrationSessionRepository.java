package com.mamadou.sutura.merchant.repository;

import com.mamadou.sutura.merchant.entity.MerchantRegistrationSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MerchantRegistrationSessionRepository extends JpaRepository<MerchantRegistrationSession, String> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select s from MerchantRegistrationSession s where s.token = :token")
    Optional<MerchantRegistrationSession> findForUpdate(@org.springframework.data.repository.query.Param("token") String token);
    Optional<MerchantRegistrationSession> findByPhoneNumber(String phoneNumber);
}
