package com.mamadou.sutura.fraud.service;

import com.mamadou.sutura.fraud.client.FraudDetectionClient;
import com.mamadou.sutura.fraud.config.FraudDetectionProperties;
import com.mamadou.sutura.fraud.dto.FraudDecisionResponse;
import com.mamadou.sutura.fraud.dto.TransactionEventRequest;
import com.mamadou.sutura.fraud.exception.FraudBlockedException;
import com.mamadou.sutura.risk.enums.RiskLevel;
import com.mamadou.sutura.risk.enums.RiskRuleType;
import com.mamadou.sutura.risk.service.RiskFlagService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.wallet.entity.Wallet;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionService {

  private final FraudDetectionClient fraudDetectionClient;
  private final FraudDetectionProperties properties;
  private final RiskFlagService riskFlagService;
  private final FraudEvaluationLogService fraudEvaluationLogService;
  private final com.mamadou.sutura.ledger.service.LedgerBalanceComputationService balances;
  private final com.mamadou.sutura.transaction.repository.TransactionRepository transactions;

  public FraudDecisionResponse evaluateTransaction(
      String transactionId,
      User user,
      Wallet wallet,
      BigDecimal amount,
      String operationType,
      Long persistedTransactionId) {
    if (!properties.isEnabled()) {
      return null;
    }
    if (!properties.isConnected()) {
      throw new FraudBlockedException("Transaction stopped: Sentinel is not connected yet", 1.0, "block");
    }

    TransactionEventRequest event = buildEvent(transactionId, user, wallet, amount, operationType);
    if (persistedTransactionId != null && "transfer".equalsIgnoreCase(operationType)) {
      transactions
          .findRecipientCustomerId(persistedTransactionId, wallet.getId())
          .ifPresent(id -> event.metadata().put("counterparty", id.toString()));
    }

    try {
      FraudDecisionResponse decision = fraudDetectionClient.score(event);
      fraudEvaluationLogService.saveEvaluation(
          transactionId,
          wallet.getId(),
          user.getId(),
          persistedTransactionId,
          operationType,
          amount,
          wallet.getCurrency(),
          decision);
      handleDecision(decision, wallet.getId(), persistedTransactionId, operationType);
      return decision;
    } catch (RestClientException ex) {
      log.error(
          "Fraud detection API unavailable for transaction {}: {}", transactionId, ex.getMessage());
      throw new FraudBlockedException(
          "Transaction stopped: Sentinel unavailable or returned an invalid decision",
          1.0,
          "block");
    }
  }

  public void enforceDecision(FraudDecisionResponse decision) {
    if (decision == null) {
      if (!properties.isEnabled()) return;
      throw new FraudBlockedException(
          "Transaction stopped: missing Sentinel decision", 1.0, "block");
    }
    if ("allow".equalsIgnoreCase(decision.decision())) return;
    if ("block".equalsIgnoreCase(decision.decision())) {
      String reasons =
          decision.reasons() != null
              ? decision.reasons().stream().collect(Collectors.joining("; "))
              : "Fraud score exceeded threshold";
      throw new FraudBlockedException(
          "Transaction blocked by fraud detection: " + reasons,
          decision.score(),
          decision.decision());
    }
    if ("review".equalsIgnoreCase(decision.decision())) {
      throw new FraudBlockedException(
          "Transaction requires manual review; no ledger posting was executed",
          decision.score(),
          decision.decision());
    }
    throw new FraudBlockedException(
        "Transaction stopped: unrecognised Sentinel decision", 1.0, "block");
  }

  public void checkBeforeExecution(
      String transactionId, User user, Wallet wallet, BigDecimal amount, String operationType) {
    FraudDecisionResponse decision =
        evaluateTransaction(transactionId, user, wallet, amount, operationType, null);
    enforceDecision(decision);
  }

  private void handleDecision(
      FraudDecisionResponse decision, Long walletId, Long transactionId, String operationType) {
    if (decision == null || "allow".equalsIgnoreCase(decision.decision())) {
      return;
    }

    RiskLevel level = mapRiskLevel(decision.decision(), decision.score());
    String reason = buildReason(decision, operationType);
    Long flagTransactionId = transactionId != null ? transactionId : 0L;

    riskFlagService.createRiskFlag(
        walletId,
        flagTransactionId,
        level,
        RiskRuleType.FRAUD_ML_SCORE,
        BigDecimal.valueOf(decision.score()),
        reason);
  }

  private RiskLevel mapRiskLevel(String decision, double score) {
    if ("block".equalsIgnoreCase(decision) || score >= 0.85) {
      return RiskLevel.CRITICAL;
    }
    if ("review".equalsIgnoreCase(decision) || score >= 0.50) {
      return RiskLevel.HIGH;
    }
    return RiskLevel.MEDIUM;
  }

  private String buildReason(FraudDecisionResponse decision, String operationType) {
    StringBuilder sb = new StringBuilder();
    sb.append("Fraud ML [").append(operationType).append("]: ");
    sb.append(decision.decision().toUpperCase());
    sb.append(" (score=").append(String.format("%.4f", decision.score())).append(")");
    if (decision.rule_triggered() != null) {
      sb.append(" rule=").append(decision.rule_triggered());
    }
    if (decision.reasons() != null && !decision.reasons().isEmpty()) {
      sb.append(" — ").append(String.join("; ", decision.reasons()));
    }
    return sb.toString();
  }

  private TransactionEventRequest buildEvent(
      String transactionId, User user, Wallet wallet, BigDecimal amount, String operationType) {
    Map<String, Object> metadata = new HashMap<>();
    metadata.put("operation_type", operationType);
    metadata.put("wallet_id", wallet.getId());
    if (java.util.Set.of("transfer", "withdrawal", "payment", "debit")
            .contains(operationType.toLowerCase(java.util.Locale.ROOT))
        && wallet.getLedgerAccount() != null) {
      BigDecimal available = balances.computeBalance(wallet.getLedgerAccount());
      if (available != null) metadata.put("available_balance", available);
    }

    return new TransactionEventRequest(
        transactionId,
        String.valueOf(user.getId()),
        amount,
        wallet.getCurrency(),
        "sutura",
        mapOperationToMcc(operationType),
        resolveClientIp(),
        "web-" + user.getId(),
        "000000",
        properties.getDefaultCountry(),
        Instant.now(),
        properties.getDefaultChannel(),
        metadata);
  }

  private String mapOperationToMcc(String operationType) {
    return switch (operationType) {
      case "deposit" -> "6012";
      case "withdrawal" -> "6011";
      case "transfer" -> "4829";
      default -> "5999";
    };
  }

  private String resolveClientIp() {
    ServletRequestAttributes attrs =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
    if (attrs == null) {
      return "0.0.0.0";
    }
    HttpServletRequest request = attrs.getRequest();
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isBlank()) {
      return xForwardedFor.split(",")[0].trim();
    }
    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isBlank()) {
      return xRealIp;
    }
    return request.getRemoteAddr();
  }
}
