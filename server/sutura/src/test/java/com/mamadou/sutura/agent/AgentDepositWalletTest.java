package com.mamadou.sutura.agent;

import com.mamadou.sutura.agent.controller.AgentDepositWalletController;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.wallet.entity.Wallet;
import com.mamadou.sutura.wallet.enums.WalletStatus;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AgentDepositWalletTest {
  final WalletRepository wallets = mock(WalletRepository.class);
  final AgentDepositWalletController controller = new AgentDepositWalletController(wallets);
  final User agent = User.builder().id(1).role(Role.AGENT).enabled(true).userStatus(UserStatus.ACTIVE).build();
  final User owner = User.builder().id(2).role(Role.USER).enabled(true).userStatus(UserStatus.ACTIVE)
      .firstName("Test").lastName("Customer").phoneNumber("+2203281914").build();
  final Wallet wallet = Wallet.builder().id(7L).name("Savings").currency("GMD").status(WalletStatus.ACTIVE).user(owner).build();

  @BeforeEach void setup() { when(wallets.findById(7L)).thenReturn(Optional.of(wallet)); }

  @Test void identifiesExactDepositWalletWithoutPerformingAnyWrite() {
    var result = controller.lookup(7, agent);
    assertThat(result.walletId()).isEqualTo(7);
    assertThat(result.userId()).isEqualTo(2);
    assertThat(result.name()).isEqualTo("Test Customer");
    assertThat(result.walletName()).isEqualTo("Savings");
    assertThat(result.currency()).isEqualTo("GMD");
    verify(wallets).findById(7L);
    verifyNoMoreInteractions(wallets);
  }

  @Test void customerCannotUseAgentDirectoryAndUnknownIdsDoNotSucceed() {
    assertThatThrownBy(() -> controller.lookup(7, owner)).isInstanceOf(ResponseStatusException.class);
    verifyNoInteractions(wallets);
    assertThatThrownBy(() -> controller.lookup(999, agent)).isInstanceOf(ResponseStatusException.class);
  }

  @Test void invalidIdentifierDoesNotQueryDirectory() {
    assertThatThrownBy(() -> controller.lookup(-1, agent)).isInstanceOf(ResponseStatusException.class);
    verifyNoInteractions(wallets);
  }

  @ParameterizedTest @EnumSource(value=WalletStatus.class, names={"SUSPENDED","CLOSED"})
  void unavailableWalletCannotBePreparedForDeposit(WalletStatus status) {
    wallet.setStatus(status);
    assertThatThrownBy(() -> controller.lookup(7, agent)).isInstanceOf(ResponseStatusException.class);
  }

  @ParameterizedTest @EnumSource(value=UserStatus.class, names={"BANNED","SUSPENDED","PENDING_REVIEW"})
  void restrictedOwnerCannotReceiveScannedDeposit(UserStatus status) {
    owner.setUserStatus(status);
    assertThatThrownBy(() -> controller.lookup(7, agent)).isInstanceOf(ResponseStatusException.class);
  }

  @Test void disabledOwnerAndSuspendedAgentAreRefused() {
    owner.setEnabled(false);
    assertThatThrownBy(() -> controller.lookup(7, agent)).isInstanceOf(ResponseStatusException.class);
    agent.setUserStatus(UserStatus.SUSPENDED);
    assertThatThrownBy(() -> controller.lookup(7, agent)).isInstanceOf(ResponseStatusException.class);
  }
}
