package com.mamadou.sutura.agent.controller;

import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.wallet.enums.WalletStatus;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** A wallet QR identifies a deposit destination; it never authorizes money movement. */
@RestController
@RequestMapping("/api/v1/agent/deposit-wallets")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
public class AgentDepositWalletController {
  private final WalletRepository wallets;

  public record DepositWallet(long walletId, String walletName, String currency,
      long userId, String name, String phone) {}

  @GetMapping("/{walletId}")
  @Transactional(readOnly = true)
  public DepositWallet lookup(@PathVariable long walletId, @AuthenticationPrincipal User agent) {
    if (agent == null || (agent.getRole() != Role.AGENT && agent.getRole() != Role.ADMIN)
        || !active(agent)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "An active agent account is required");
    }
    if (walletId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid wallet code");
    var wallet = wallets.findById(walletId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deposit wallet not available"));
    var owner = wallet.getUser();
    if (wallet.getStatus() != WalletStatus.ACTIVE || owner == null || !active(owner)
        || (owner.getRole() != Role.USER && owner.getRole() != Role.MERCHANT && owner.getRole() != Role.DEVELOPER)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This wallet cannot receive a cash deposit");
    }
    return new DepositWallet(wallet.getId(), wallet.getName(), wallet.getCurrency(), owner.getId(),
        owner.getFirstName() + " " + owner.getLastName(), owner.getPhoneNumber());
  }

  private boolean active(User user) {
    return user.isEnabled() && user.isAccountNonLocked() && user.getUserStatus() == UserStatus.ACTIVE;
  }
}
