package com.mamadou.sutura.paymentlink.service;

import com.mamadou.sutura.paymentlink.dto.CreatePaymentLinkRequest;
import com.mamadou.sutura.paymentlink.dto.PaymentLinkResponse;
import com.mamadou.sutura.paymentlink.entity.PaymentLink;
import com.mamadou.sutura.paymentlink.repository.PaymentLinkRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.wallet.repository.WalletRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentLinkService {

  private final PaymentLinkRepository paymentLinkRepository;
  private final UserRepository userRepository;
  private final WalletRepository walletRepository;
  private final com.mamadou.sutura.transfer.service.TransferService transfers;
  private final com.mamadou.sutura.transaction.repository.TransactionRepository transactions;
  private final com.mamadou.sutura.auth.service.CurrentUserService currentUser;

  @Transactional
  public PaymentLinkResponse create(Long merchantId, CreatePaymentLinkRequest req) {
    User merchant =
        userRepository
            .findById(merchantId)
            .orElseThrow(() -> new IllegalArgumentException("Merchant not found"));
    var wallet =
        walletRepository
            .findById(req.getWalletId())
            .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));

    if (merchant.getRole() != com.mamadou.sutura.user.enums.Role.MERCHANT
        && merchant.getRole() != com.mamadou.sutura.user.enums.Role.DEVELOPER)
      throw new IllegalArgumentException(
          "Only merchant or developer integration accounts can create payment links");
    if (!merchant.isEnabled()
        || merchant.getUserStatus() != com.mamadou.sutura.user.enums.UserStatus.ACTIVE)
      throw new IllegalArgumentException(
          "Merchant account must be approved and active before creating collections");
    if (wallet.getUser().getId() != merchantId)
      throw new IllegalArgumentException("Wallet does not belong to merchant");
    if (wallet.getStatus() != com.mamadou.sutura.wallet.enums.WalletStatus.ACTIVE)
      throw new IllegalArgumentException("Merchant wallet is not active");
    if (req.getAmount() == null || req.getAmount().signum() <= 0 || req.getAmount().scale() > 4)
      throw new IllegalArgumentException(
          "A positive amount with at most four decimal places is required");
    if (req.getCurrency() == null || !wallet.getCurrency().equalsIgnoreCase(req.getCurrency()))
      throw new IllegalArgumentException("Currency does not match merchant wallet");
    if (req.getExpiresDays() != null && (req.getExpiresDays() < 1 || req.getExpiresDays() > 90))
      throw new IllegalArgumentException("Expiry must be between 1 and 90 days");
    PaymentLink link =
        PaymentLink.builder()
            .merchant(merchant)
            .wallet(wallet)
            .amount(req.getAmount())
            .currency(wallet.getCurrency())
            .description(req.getDescription())
            .reference(
                "plink-"
                    + java.util.UUID.randomUUID().toString().replaceAll("-", "").substring(0, 12))
            .expiresAt(
                LocalDateTime.now()
                    .plusDays(req.getExpiresDays() == null ? 7 : req.getExpiresDays()))
            .status("ACTIVE")
            .build();

    link.setPaymentUrl("/pay/" + link.getReference());
    link = paymentLinkRepository.save(link);
    return response(link);
  }

  @Transactional(readOnly = true)
  public List<PaymentLinkResponse> listForMerchant(Long merchantId) {
    return paymentLinkRepository.findByMerchantIdOrderByIdDesc(merchantId).stream()
        .map(this::response)
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public PaymentLinkResponse getById(Long merchantId, Long linkId) {
    PaymentLink link =
        paymentLinkRepository
            .findByIdAndMerchantId(linkId, merchantId)
            .orElseThrow(() -> new IllegalArgumentException("Payment link not found"));
    return response(link);
  }

  @Transactional(readOnly = true)
  public PaymentLinkResponse lookup(String reference) {
    return response(
        paymentLinkRepository
            .findByReferenceIgnoreCase(reference)
            .orElseThrow(() -> new IllegalArgumentException("Payment link not found")));
  }

  @Transactional
  public PaymentLinkResponse pay(String reference, Long sourceWalletId) {
    var payer = currentUser.getCurrentUser();
    if (payer == null) throw new IllegalArgumentException("Sign in to pay");
    var link =
        paymentLinkRepository
            .findForPayment(reference)
            .orElseThrow(() -> new IllegalArgumentException("Payment link not found"));
    if (link.getTransactionReference() != null) {
      if (link.getPayerId() != payer.getId()
          || (sourceWalletId != null && !sourceWalletId.equals(link.getPayerWalletId())))
        throw new IllegalArgumentException("Payment link is already claimed by another payment");
      return response(link);
    }
    if (!"ACTIVE".equals(link.getStatus()) || !link.getExpiresAt().isAfter(LocalDateTime.now()))
      throw new IllegalArgumentException("Payment link has expired or is unavailable");
    if (payer.getId() == link.getMerchant().getId())
      throw new IllegalArgumentException("Cannot pay your own collection link");
    var request = new com.mamadou.sutura.transfer.dto.TransferRequest();
    request.setSourceWalletId(sourceWalletId);
    request.setDestinationWalletId(link.getWallet().getId());
    request.setAmount(link.getAmount());
    request.setDescription("Merchant collection: " + link.getReference());
    request.setReference("collection-" + java.util.UUID.randomUUID());
    var result = transfers.transfer(request, "collection:" + link.getReference());
    link.setTransactionReference(result.getTransaction().getReference());
    link.setPayerId(payer.getId());
    link.setPayerWalletId(result.getTransaction().getSourceWalletId());
    paymentLinkRepository.save(link);
    return response(link);
  }

  private PaymentLinkResponse response(PaymentLink link) {
    var response = PaymentLinkResponse.from(link);
    if (link.getTransactionReference() != null) {
      var tx = transactions.findByReference(link.getTransactionReference()).orElseThrow();
      response.setStatus(
          switch (tx.getStatus()) {
            case COMPLETED -> "PAID";
            case PENDING -> "REVIEW";
            case REVERSED -> "REFUNDED";
            default -> "FAILED";
          });
    } else if (!link.getExpiresAt().isAfter(LocalDateTime.now())) response.setStatus("EXPIRED");
    return response;
  }
}
