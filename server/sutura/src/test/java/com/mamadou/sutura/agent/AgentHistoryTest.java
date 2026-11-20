package com.mamadou.sutura.agent;
import com.mamadou.sutura.agent.service.AgentOperationService;
import com.mamadou.sutura.deposit.repository.DepositRepository;
import com.mamadou.sutura.withdrawal.repository.WithdrawalRepository;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.wallet.service.LedgerWalletMovementService;
import com.mamadou.sutura.fraud.service.PaymentComplianceService;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AgentHistoryTest {
 @Test void queriesOnlySignedInAgent(){
  var deposits=mock(DepositRepository.class);var withdrawals=mock(WithdrawalRepository.class);
  var service=new AgentOperationService(deposits,withdrawals,mock(com.mamadou.sutura.agent.service.CashOutQrService.class),mock(TransactionRepository.class),mock(UserRepository.class),mock(LedgerWalletMovementService.class),mock(PaymentComplianceService.class));
  var agent=mock(User.class);when(agent.getId()).thenReturn(17L);
  // Use the role representation used by the application's security helper.
  when(agent.getRole()).thenReturn(com.mamadou.sutura.user.enums.Role.AGENT);
  assertTrue(service.history(agent).isEmpty());verify(deposits).findTop100ByAgentIdOrderByCreatedAtDesc(17L);verify(withdrawals).findTop100ByAgentIdOrderByCreatedAtDesc(17L);verifyNoMoreInteractions(deposits,withdrawals);
 }
 @Test void refusesUnprivilegedUsersBeforeReadingHistory(){
  var deposits=mock(DepositRepository.class);var withdrawals=mock(WithdrawalRepository.class);
  var service=new AgentOperationService(deposits,withdrawals,mock(com.mamadou.sutura.agent.service.CashOutQrService.class),mock(TransactionRepository.class),mock(UserRepository.class),mock(LedgerWalletMovementService.class),mock(PaymentComplianceService.class));
  assertThrows(WalletOperationException.class,()->service.history(mock(User.class)));verifyNoInteractions(deposits,withdrawals);
 }
}
