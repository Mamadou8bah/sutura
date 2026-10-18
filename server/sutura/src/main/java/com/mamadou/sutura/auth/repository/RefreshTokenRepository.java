package com.mamadou.sutura.auth.repository;

import com.mamadou.sutura.auth.entity.RefreshToken;
import com.mamadou.sutura.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

  Optional<RefreshToken> findByTokenId(String tokenId);

  @org.springframework.data.jpa.repository.Query(
      "select t.user.id from RefreshToken t where t.tokenId = :tokenId")
  Optional<Long> findOwnerId(
      @org.springframework.data.repository.query.Param("tokenId") String tokenId);

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query(
      "select t from RefreshToken t where t.tokenId = :tokenId")
  Optional<RefreshToken> findForUpdate(
      @org.springframework.data.repository.query.Param("tokenId") String tokenId);

  List<RefreshToken> findAllByUserAndRevokedFalse(User user);
}
