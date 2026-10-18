package com.mamadou.sutura.transfer.service;

import com.mamadou.sutura.common.Exception.AccountNotFoundException;
import com.mamadou.sutura.ledger.entity.LedgerAccount;
import com.mamadou.sutura.ledger.exception.LedgerException;
import com.mamadou.sutura.ledger.service.LedgerBalanceComputationService;
import com.mamadou.sutura.transfer.dto.TransferRequest;
import com.mamadou.sutura.transfer.dto.TransferValidationResult;
import com.mamadou.sutura.transfer.validator.TransferRequestValidator;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.wallet.enums.WalletStatus;
import com.mamadou.sutura.wallet.exception.WalletNotFoundException;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import com.mamadou.sutura.wallet.service.WalletLimitService;
import com.mamadou.sutura.wallet.service.WalletService;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransferValidationService {

  private final WalletRepository walletRepository;
  private final WalletLimitService walletLimitService;
  private final LedgerBalanceComputationService ledgerBalanceComputationService;
  private final TransferRequestValidator transferRequestValidator;
  private final UserRepository userRepository;
  private final WalletService walletService;

  public TransferValidationResult validateForExecution(TransferRequest request) {
    transferRequestValidator.validate(request);
    User currentUser = currentUser();
    Long sourceWalletId = resolveSourceWalletId(request, currentUser);
    Long destinationWalletId = request.getDestinationWalletId();
    if (request.getRecipientPhone() != null) {
      Wallet source =
          walletRepository
              .findByIdAndUserId(sourceWalletId, currentUser.getId())
              .orElseThrow(() -> new WalletNotFoundException("Source wallet not found"));
      var recipients =
          userRepository.findTransferRecipientsByPhone(
              com.mamadou.sutura.transfer.validator.RecipientPhone.storedForms(
                  request.getRecipientPhone()));
      if (recipients.size() != 1)
        throw new WalletOperationException(
            "No unique Sutura recipient found for this phone number");
      User recipient = recipients.get(0);
      if (recipient.getId() == currentUser.getId())
        throw new WalletOperationException("Choose another recipient to send money");
      destinationWalletId =
          walletRepository.findByUserId(recipient.getId()).stream()
              .filter(wallet -> wallet.getStatus() == WalletStatus.ACTIVE)
              .filter(wallet -> wallet.getCurrency().equalsIgnoreCase(source.getCurrency()))
              .min(java.util.Comparator.comparing(Wallet::getId))
              .orElseThrow(
                  () ->
                      new WalletOperationException(
                          "Recipient has no active wallet in " + source.getCurrency()))
              .getId();
    }
    if (sourceWalletId.equals(destinationWalletId)) {
      throw new WalletOperationException("Source and destination wallets must be different");
    }
    request.setSourceWalletId(sourceWalletId);
    LockedWallets lockedWallets = lockWallets(sourceWalletId, destinationWalletId);
    Wallet sourceWallet = lockedWallets.sourceWallet();
    Wallet destinationWallet = lockedWallets.destinationWallet();
    if (sourceWallet.getUser().getId() != currentUser.getId()) {
      throw new WalletNotFoundException("Source wallet not found");
    }

    validateWallets(sourceWallet, destinationWallet);
    if (request.getAmount() == null
        || request.getAmount().signum() <= 0
        || request.getAmount().stripTrailingZeros().scale() > 4
        || request.getAmount().compareTo(new BigDecimal("1000000000000")) > 0)
      throw new WalletOperationException("Amount exceeds supported precision or maximum");
    walletLimitService.validateDebit(sourceWallet, request.getAmount());
    ensureSufficientBalance(sourceWallet, request.getAmount());

    return TransferValidationResult.builder()
        .sourceWallet(sourceWallet)
        .destinationWallet(destinationWallet)
        .initiatedBy(currentUser)
        .build();
  }

  public void ensureSufficientBalance(Wallet wallet, BigDecimal amount) {
    LedgerAccount ledgerAccount = requireLedgerAccount(wallet);
    BigDecimal balance = ledgerBalanceComputationService.computeBalance(ledgerAccount);
    if (balance.compareTo(amount) < 0) {
      throw new WalletOperationException("Insufficient wallet balance");
    }
  }

  public void validatePending(com.mamadou.sutura.transaction.entity.Transaction transaction) {
    LockedWallets locked =
        lockWallets(
            transaction.getSourceWallet().getId(), transaction.getDestinationWallet().getId());
    validateWallets(locked.sourceWallet(), locked.destinationWallet());
    walletLimitService.validateDebit(locked.sourceWallet(), transaction.getAmount());
    ensureSufficientBalance(locked.sourceWallet(), transaction.getAmount());
    transaction.setSourceWallet(locked.sourceWallet());
    transaction.setDestinationWallet(locked.destinationWallet());
  }

  private void validateWallets(Wallet sourceWallet, Wallet destinationWallet) {
    requireActiveOwner(sourceWallet);
    requireActiveOwner(destinationWallet);
    if (sourceWallet.getStatus() != WalletStatus.ACTIVE) {
      throw new WalletOperationException("Source wallet is not active");
    }
    if (destinationWallet.getStatus() != WalletStatus.ACTIVE) {
      throw new WalletOperationException("Destination wallet is not active");
    }
    if (!sourceWallet.getCurrency().equalsIgnoreCase(destinationWallet.getCurrency())) {
      throw new WalletOperationException("Wallet currencies must match");
    }
    requireLedgerAccount(sourceWallet);
    requireLedgerAccount(destinationWallet);
  }

  private void requireActiveOwner(Wallet wallet) {
    User owner = wallet.getUser();
    if (owner == null
        || !owner.isEnabled()
        || owner.getUserStatus() != com.mamadou.sutura.user.enums.UserStatus.ACTIVE)
      throw new WalletOperationException(
          "Wallet owner is not active or is awaiting account approval");
  }

  private LedgerAccount requireLedgerAccount(Wallet wallet) {
    if (wallet.getLedgerAccount() == null) {
      throw new LedgerException("Wallet is not linked to a ledger account");
    }
    return wallet.getLedgerAccount();
  }

  private LockedWallets lockWallets(Long sourceWalletId, Long destinationWalletId) {
    Wallet firstWallet;
    Wallet secondWallet;
    if (sourceWalletId < destinationWalletId) {
      firstWallet = getLockedWallet(sourceWalletId, "Source wallet not found");
      secondWallet = getLockedWallet(destinationWalletId, "Destination wallet not found");
    } else {
      firstWallet = getLockedWallet(destinationWalletId, "Destination wallet not found");
      secondWallet = getLockedWallet(sourceWalletId, "Source wallet not found");
    }

    Wallet sourceWallet = firstWallet.getId().equals(sourceWalletId) ? firstWallet : secondWallet;
    Wallet destinationWallet =
        firstWallet.getId().equals(destinationWalletId) ? firstWallet : secondWallet;
    return new LockedWallets(sourceWallet, destinationWallet);
  }

  private Wallet getLockedWallet(Long walletId, String errorMessage) {
    return walletRepository
        .findWithLockById(walletId)
        .orElseThrow(() -> new WalletNotFoundException(errorMessage));
  }

  private record LockedWallets(Wallet sourceWallet, Wallet destinationWallet) {}

  private Long resolveSourceWalletId(TransferRequest request, User currentUser) {
    if (request.getSourceWalletId() != null) {
      return request.getSourceWalletId();
    }
    return walletService.resolvePrimaryWallet(currentUser.getId(), null).getId();
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
}
