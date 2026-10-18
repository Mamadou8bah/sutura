package com.mamadou.sutura.admin.controller;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.merchant.repository.MerchantProfileRepository;
import com.mamadou.sutura.deposit.repository.DepositRepository;
import com.mamadou.sutura.withdrawal.repository.WithdrawalRepository;
import com.mamadou.sutura.paymentlink.repository.PaymentLinkRepository;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@RestController
@RequestMapping("/api/v1/admin/operations")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminOperationsController {
 private final UserRepository users;
 private final com.mamadou.sutura.wallet.service.WalletService wallets;
 private final MerchantProfileRepository merchants;
 private final DepositRepository deposits;
 private final WithdrawalRepository withdrawals;
 private final PaymentLinkRepository collections;
 private final TransactionRepository transactions;
 private final KycVerificationRepository verification;
 private final com.mamadou.sutura.audit.repository.AuditLogRepository audit;
 public record Entry(long id,String reference,String name,String kind,String status,BigDecimal amount,String currency,Long accountId,Long agentId,String detail,LocalDateTime createdAt){}
 @GetMapping("/payments") @Transactional(readOnly=true)
 public Page<com.mamadou.sutura.transaction.dto.TransactionResponse> payments(@RequestParam(defaultValue="0") int page){if(page<0||page>100000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid page");return transactions.findAll(PageRequest.of(page,50,Sort.by(Sort.Direction.DESC,"id"))).map(t->com.mamadou.sutura.transaction.dto.TransactionResponse.builder().id(t.getId()).reference(t.getReference()).type(t.getType()).status(t.getStatus()).sourceWalletId(t.getSourceWallet()==null?null:t.getSourceWallet().getId()).destinationWalletId(t.getDestinationWallet()==null?null:t.getDestinationWallet().getId()).amount(t.getAmount()).currency(t.getCurrency()).description(t.getDescription()).createdAt(t.getCreatedAt()).updatedAt(t.getUpdatedAt()).build());}
 public record MerchantDecision(String decision,String reason){}
 @PostMapping("/merchants/{id}/decision") @Transactional
 public java.util.Map<String,String> decideMerchant(@PathVariable Long id,@RequestBody MerchantDecision request,@org.springframework.security.core.annotation.AuthenticationPrincipal com.mamadou.sutura.user.entity.User admin){
  if(admin==null||admin.getRole()!=Role.ADMIN)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Admin account required");
  if(request.reason()==null||request.reason().isBlank()||request.reason().length()>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enter a review reason (up to 1000 characters)");
  var decision=switch(String.valueOf(request.decision())){case "APPROVED"->com.mamadou.sutura.merchant.enums.MerchantVerificationStatus.APPROVED;case "REJECTED"->com.mamadou.sutura.merchant.enums.MerchantVerificationStatus.REJECTED;case "MORE_INFO_REQUIRED"->com.mamadou.sutura.merchant.enums.MerchantVerificationStatus.MORE_INFO_REQUIRED;default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid review decision");};
  var merchant=merchants.findForReview(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Merchant not found"));
  if(merchant.getVerificationStatus()==decision)return java.util.Map.of("status",decision.name());
  if(merchant.getVerificationStatus()!=com.mamadou.sutura.merchant.enums.MerchantVerificationStatus.PENDING_REVIEW&&merchant.getVerificationStatus()!=com.mamadou.sutura.merchant.enums.MerchantVerificationStatus.MORE_INFO_REQUIRED)throw new ResponseStatusException(HttpStatus.CONFLICT,"Merchant application has already been decided");
  var user=users.findForKycUpdate(merchant.getUser().getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Merchant account not found"));
  if(decision==com.mamadou.sutura.merchant.enums.MerchantVerificationStatus.APPROVED){if(user.getRole()!=Role.MERCHANT||!verification.findById(user.getId()).map(v->"VERIFIED".equals(v.getStatus())).orElse(false))throw new ResponseStatusException(HttpStatus.CONFLICT,"Verified identity is required before merchant approval");if(user.getUserStatus()!=com.mamadou.sutura.user.enums.UserStatus.PENDING_REVIEW)throw new ResponseStatusException(HttpStatus.CONFLICT,"Merchant account is not awaiting approval");user.setUserStatus(com.mamadou.sutura.user.enums.UserStatus.ACTIVE);users.save(user);wallets.ensureMerchantCollectionsWallet(user.getId());}
  var previous=merchant.getVerificationStatus().name();merchant.setVerificationStatus(decision);merchant.setReviewedAt(LocalDateTime.now());merchant.setRejectionReason(decision==com.mamadou.sutura.merchant.enums.MerchantVerificationStatus.APPROVED?null:request.reason().trim());merchants.save(merchant);
  audit.save(com.mamadou.sutura.audit.entity.AuditLog.builder().actorId(admin.getId()).actorEmail(admin.getEmail()==null?admin.getPhoneNumber():admin.getEmail()).timestamp(LocalDateTime.now()).actionType("MERCHANT_REVIEW").entityType("MERCHANT").entityId(id).previousState(previous).newState(decision.name()).changeDescription(request.reason().trim()).success(true).build());
  return java.util.Map.of("status",decision.name());
 }
 @GetMapping("/{kind}") @Transactional(readOnly=true)
 public Page<Entry> list(@PathVariable String kind,@RequestParam(defaultValue="0") int page){return entries(kind,page,null);}
 @GetMapping("/records/{kind}/{id}") @Transactional(readOnly=true)
 public Entry record(@PathVariable String kind,@PathVariable Long id){return entries(kind,0,id).stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Record not found"));}
 private <T> Page<T> one(java.util.Optional<T> record){return new PageImpl<>(record.stream().toList());}
 private Page<Entry> entries(String kind,int page,Long id){
  if(page<0||page>100000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid page");
  var paging=PageRequest.of(page,50,Sort.by(Sort.Direction.DESC,kind.equals("identity")?"userId":"id"));
  return switch(kind){
   case "customers","agents" -> (id==null?users.findByRole(kind.equals("agents")?Role.AGENT:Role.USER,paging):one(users.findById(id).filter(u->u.getRole()==(kind.equals("agents")?Role.AGENT:Role.USER)))).map(u->new Entry(u.getId(),u.getPhoneNumber(),u.getFirstName()+" "+u.getLastName(),u.getRole().name(),!u.isAccountNonLocked()?"LOCKED":!u.isEnabled()?"DISABLED":String.valueOf(u.getUserStatus()),null,null,u.getId(),null,u.getEmail(),u.getLastLoginAt()));
   case "merchants" -> (id==null?merchants.findAll(paging):one(merchants.findById(id))).map(m->new Entry(m.getId(),null,m.getBusinessName(),"MERCHANT",String.valueOf(m.getVerificationStatus()),null,null,m.getUser().getId(),null,m.getCityOrArea()+" · "+m.getCategory(),m.getSubmittedAt()));
   case "deposits" -> (id==null?deposits.findAll(paging):one(deposits.findById(id))).map(d->new Entry(d.getId(),d.getReference(),d.getUser().getFirstName()+" "+d.getUser().getLastName(),d.getDepositType()==null?"DEPOSIT":d.getDepositType().name(),d.getStatus().name(),d.getAmount(),d.getCurrency(),d.getUser().getId(),d.getAgent()==null?null:d.getAgent().getId(),d.getFailureReason(),d.getCreatedAt()));
   case "withdrawals" -> (id==null?withdrawals.findAll(paging):one(withdrawals.findById(id))).map(w->new Entry(w.getId(),w.getReference(),w.getUser().getFirstName()+" "+w.getUser().getLastName(),w.getWithdrawalType()==null?"WITHDRAWAL":w.getWithdrawalType().name(),w.getStatus().name(),w.getAmount(),w.getCurrency(),w.getUser().getId(),w.getAgent()==null?null:w.getAgent().getId(),w.getRejectionReason(),w.getCreatedAt()));
   case "collections" -> (id==null?collections.findAll(paging):one(collections.findById(id))).map(c->{String status=c.getStatus();if(c.getTransactionReference()!=null){var tx=transactions.findByReference(c.getTransactionReference());status=tx.map(t->switch(t.getStatus().name()){case "COMPLETED"->"PAID";case "REVERSED"->"REFUNDED";case "PENDING","PENDING_REVIEW"->"REVIEW";case "FAILED"->"FAILED";default->"PENDING";}).orElse("PENDING");}else if(c.getExpiresAt()!=null&&!c.getExpiresAt().isAfter(LocalDateTime.now()))status="EXPIRED";return new Entry(c.getId(),c.getReference(),c.getMerchant().getFirstName()+" "+c.getMerchant().getLastName(),"COLLECTION",status,c.getAmount(),c.getCurrency(),c.getMerchant().getId(),null,c.getDescription(),null);});
   case "identity" -> (id==null?verification.findAll(paging):one(verification.findById(id))).map(v->new Entry(v.getUserId(),v.getSentinelSessionId()==null?null:String.valueOf(v.getSentinelSessionId()),"Account #"+v.getUserId(),"IDENTITY",v.getStatus(),null,null,v.getUserId(),null,v.getExplanation(),v.getUpdatedAt()==null?null:LocalDateTime.ofInstant(v.getUpdatedAt(),java.time.ZoneOffset.UTC)));
   default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unknown operations section");
  };
 }
}
