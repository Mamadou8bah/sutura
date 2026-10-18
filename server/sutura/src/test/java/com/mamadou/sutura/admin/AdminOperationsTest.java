package com.mamadou.sutura.admin;
import com.mamadou.sutura.admin.controller.AdminOperationsController;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.*;
import com.mamadou.sutura.merchant.repository.MerchantProfileRepository;
import com.mamadou.sutura.merchant.entity.MerchantProfile;
import com.mamadou.sutura.merchant.enums.MerchantVerificationStatus;
import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import com.mamadou.sutura.kyc.entity.KycVerification;
import com.mamadou.sutura.deposit.repository.DepositRepository;
import com.mamadou.sutura.withdrawal.repository.WithdrawalRepository;
import com.mamadou.sutura.paymentlink.repository.PaymentLinkRepository;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AdminOperationsTest {
 @Configuration @EnableMethodSecurity static class Config {
  @Bean UserRepository users(){return mock(UserRepository.class);}
  @Bean MerchantProfileRepository merchants(){return mock(MerchantProfileRepository.class);}
  @Bean KycVerificationRepository kyc(){return mock(KycVerificationRepository.class);}
  @Bean AuditLogRepository audit(){return mock(AuditLogRepository.class);}
  @Bean AdminOperationsController controller(UserRepository users,MerchantProfileRepository merchants,KycVerificationRepository kyc,AuditLogRepository audit){return new AdminOperationsController(users,mock(com.mamadou.sutura.wallet.service.WalletService.class),merchants,mock(DepositRepository.class),mock(WithdrawalRepository.class),mock(PaymentLinkRepository.class),mock(TransactionRepository.class),kyc,audit);}
 }
 AnnotationConfigApplicationContext context;AdminOperationsController controller;UserRepository users;MerchantProfileRepository merchants;KycVerificationRepository kyc;AuditLogRepository audit;
 @BeforeEach void setup(){context=new AnnotationConfigApplicationContext(Config.class);controller=context.getBean(AdminOperationsController.class);users=context.getBean(UserRepository.class);merchants=context.getBean(MerchantProfileRepository.class);kyc=context.getBean(KycVerificationRepository.class);audit=context.getBean(AuditLogRepository.class);authenticate("ADMIN");}
 @AfterEach void cleanup(){SecurityContextHolder.clearContext();context.close();}
 void authenticate(String role){SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("staff","unused",List.of(new SimpleGrantedAuthority("ROLE_"+role))));}
 @Test void mobileRolesCannotReadPlatformRecords(){for(String role:List.of("USER","MERCHANT","AGENT","DEVELOPER")){authenticate(role);assertThrows(AccessDeniedException.class,()->controller.list("customers",0));assertThrows(AccessDeniedException.class,()->controller.payments(0));assertThrows(AccessDeniedException.class,()->controller.record("customers",12L));assertThrows(AccessDeniedException.class,()->controller.decideMerchant(1L,new AdminOperationsController.MerchantDecision("APPROVED","Reason"),admin()));}verifyNoInteractions(users,merchants,kyc);}
 @Test void customerDirectoryIsBoundedAndExcludesOtherRoles(){when(users.findByRole(eq(Role.USER),any())).thenReturn(Page.empty());controller.list("customers",2);verify(users).findByRole(eq(Role.USER),argThat((Pageable p)->p.getPageSize()==50&&p.getPageNumber()==2));}
 @Test void invalidSectionAndPageNeverReadRepositories(){assertThrows(ResponseStatusException.class,()->controller.list("unknown",0));assertThrows(ResponseStatusException.class,()->controller.list("customers",-1));verifyNoInteractions(users,merchants,kyc);}
 @Test void directRecordLookupChecksRoleAndDoesNotDependOnFirstPage(){var user=User.builder().id(501).role(Role.USER).firstName("Fatou").lastName("Jallow").userStatus(UserStatus.ACTIVE).enabled(true).build();when(users.findById(501L)).thenReturn(Optional.of(user));assertEquals(501L,controller.record("customers",501L).id());assertThrows(ResponseStatusException.class,()->controller.record("agents",501L));verify(users,never()).findByRole(any(),any());}
 User merchant(){var user=User.builder().id(21).role(Role.MERCHANT).userStatus(UserStatus.PENDING_REVIEW).build();var profile=MerchantProfile.builder().id(1L).user(user).verificationStatus(MerchantVerificationStatus.PENDING_REVIEW).build();when(merchants.findForReview(1L)).thenReturn(Optional.of(profile));when(users.findForKycUpdate(21L)).thenReturn(Optional.of(user));return user;}
 User admin(){return User.builder().id(9).role(Role.ADMIN).email("admin@example.invalid").build();}
 @Test void merchantApprovalCannotBypassIdentity(){var user=merchant();when(kyc.findById(21L)).thenReturn(Optional.empty());assertThrows(ResponseStatusException.class,()->controller.decideMerchant(1L,new AdminOperationsController.MerchantDecision("APPROVED","Reviewed business"),admin()));assertEquals(UserStatus.PENDING_REVIEW,user.getUserStatus());verify(users,never()).save(any());verifyNoInteractions(audit);}
 @Test void verifiedMerchantApprovalActivatesAndAuditsOnce(){var user=merchant();var verification=new KycVerification();verification.setStatus("VERIFIED");when(kyc.findById(21L)).thenReturn(Optional.of(verification));controller.decideMerchant(1L,new AdminOperationsController.MerchantDecision("APPROVED","Reviewed business"),admin());controller.decideMerchant(1L,new AdminOperationsController.MerchantDecision("APPROVED","Reviewed business"),admin());assertEquals(UserStatus.ACTIVE,user.getUserStatus());verify(users,times(1)).save(user);verify(audit,times(1)).save(argThat(log->log.getActorId()==9L&&log.getNewState().equals("APPROVED")&&log.getActionType().equals("MERCHANT_REVIEW")));}
}
