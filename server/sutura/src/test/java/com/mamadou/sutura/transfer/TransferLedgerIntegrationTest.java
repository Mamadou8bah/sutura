package com.mamadou.sutura.transfer;

import com.mamadou.sutura.fraud.dto.FraudDecisionResponse;
import com.mamadou.sutura.fraud.service.FraudDetectionService;
import com.mamadou.sutura.ledger.dto.LedgerPostingRequest;
import com.mamadou.sutura.ledger.enums.*;
import com.mamadou.sutura.ledger.repository.*;
import com.mamadou.sutura.ledger.service.*;
import com.mamadou.sutura.transaction.enums.TransactionStatus;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.transaction.service.TransactionService;
import com.mamadou.sutura.transfer.dto.TransferRequest;
import com.mamadou.sutura.transfer.service.TransferService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.enums.WalletStatus;
import com.mamadou.sutura.wallet.exception.WalletOperationException;
import com.mamadou.sutura.wallet.repository.*;
import com.mamadou.sutura.wallet.service.WalletService;
import com.mamadou.sutura.webhook.sentinel.SentinelWebhookService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "sutura.sentinel-webhook.signing-secret=integration-test-secret-0123456789",
        "sutura.sentinel-webhook.tenant-code=TEST",
        "sutura.webhooks.modempay.signing-secret=provider-test-secret",
        "sutura.payments.approved-payout-recovery-enabled=false"})
@ActiveProfiles("test")
class TransferLedgerIntegrationTest {
    private static final String SECRET = "integration-test-secret-0123456789";
    @Autowired javax.sql.DataSource dataSource;
    @Autowired com.mamadou.sutura.webhook.service.WebhookService genericCallbacks;
    @Autowired com.mamadou.sutura.paymentlink.service.PaymentLinkService collections;
    @Autowired com.mamadou.sutura.paymentlink.repository.PaymentLinkRepository collectionRepository;
    @Autowired UserRepository users;
    @Autowired WalletService wallets;
    @Autowired WalletRepository walletRepository;
    @Autowired WalletTransactionRepository walletHistory;
    @Autowired WalletLimitRepository limits;
    @Autowired LedgerAccountService accounts;
    @Autowired LedgerAccountRepository accountRepository;
    @Autowired LedgerBalanceComputationService balances;
    @Autowired LedgerService ledger;
    @Autowired LedgerPostingRepository postings;
    @Autowired LedgerTraceRepository traces;
    @Autowired TransferService transfers;
    @Autowired com.mamadou.sutura.transfer.service.TransferReversalService reversals;
    @Autowired TransactionRepository transactions;
    @Autowired SentinelWebhookService callbacks;
    @Autowired com.mamadou.sutura.agent.service.AgentOperationService agentOperations;
    @Autowired com.mamadou.sutura.deposit.service.DepositService deposits;
    @Autowired com.mamadou.sutura.withdrawal.service.WithdrawalService withdrawals;
    @Autowired com.mamadou.sutura.withdrawal.service.WithdrawalReservationService reservations;
    @Autowired com.mamadou.sutura.webhook.service.ProviderDepositSettlementService providerDeposits;
    @Autowired com.mamadou.sutura.webhook.service.ModemPayWebhookService providerCallbacks;
    @Autowired com.mamadou.sutura.withdrawal.repository.WithdrawalRepository withdrawalRepository;
    @MockitoBean com.mamadou.sutura.webhook.client.ModemPayClient provider;
    @MockitoBean FraudDetectionService fraud;
    @MockitoSpyBean TransactionService transactionService;
    private User sender;
    private User recipient;
    private Long source, destination;
    private String caseId;

    @BeforeEach void setup() {
        caseId = "case-" + UUID.randomUUID();
        sender = user();
        authenticate(sender);
        source = wallets.createWallet("Source", "GMD").getId();
        recipient = user();
        authenticate(recipient);
        destination = wallets.createWallet("Recipient", "GMD").getId();
        authenticate(sender);
        var cash = accounts.createAccountEntity("TEST:CASH:" + UUID.randomUUID(), "Test cash", LedgerAccountType.ASSET, "GMD");
        var request = new LedgerPostingRequest();
        request.setTraceId("fund-" + UUID.randomUUID());
        request.setCurrency("GMD");
        request.setPostings(List.of(entry(cash.getCode(), LedgerPostingSide.DEBIT),
                entry("WALLET:" + source + ":LIABILITY", LedgerPostingSide.CREDIT)));
        ledger.recordFinancialTransaction(request);
        decision("allow");
        when(provider.createPayout(any())).thenAnswer(call -> {
            var response = new com.mamadou.sutura.webhook.client.CreatePayoutResponse();
            response.setId("provider-" + UUID.randomUUID());
            return response;
        });
        when(provider.createCharge(any())).thenAnswer(call -> {
            var response = new com.mamadou.sutura.webhook.client.CreateChargeResponse();
            response.setId("provider-" + UUID.randomUUID());
            return response;
        });
    }

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void pendingMerchantCannotCreateCollectionsOrReceiveTransfer() {
        recipient.setRole(Role.MERCHANT);recipient.setUserStatus(UserStatus.PENDING_REVIEW);users.saveAndFlush(recipient);
        var collection=new com.mamadou.sutura.paymentlink.dto.CreatePaymentLinkRequest();
        collection.setWalletId(destination);collection.setAmount(new BigDecimal("50"));collection.setCurrency("GMD");
        authenticate(recipient);
        assertThatThrownBy(()->collections.create(recipient.getId(),collection)).hasMessageContaining("approved and active");
        authenticate(sender);
        assertThatThrownBy(()->transfers.transfer(request("50"),"pending-merchant-"+UUID.randomUUID())).hasMessageContaining("awaiting account approval");
        assertBalances("100","0");
    }

    @Test void suspendedRecipientCannotReceiveANewTransfer() {
        recipient.setUserStatus(UserStatus.SUSPENDED);users.saveAndFlush(recipient);
        assertThatThrownBy(()->transfers.transfer(request("50"),"suspended-recipient-"+UUID.randomUUID())).hasMessageContaining("not active");
        assertBalances("100","0");
    }

    @Test void activeDeveloperCanCreateCollectionsOnlyForItsOwnWallet() {
        recipient.setRole(Role.DEVELOPER);users.saveAndFlush(recipient);authenticate(recipient);
        var collection=new com.mamadou.sutura.paymentlink.dto.CreatePaymentLinkRequest();collection.setWalletId(destination);collection.setAmount(new BigDecimal("50"));collection.setCurrency("GMD");
        assertThat(collections.create(recipient.getId(),collection).getStatus()).isEqualTo("ACTIVE");
        collection.setWalletId(source);
        assertThatThrownBy(()->collections.create(recipient.getId(),collection)).hasMessageContaining("does not belong");
    }

    @Test void phoneTransferResolvesFormattedNumberAndReplaysOnce() {
        String local = String.format("%07d", 7000000L + recipient.getId());
        recipient.setPhoneNumber("+220 " + local.substring(0, 3) + " " + local.substring(3));
        users.save(recipient);
        var request = request("50");
        request.setDestinationWalletId(null);
        request.setRecipientPhone(local);
        var first = transfers.transfer(request, request.getReference());
        request.setRecipientPhone("00220" + local);
        var replay = transfers.transfer(request, request.getReference());
        assertThat(first.getTransaction().getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(replay.isIdempotentReplay()).isTrue();
        assertBalances("50", "50");
        assertThat(postings.findByTraceIdOrderByIdAsc(request.getReference())).hasSize(2);
    }

    @Test void unknownPhoneDoesNotDebitSender() {
        var request = request("50");
        request.setDestinationWalletId(null);
        request.setRecipientPhone("+2209999999");
        assertThatThrownBy(() -> transfers.transfer(request, request.getReference()))
                .hasMessageContaining("No unique Sutura recipient");
        assertBalances("100", "0");
    }

    @Test void phoneTransferRejectsMissingCurrencyWallet() {
        recipient.setPhoneNumber("+220" + String.format("%07d", recipient.getId()));
        users.save(recipient);
        var wallet = walletRepository.findById(destination).orElseThrow();
        wallet.setCurrency("USD"); walletRepository.save(wallet);
        var request = request("50");
        request.setDestinationWalletId(null); request.setRecipientPhone(recipient.getPhoneNumber());
        assertThatThrownBy(() -> transfers.transfer(request, request.getReference()))
                .hasMessageContaining("no active wallet in GMD");
        assertBalances("100", "0");
    }

    @Test void phoneTransferRejectsOwnNumberAndAmbiguousRecipient() {
        sender.setPhoneNumber("+220" + String.format("%07d", sender.getId()));
        users.save(sender);
        var request = request("50");
        request.setDestinationWalletId(null); request.setRecipientPhone(sender.getPhoneNumber());
        assertThatThrownBy(() -> transfers.transfer(request, request.getReference()))
                .hasMessageContaining("Choose another recipient");
        recipient.setPhoneNumber(sender.getPhoneNumber().substring(4)); users.save(recipient);
        assertThatThrownBy(() -> transfers.transfer(request, request.getReference()))
                .hasMessageContaining("No unique Sutura recipient");
        assertBalances("100", "0");
    }

    @Test void phoneTransferCannotChangeRecipientOnReplay() {
        recipient.setPhoneNumber("+220" + String.format("%07d", recipient.getId())); users.save(recipient);
        var request = request("50"); request.setDestinationWalletId(null);
        request.setRecipientPhone(recipient.getPhoneNumber());
        transfers.transfer(request, request.getReference());
        request.setRecipientPhone("+2209999999");
        assertThatThrownBy(() -> transfers.transfer(request, request.getReference()))
                .hasMessageContaining("different request");
        assertBalances("50", "50");
    }

    @Test void allowAndReplayMoveMoneyAndUsageOnce() {
        var request = request("50");
        var first = transfers.transfer(request, request.getReference());
        var replay = transfers.transfer(request, request.getReference());
        assertThat(first.getTransaction().getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(replay.isIdempotentReplay()).isTrue();
        assertThat(postings.findByTraceIdOrderByIdAsc(request.getReference())).hasSize(2);
        assertBalances("50", "50");
        assertThat(walletHistory.findByWalletId(source)).hasSize(1);
        assertThat(walletHistory.findByWalletId(destination)).hasSize(1);
        assertThat(limits.findByWalletId(source).orElseThrow().getAmountSpentToday()).isEqualByComparingTo("50");
    }

    @Test void changedRequestCannotReuseAKey() {
        var request = request("50");
        transfers.transfer(request, "stable-key");
        request.setAmount(new BigDecimal("60"));
        assertThatThrownBy(() -> transfers.transfer(request, "stable-key")).hasMessageContaining("different request");
        assertBalances("50", "50");
    }

    @Test void reviewApprovalAndCallbackReplayPostOnce() throws Exception {
        decision("review");
        var request = request("50");
        var result = transfers.transfer(request, request.getReference());
        assertThat(result.getTransaction().getStatus()).isEqualTo(TransactionStatus.PENDING);
        assertBalances("100", "0");
        callback(request.getReference(), "APPROVE", "event-" + UUID.randomUUID());
        callback(request.getReference(), "APPROVE", "event-" + UUID.randomUUID());
        assertThat(postings.findByTraceIdOrderByIdAsc(request.getReference())).hasSize(2);
        assertBalances("50", "50");
    }

    @Test void approvalAfterWalletFreezeFailsWithoutPosting() throws Exception {
        decision("review");
        var request = request("50");
        var result = transfers.transfer(request, request.getReference());
        var wallet = walletRepository.findById(source).orElseThrow();
        wallet.setStatus(WalletStatus.SUSPENDED);
        walletRepository.save(wallet);
        callback(request.getReference(), "APPROVE", "event-" + UUID.randomUUID());
        assertThat(transactions.findById(result.getTransaction().getId()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.FAILED);
        assertThat(postings.existsByTraceId(request.getReference())).isFalse();
        assertBalances("100", "0");
    }

    @Test void blockedPaymentIsDurableWithoutPostings() {
        decision("block");
        var request = request("50");
        var result = transfers.transfer(request, request.getReference());
        assertThat(transactions.findById(result.getTransaction().getId()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.FAILED);
        assertThat(postings.existsByTraceId(request.getReference())).isFalse();
        assertBalances("100", "0");
    }

    @Test void completionFailureRollsBackMoneyAndRetainsFailedProduct() {
        var request = request("50");
        doThrow(new IllegalStateException("Injected completion failure")).when(transactionService).markCompleted(any(), anyString());
        assertThatThrownBy(() -> transfers.transfer(request, request.getReference())).hasMessageContaining("Injected");
        assertThat(postings.existsByTraceId(request.getReference())).isFalse();
        assertThat(traces.existsById(request.getReference())).isFalse();
        assertThat(transactions.findByReference(request.getReference()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.FAILED);
        assertThat(limits.findByWalletId(source).orElseThrow().getAmountSpentToday()).isEqualByComparingTo("0");
        assertBalances("100", "0");
        doCallRealMethod().when(transactionService).markCompleted(any(), anyString());
        var failedReplay=transfers.transfer(request, request.getReference());
        assertThat(failedReplay.isIdempotentReplay()).isTrue();
        assertThat(failedReplay.getTransaction().getStatus()).isEqualTo(TransactionStatus.FAILED);
        assertBalances("100", "0");
        var fresh=request("50");
        assertThat(transfers.transfer(fresh, fresh.getReference()).getTransaction().getStatus()).isEqualTo(TransactionStatus.COMPLETED);
    }

    @Test void concurrentSpendingCannotOverdraw() throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        Callable<Boolean> spend = () -> {
            authenticate(sender);
            start.await();
            try { transfers.transfer(request("80"), UUID.randomUUID().toString()); return true; }
            catch (WalletOperationException e) { assertThat(e).hasMessageContaining("Insufficient"); return false; }
            finally { SecurityContextHolder.clearContext(); }
        };
        try {
            var first = pool.submit(spend);
            var second = pool.submit(spend);
            start.countDown();
            assertThat((first.get(20, TimeUnit.SECONDS) ? 1 : 0) + (second.get(20, TimeUnit.SECONDS) ? 1 : 0)).isEqualTo(1);
            assertBalances("20", "80");
        } finally { pool.shutdownNow(); }
    }

    @Test void implicitPrimaryWalletCannotTransferToItself() {
        var request = request("50");
        request.setSourceWalletId(null);
        request.setDestinationWalletId(source);
        assertThatThrownBy(() -> transfers.transfer(request, "self")).hasMessageContaining("must be different");
        assertBalances("100", "0");
    }

    @Test void cashDepositCompletesExistingProductAndRepeatsSafely() {
        var deposit = deposits.createDeposit(cashDeposit("30", "cash-key"), sender.getId(), false);
        var agent = agent();
        agentOperations.complete(deposit.getReference(), agent);
        agentOperations.complete(deposit.getReference(), agent);
        assertBalances("130", "0");
        var tx = transactions.findByReference(deposit.getReference()).orElseThrow();
        assertThat(tx.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(tx.getLedgerTraceId()).isEqualTo(deposit.getReference());
        assertThat(postings.findByTraceIdOrderByIdAsc(deposit.getReference())).hasSize(2);
    }

    @Test void cashWithdrawalDebitsAndTracksUsageOnce() {
        var request = com.mamadou.sutura.withdrawal.dto.CreateWithdrawalRequest.builder()
                .walletId(source).currency("GMD").amount(new BigDecimal("30")).idempotencyKey("cash-withdrawal").build();
        var withdrawal = withdrawals.createWithdrawal(request, sender.getId(), false);
        var agent = agent();
        agentOperations.complete(withdrawal.getReference(), agent);
        agentOperations.complete(withdrawal.getReference(), agent);
        assertBalances("70", "0");
        assertThat(limits.findByWalletId(source).orElseThrow().getAmountSpentToday()).isEqualByComparingTo("30");
        assertThat(transactions.findByReference(withdrawal.getReference()).orElseThrow().getLedgerTraceId()).isEqualTo(withdrawal.getReference());
    }

    @Test void cashCompletionRechecksScoringAndRejectsOrdinaryUsers() {
        var deposit = deposits.createDeposit(cashDeposit("30", "cash-key"), sender.getId(), false);
        assertThatThrownBy(() -> agentOperations.complete(deposit.getReference(), sender)).hasMessageContaining("Only agents");
        when(fraud.evaluateTransaction(anyString(), any(), any(), any(), anyString(), any()))
                .thenThrow(new com.mamadou.sutura.fraud.exception.FraudBlockedException("Scoring unavailable", 1, "block"));
        assertThat(agentOperations.complete(deposit.getReference(), agent()).getStatus()).isEqualTo("FAILED");
        assertThat(transactions.findByReference(deposit.getReference()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.FAILED);
        assertBalances("100", "0");
        assertThat(postings.existsByTraceId(deposit.getReference())).isFalse();
    }

    @Test void paymentKeysAreScopedAndChangedDetailsAreRejected() {
        var request = cashDeposit("30", "same-key");
        var original = deposits.createDeposit(request, sender.getId(), false);
        request.setAmount(new BigDecimal("40"));
        assertThatThrownBy(() -> deposits.createDeposit(request, sender.getId(), false)).hasMessageContaining("different request");
        request.setWalletId(destination);
        var other = deposits.createDeposit(request, recipient.getId(), false);
        assertThat(other.getId()).isNotEqualTo(original.getId());
        assertThat(other.getIdempotencyKey()).isNotEqualTo(original.getIdempotencyKey());
        assertBalances("100", "0");
    }

    @Test void mismatchedCurrencyCannotCreateCashOperation() {
        var request = cashDeposit("30", "wrong-currency");
        request.setCurrency("USD");
        assertThatThrownBy(() -> deposits.createDeposit(request, sender.getId(), false)).hasMessageContaining("Currency does not match");
        assertBalances("100", "0");
    }

    @Test void externalPayoutReservesFundsAndSettlesOnce() {
        var w = externalWithdrawal("80");
        assertBalances("20", "0");
        assertThatThrownBy(() -> transfers.transfer(request("30"), "overspend")).hasMessageContaining("Insufficient");
        reservations.confirm(w.getReference(), w.getAmount(), w.getCurrency(), w.getExternalPaymentId());
        reservations.confirm(w.getReference(), w.getAmount(), w.getCurrency(), w.getExternalPaymentId());
        assertBalances("20", "0");
        assertThat(postings.findByTraceIdOrderByIdAsc("hold:" + w.getReference())).hasSize(2);
        assertThat(postings.findByTraceIdOrderByIdAsc("settle:" + w.getReference())).hasSize(2);
        assertThat(transactions.findByReference(w.getReference()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(limits.findByWalletId(source).orElseThrow().getAmountSpentToday()).isEqualByComparingTo("80");
    }

    @Test void failedPayoutReleasesOnceAndCannotLaterSettle() {
        var w = externalWithdrawal("80");
        reservations.release(w.getReference(), w.getAmount(), w.getCurrency(), w.getExternalPaymentId(), "Declined");
        reservations.release(w.getReference(), w.getAmount(), w.getCurrency(), w.getExternalPaymentId(), "Declined");
        assertBalances("100", "0");
        assertThatThrownBy(() -> reservations.confirm(w.getReference(), w.getAmount(), w.getCurrency(), w.getExternalPaymentId()))
                .hasMessageContaining("no pending reservation");
        assertThat(postings.findByTraceIdOrderByIdAsc("release:" + w.getReference())).hasSize(2);
        assertThat(walletHistory.findByWalletId(source)).hasSize(2);
    }

    @Test void mismatchedPayoutCallbacksCannotMoveReservedMoney() {
        var w = externalWithdrawal("80");
        assertThatThrownBy(() -> reservations.confirm(w.getReference(), BigDecimal.ONE, "GMD", w.getExternalPaymentId())).hasMessageContaining("does not match");
        assertThatThrownBy(() -> reservations.confirm(w.getReference(), w.getAmount(), "USD", w.getExternalPaymentId())).hasMessageContaining("does not match");
        assertThatThrownBy(() -> reservations.release(w.getReference(), w.getAmount(), "GMD", "other-provider", "bad")).hasMessageContaining("does not match");
        assertBalances("20", "0");
    }

    @Test void unknownProviderOutcomeRetainsReservation() {
        when(provider.createPayout(any())).thenThrow(new IllegalStateException("Timeout"));
        var w = externalWithdrawal("80");
        assertBalances("20", "0");
        assertThat(w.getStatus()).isEqualTo(com.mamadou.sutura.withdrawal.entity.Withdrawal.WithdrawalStatus.PROCESSING);
        assertThat(w.getRejectionReason()).contains("outcome unknown");
    }

    @Test void providerDepositCreditsOnceAndLateFailureCannotUndoIt() {
        var request = cashDeposit("30", "provider-deposit");
        request.setPaymentMethod("mobile_money");
        var d = deposits.createDeposit(request, sender.getId(), false);
        assertThatThrownBy(() -> providerDeposits.complete(d.getReference(), source, BigDecimal.ONE, "GMD", d.getExternalPaymentId())).hasMessageContaining("does not match");
        providerDeposits.complete(d.getReference(), source, d.getAmount(), "GMD", d.getExternalPaymentId());
        providerDeposits.complete(d.getReference(), source, d.getAmount(), "GMD", d.getExternalPaymentId());
        providerDeposits.updateStatus(d.getReference(), d.getAmount(), "GMD", d.getExternalPaymentId(),
                com.mamadou.sutura.deposit.entity.Deposit.DepositStatus.FAILED, "late event");
        assertBalances("130", "0");
        assertThat(transactions.findByReference(d.getReference()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(postings.findByTraceIdOrderByIdAsc(d.getReference())).hasSize(2);
    }

    @Test void providerSignatureUsesExactIncomingJson() throws Exception {
        String body = "{ \"event\": \"ignored.event\", \"data\": {} }";
        var mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec("provider-test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        String signature = HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        providerCallbacks.processWebhook(body, signature);
        assertThatThrownBy(() -> providerCallbacks.processWebhook(body.replace(" ", ""), signature))
                .isInstanceOf(SecurityException.class);
    }

    @Test void holdIsCommittedBeforeProviderReceivesPayout() {
        when(provider.createPayout(any())).thenAnswer(call -> {
            var request = (com.mamadou.sutura.webhook.client.CreatePayoutRequest) call.getArgument(0);
            // A separate connection cannot see an uncommitted hold.
            try (var connection = dataSource.getConnection();
                 var query = connection.prepareStatement("select reservation_trace_id from withdrawals where reference = ?")) {
                query.setString(1, request.getReference());
                try (var result = query.executeQuery()) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getString(1)).isEqualTo("hold:" + request.getReference());
                }
            }
            var response = new com.mamadou.sutura.webhook.client.CreatePayoutResponse();
            response.setId("committed-payout"); return response;
        });
        externalWithdrawal("80");
        assertBalances("20", "0");
    }

    @Test void documentedProviderEnvelopeSettlesMatchedMetadataReference() throws Exception {
        var w = externalWithdrawal("80");
        String body = """
                {"event":"transfer.succeeded","payload":{"id":"%s","amount":80,"currency":"GMD",
                 "metadata":{"sutura_reference":"%s"},"test_mode":true}}
                """.formatted(w.getExternalPaymentId(), w.getReference());
        providerCallbacks.processWebhook(body, providerSignature(body));
        providerCallbacks.processWebhook(body, providerSignature(body));
        assertBalances("20", "0");
        assertThat(transactions.findByReference(w.getReference()).orElseThrow().getStatus()).isEqualTo(TransactionStatus.COMPLETED);
    }

    @Test void invalidDeliveryCannotPoisonGenericReceiptAndChangedBodyIsRejected() throws Exception {
        var request = cashDeposit("30", "receipt-test"); request.setPaymentMethod("mobile_money");
        var d = deposits.createDeposit(request, sender.getId(), false);
        String body = """
                {"eventId":"%s","reference":"%s","walletId":%s,"amount":30,"currency":"GMD",
                 "providerTransactionId":"%s","status":"SUCCESS"}
                """.formatted(UUID.randomUUID(), d.getReference(), source, d.getExternalPaymentId());
        var headers = new org.springframework.http.HttpHeaders(); headers.set("x-modem-signature", "invalid");
        assertThat(genericCallbacks.handleModemPayDeposit(body, headers).accepted()).isFalse();
        headers.set("x-modem-signature", providerSignature(body));
        assertThat(genericCallbacks.handleModemPayDeposit(body, headers).accepted()).isTrue();
        assertThat(genericCallbacks.handleModemPayDeposit(body, headers).accepted()).isTrue();
        String changed = body.replace("\"amount\":30", "\"amount\":40");
        headers.set("x-modem-signature", providerSignature(changed));
        assertThat(genericCallbacks.handleModemPayDeposit(changed, headers).accepted()).isFalse();
        assertBalances("130", "0");
    }

    private String providerSignature(String body) throws Exception {
        var mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec("provider-test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }

    @Test void merchantCollectionPaysOnceAndRejectsAnotherPayer() {
        var link = collection("30");
        var first = collections.pay(link.getReference(), source);
        assertThat(first.getStatus()).isEqualTo("PAID");
        assertThat(collections.pay(link.getReference(), source).getTransactionReference()).isEqualTo(first.getTransactionReference());
        assertBalances("70", "30");
        authenticate(user());
        assertThatThrownBy(() -> collections.pay(link.getReference(), null)).hasMessageContaining("already claimed");
        assertBalances("70", "30");
    }

    @Test void merchantCollectionReviewUsesExistingSignedApprovalFlow() throws Exception {
        var link = collection("30"); decision("review");
        var pending = collections.pay(link.getReference(), source);
        assertThat(pending.getStatus()).isEqualTo("REVIEW");
        assertBalances("100", "0");
        callback(pending.getTransactionReference(), "APPROVE", "collection-" + UUID.randomUUID());
        assertThat(collections.lookup(link.getReference()).getStatus()).isEqualTo("PAID");
        assertBalances("70", "30");
    }

    @Test void expiredCollectionAndForeignMerchantWalletCannotBePaid() {
        var link = collection("30");
        var entity = collectionRepository.findById(link.getId()).orElseThrow();
        entity.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1)); collectionRepository.save(entity);
        assertThat(collections.lookup(link.getReference()).getStatus()).isEqualTo("EXPIRED");
        assertThatThrownBy(() -> collections.pay(link.getReference(), source)).hasMessageContaining("expired");
        var request = new com.mamadou.sutura.paymentlink.dto.CreatePaymentLinkRequest();
        request.setWalletId(source); request.setAmount(BigDecimal.TEN); request.setCurrency("GMD");
        assertThatThrownBy(() -> collections.create(recipient.getId(), request)).hasMessageContaining("does not belong");
        assertBalances("100", "0");
    }

    private com.mamadou.sutura.paymentlink.dto.PaymentLinkResponse collection(String amount) {
        recipient.setRole(Role.MERCHANT); users.save(recipient);
        var request = new com.mamadou.sutura.paymentlink.dto.CreatePaymentLinkRequest();
        request.setWalletId(destination); request.setAmount(new BigDecimal(amount)); request.setCurrency("GMD");
        return collections.create(recipient.getId(), request);
    }

    @Test void reversalReplaysOnceAndUnauthorizedCallerCannotReadReceipt() {
        var original = transfers.transfer(request("30"), "reverse-original").getTransaction();
        var request = new com.mamadou.sutura.transaction.dto.ReversalRequest();
        request.setIdempotencyKey("reverse-key"); request.setReason("Test refund");
        var result = reversals.reverse(original.getId(), request);
        assertThat(reversals.reverse(original.getId(), request).getId()).isEqualTo(result.getId());
        assertBalances("100", "0");
        authenticate(recipient);
        assertThatThrownBy(() -> reversals.reverse(original.getId(), request)).hasMessageContaining("source wallet owner");
        assertThatThrownBy(() -> reversals.reverseAsAdmin(original.getId(), request)).hasMessageContaining("Only admins");
    }

    @Test void competingReversalKeysCannotRefundTwice() throws Exception {
        var original = transfers.transfer(request("30"), "reverse-original").getTransaction();
        var start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Boolean>> attempts = new ArrayList<>();
            for (int i = 0; i < 2; i++) attempts.add(executor.submit(() -> {
                authenticate(sender); start.await();
                try {
                    var request = new com.mamadou.sutura.transaction.dto.ReversalRequest();
                    request.setIdempotencyKey(UUID.randomUUID().toString());
                    reversals.reverse(original.getId(), request); return true;
                } catch (com.mamadou.sutura.transaction.exception.TransactionException ex) { return false; }
                finally { SecurityContextHolder.clearContext(); }
            }));
            start.countDown();
            assertThat(attempts.get(0).get(15, TimeUnit.SECONDS) ^ attempts.get(1).get(15, TimeUnit.SECONDS)).isTrue();
        } finally { executor.shutdownNow(); }
        assertBalances("100", "0");
    }

    @Test void overpreciseExternalAmountIsRejectedBeforeProviderCall() {
        var request = cashDeposit("0.00001", "too-small"); request.setPaymentMethod("mobile_money");
        assertThatThrownBy(() -> deposits.createDeposit(request, sender.getId(), false)).hasMessageContaining("precision or maximum");
        verify(provider, never()).createCharge(any());
        assertBalances("100", "0");
    }

    @Test void cashReviewApprovalWaitsForAgentAndMovesFundsOnce() throws Exception {
        var deposit = deposits.createDeposit(cashDeposit("30", "review-cash"), sender.getId(), false);
        decision("review"); var agent = agent();
        assertThat(agentOperations.complete(deposit.getReference(), agent).getStatus()).isEqualTo("PENDING_REVIEW");
        assertBalances("100", "0");
        settlementCallback(deposit.getReference(), "APPROVE");
        assertThat(agentOperations.lookup(deposit.getReference(), agent).getStatus()).isEqualTo("APPROVED");
        assertBalances("100", "0");
        assertThat(agentOperations.complete(deposit.getReference(), agent).getStatus()).isEqualTo("COMPLETED");
        agentOperations.complete(deposit.getReference(), agent);
        assertBalances("130", "0");
    }

    @Test void rejectedCashReviewPersistsWithoutFundsMovement() throws Exception {
        var deposit = deposits.createDeposit(cashDeposit("30", "reject-cash"), sender.getId(), false);
        decision("review"); var agent = agent();
        agentOperations.complete(deposit.getReference(), agent);
        settlementCallback(deposit.getReference(), "REJECT");
        assertThat(agentOperations.complete(deposit.getReference(), agent).getStatus()).isEqualTo("FAILED");
        assertBalances("100", "0");
    }

    @Test void providerDepositReviewCreditsOnlyAfterMatchedApproval() throws Exception {
        var request = cashDeposit("30", "provider-review"); request.setPaymentMethod("mobile_money");
        var deposit = deposits.createDeposit(request, sender.getId(), false);
        decision("review");
        providerDeposits.complete(deposit.getReference(), source, deposit.getAmount(), "GMD", deposit.getExternalPaymentId());
        assertThat(deposits.getByReference(deposit.getReference()).getStatus().toString()).isEqualTo("PENDING_REVIEW");
        assertBalances("100", "0");
        settlementCallback(deposit.getReference(), "APPROVE");
        providerDeposits.complete(deposit.getReference(), source, deposit.getAmount(), "GMD", deposit.getExternalPaymentId());
        assertBalances("130", "0");
    }

    @Test void payoutReviewWaitsForApprovalThenReservesBeforeDispatch() throws Exception {
        decision("review");
        var withdrawal = externalWithdrawal("30");
        assertThat(withdrawal.getStatus().toString()).isEqualTo("PENDING_REVIEW");
        verify(provider, never()).createPayout(any());
        assertBalances("100", "0");
        settlementCallback(withdrawal.getReference(), "APPROVE");
        assertBalances("100", "0");
        withdrawals.resumeApproved(withdrawal.getReference());
        withdrawals.resumeApproved(withdrawal.getReference());
        verify(provider, times(1)).createPayout(any());
        assertBalances("70", "0");
        var stored = withdrawalRepository.findByReferenceIgnoreCase(withdrawal.getReference()).orElseThrow();
        reservations.confirm(stored.getReference(), stored.getAmount(), "GMD", stored.getExternalPaymentId());
        assertBalances("70", "0");
    }

    @Test void rejectedPayoutReviewNeverReservesOrContactsProvider() throws Exception {
        decision("review");
        var withdrawal = externalWithdrawal("30");
        settlementCallback(withdrawal.getReference(), "REJECT");
        withdrawals.resumeApproved(withdrawal.getReference());
        verify(provider, never()).createPayout(any());
        assertThat(withdrawalRepository.findByReferenceIgnoreCase(withdrawal.getReference()).orElseThrow().getStatus().toString()).isEqualTo("FAILED");
        assertBalances("100", "0");
    }

    @Test void cashWithdrawalReviewApprovalRequiresAgentAndDebitsOnce() throws Exception {
        var request = com.mamadou.sutura.withdrawal.dto.CreateWithdrawalRequest.builder()
                .walletId(source).currency("GMD").amount(new BigDecimal("30"))
                .idempotencyKey("cash-review-withdrawal").build();
        var withdrawal = withdrawals.createWithdrawal(request, sender.getId(), false);
        decision("review"); var agent = agent();
        assertThat(agentOperations.complete(withdrawal.getReference(), agent).getStatus()).isEqualTo("PENDING_REVIEW");
        assertBalances("100", "0");
        settlementCallback(withdrawal.getReference(), "APPROVE");
        assertBalances("100", "0");
        assertThat(agentOperations.complete(withdrawal.getReference(), agent).getStatus()).isEqualTo("COMPLETED");
        agentOperations.complete(withdrawal.getReference(), agent);
        assertBalances("70", "0");
    }

    @Test void blockedPayoutPersistsFailedRequestWithoutReservation() {
        decision("block");
        var withdrawal = externalWithdrawal("30");
        assertThat(withdrawal.getStatus().toString()).isEqualTo("FAILED");
        assertThat(withdrawalRepository.findByReferenceIgnoreCase(withdrawal.getReference())).isPresent();
        verify(provider, never()).createPayout(any());
        assertBalances("100", "0");
    }

    private void settlementCallback(String reference, String outcome) throws Exception {
        String body = """
                {"event":"CASE_DECIDED","tenantCode":"TEST","eventId":"%s","caseId":"%s",
                 "transactionId":"sent-settlement:%s","externalTransactionId":"settlement:%s","externalCustomerId":"%s","decision":"%s"}
                """.formatted(UUID.randomUUID(), caseId, reference, reference, sender.getId(), outcome);
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        callbacks.process(new com.fasterxml.jackson.databind.ObjectMapper().readTree(body).get("eventId").asText(), timestamp,
                HexFormat.of().formatHex(mac.doFinal((timestamp + "." + body).getBytes(StandardCharsets.UTF_8))), body.getBytes(StandardCharsets.UTF_8));
    }

    private com.mamadou.sutura.withdrawal.entity.Withdrawal externalWithdrawal(String amount) {
        var request = com.mamadou.sutura.withdrawal.dto.CreateWithdrawalRequest.builder()
                .walletId(source).currency("GMD").amount(new BigDecimal(amount)).withdrawalMethod("wave").phoneNumber("7000001")
                .idempotencyKey("payout-" + UUID.randomUUID()).build();
        return withdrawals.createWithdrawal(request, sender.getId(), false);
    }

    private com.mamadou.sutura.deposit.dto.CreateDepositRequest cashDeposit(String amount, String key) {
        return com.mamadou.sutura.deposit.dto.CreateDepositRequest.builder().walletId(source).currency("GMD")
                .amount(new BigDecimal(amount)).idempotencyKey(key).build();
    }

    private User agent() {
        var agent = user();
        agent.setRole(Role.AGENT);
        return users.save(agent);
    }

    private User user() {
        String id = UUID.randomUUID().toString();
        return users.save(User.builder().firstName("Test").lastName("User").phoneNumber(id.substring(0, 18))
                .email(id + "@example.test").passwordHash("test-only").enabled(true).userStatus(UserStatus.ACTIVE).role(Role.USER).build());
    }

    private static void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private TransferRequest request(String amount) {
        var request = new TransferRequest();
        request.setSourceWalletId(source);
        request.setDestinationWalletId(destination);
        request.setAmount(new BigDecimal(amount));
        request.setReference("test-" + UUID.randomUUID());
        return request;
    }

    private void decision(String value) {
        when(fraud.evaluateTransaction(anyString(), any(), any(), any(), anyString(), any())).thenAnswer(call ->
                new FraudDecisionResponse(call.getArgument(0), value, .75, List.of("Test decision"), 1, null,
                        Map.of("sentinelCaseId", caseId, "sentinelTransactionId", "sent-" + call.getArgument(0))));
    }

    private static LedgerPostingRequest.Entry entry(String code, LedgerPostingSide side) {
        var entry = new LedgerPostingRequest.Entry();
        entry.setAccountCode(code); entry.setSide(side); entry.setAmount(new BigDecimal("100"));
        return entry;
    }

    private void assertBalances(String sourceAmount, String destinationAmount) {
        assertThat(balances.computeBalance(accountRepository.findByCode("WALLET:" + source + ":LIABILITY").orElseThrow())).isEqualByComparingTo(sourceAmount);
        assertThat(balances.computeBalance(accountRepository.findByCode("WALLET:" + destination + ":LIABILITY").orElseThrow())).isEqualByComparingTo(destinationAmount);
    }

    private void callback(String reference, String decision, String eventId) throws Exception {
        String body = """
                {"event":"CASE_DECIDED","tenantCode":"TEST","eventId":"%s","caseId":"%s",
                 "transactionId":"sent-%s","externalTransactionId":"%s","externalCustomerId":"%s","decision":"%s"}
                """.formatted(eventId, caseId, reference, reference, sender.getId(), decision);
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = HexFormat.of().formatHex(mac.doFinal((timestamp + "." + body).getBytes(StandardCharsets.UTF_8)));
        callbacks.process(eventId, timestamp, signature, body.getBytes(StandardCharsets.UTF_8));
    }
}
