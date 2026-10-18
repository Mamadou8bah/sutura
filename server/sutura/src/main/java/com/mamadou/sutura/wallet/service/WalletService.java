package com.mamadou.sutura.wallet.service;

import com.mamadou.sutura.common.Exception.AccountNotFoundException;
import com.mamadou.sutura.ledger.entity.LedgerAccount;
import com.mamadou.sutura.ledger.enums.LedgerAccountType;
import com.mamadou.sutura.ledger.service.LedgerAccountService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.dto.WalletResponse;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.wallet.entity.WalletLimit;
import com.mamadou.sutura.wallet.enums.WalletStatus;
import com.mamadou.sutura.wallet.exception.WalletAlreadyExistsException;
import com.mamadou.sutura.wallet.exception.WalletNotFoundException;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WalletService {

  private final WalletRepository walletRepository;
  private final WalletLimitService walletLimitService;
  private final LedgerAccountService ledgerAccountService;
  private final UserRepository userRepository;

  @Transactional
  public WalletResponse createWallet(String name, String currency) {
    return createForUser(currentUser(), name, currency);
  }

  private WalletResponse createForUser(User currentUser, String name, String currency) {
    String normalizedCurrency = normalizeCurrency(currency);

    if (walletRepository.existsByUserIdAndCurrencyIgnoreCase(
        currentUser.getId(), normalizedCurrency)) {
      throw new WalletAlreadyExistsException("You already have a wallet for " + normalizedCurrency);
    }

    Wallet wallet =
        Wallet.builder()
            .name(resolveWalletName(name, normalizedCurrency))
            .user(currentUser)
            .currency(normalizedCurrency)
            .status(WalletStatus.ACTIVE)
            .build();

    wallet = walletRepository.save(wallet);

    LedgerAccount ledgerAccount =
        ledgerAccountService.createAccountEntity(
            walletLedgerAccountCode(wallet),
            "Wallet liability - " + wallet.getId(),
            LedgerAccountType.LIABILITY,
            normalizedCurrency);
    wallet.setLedgerAccount(ledgerAccount);

    WalletLimit limit = walletLimitService.createDefaultLimit(wallet);
    wallet.setWalletLimit(limit);
    walletRepository.save(wallet);

    return mapToResponse(wallet);
  }

  /** Called by approval in the same transaction; never changes an existing wallet's status. */
  @Transactional
  public WalletResponse ensureMerchantCollectionsWallet(long userId) {
    User merchant =
        userRepository
            .findForKycUpdate(userId)
            .orElseThrow(() -> new AccountNotFoundException("Merchant account not found"));
    if (merchant.getRole() != com.mamadou.sutura.user.enums.Role.MERCHANT
        || merchant.getUserStatus() != com.mamadou.sutura.user.enums.UserStatus.ACTIVE)
      throw new WalletOperationException(
          "Only an approved merchant can receive a collections wallet");
    return walletRepository.findByUserId(userId).stream()
        .filter(w -> "GMD".equalsIgnoreCase(w.getCurrency()))
        .findFirst()
        .map(this::mapToResponse)
        .orElseGet(() -> createForUser(merchant, "Collections", "GMD"));
  }

  @Transactional(readOnly = true)
  public List<WalletResponse> getUserWallets() {
    User currentUser = currentUser();

    return walletRepository.findByUserId(currentUser.getId()).stream()
        .map(this::mapToResponse)
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public WalletResponse getPrimaryWallet(String currency) {
    return mapToResponse(resolvePrimaryWallet(currentUser().getId(), currency));
  }

  @Transactional(readOnly = true)
  public Wallet resolvePrimaryWallet(Long userId, String currency) {
    String normalized = normalizeCurrency(currency);
    if (normalized != null) {
      List<Wallet> wallets = walletRepository.findByUserId(userId);
      Optional<Wallet> match =
          wallets.stream()
              .filter(w -> w.getStatus() == WalletStatus.ACTIVE)
              .filter(w -> w.getCurrency().equalsIgnoreCase(normalized))
              .findFirst();
      if (match.isPresent()) {
        return match.get();
      }
    }
    return walletRepository
        .findFirstByUserIdAndStatusOrderByIdAsc(userId, WalletStatus.ACTIVE)
        .orElseThrow(() -> new WalletNotFoundException("No active wallet found for user"));
  }

  @Transactional(readOnly = true)
  public Wallet getWalletForUser(Long walletId, Long userId) {
    return walletRepository
        .findByIdAndUserId(walletId, userId)
        .orElseThrow(() -> new WalletNotFoundException("Wallet not found"));
  }

  @Transactional(readOnly = true)
  public WalletResponse getWallet(Long walletId) {
    return mapToResponse(getOwnedWallet(walletId));
  }

  @Transactional
  public WalletResponse closeWallet(Long walletId) {
    Wallet wallet = getOwnedWallet(walletId);
    wallet.setStatus(WalletStatus.CLOSED);
    return mapToResponse(walletRepository.save(wallet));
  }

  @Transactional
  public WalletResponse freezeWallet(Long walletId) {
    Wallet wallet = getOwnedWallet(walletId);
    if (wallet.getStatus() == WalletStatus.CLOSED) {
      throw new WalletOperationException("Closed wallets cannot be frozen");
    }
    wallet.setStatus(WalletStatus.SUSPENDED);
    return mapToResponse(walletRepository.save(wallet));
  }

  @Transactional
  public WalletResponse unfreezeWallet(Long walletId) {
    Wallet wallet =
        walletRepository
            .findById(walletId)
            .orElseThrow(() -> new WalletNotFoundException("Wallet not found"));
    if (wallet.getStatus() == WalletStatus.CLOSED) {
      throw new WalletOperationException("Closed wallets cannot be unfrozen");
    }
    wallet.setStatus(WalletStatus.ACTIVE);
    return mapToResponse(walletRepository.save(wallet));
  }

  /** Ensures the caller owns the wallet, or is an admin acting on any wallet. */
  @Transactional(readOnly = true)
  public void assertWalletAccess(Long walletId) {
    User user = currentUser();
    if (com.mamadou.sutura.common.security.SecurityRoleUtils.isAdmin(user)) {
      if (!walletRepository.existsById(walletId)) {
        throw new WalletNotFoundException("Wallet not found");
      }
      return;
    }
    getOwnedWallet(walletId);
  }

  private Wallet getOwnedWallet(Long walletId) {
    return walletRepository
        .findByIdAndUserId(walletId, currentUser().getId())
        .orElseThrow(() -> new WalletNotFoundException("Wallet not found"));
  }

  private User currentUser() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
      throw new AccountNotFoundException("Authenticated user not found");
    }

    Object principal = authentication.getPrincipal();
    if (principal instanceof User user) {
      return user;
    }

    String username = authentication.getName();
    return userRepository
        .findByEmail(username)
        .or(() -> userRepository.findByPhoneNumber(username))
        .orElseThrow(() -> new AccountNotFoundException("Authenticated user not found"));
  }

  private WalletResponse mapToResponse(Wallet wallet) {
    return WalletResponse.builder()
        .id(wallet.getId())
        .name(wallet.getName())
        .currency(wallet.getCurrency())
        .status(wallet.getStatus())
        .ledgerAccountCode(
            wallet.getLedgerAccount() == null ? null : wallet.getLedgerAccount().getCode())
        .ownerId(wallet.getUser().getId())
        .build();
  }

  private String normalizeCurrency(String currency) {
    if (currency == null || currency.isBlank()) {
      return "GMD";
    }
    return currency.trim().toUpperCase();
  }

  private String resolveWalletName(String name, String currency) {
    if (name == null || name.isBlank()) {
      return currency + " Wallet";
    }
    return name.trim();
  }

  private String walletLedgerAccountCode(Wallet wallet) {
    return "WALLET:" + wallet.getId() + ":LIABILITY";
  }
}
