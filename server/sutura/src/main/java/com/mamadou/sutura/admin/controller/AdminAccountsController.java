package com.mamadou.sutura.admin.controller;

import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.enums.UserStatus;
import com.mamadou.sutura.user.repository.UserRepository;
import com.mamadou.sutura.audit.entity.AuditLog;
import com.mamadou.sutura.audit.repository.AuditLogRepository;
import com.mamadou.sutura.auth.service.RefreshTokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/accounts")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAccountsController {
    private final UserRepository users;
    private final BCryptPasswordEncoder passwords;
    private final RefreshTokenService tokens;
    private final AuditLogRepository audit;

    public record AgentRequest(
        @NotBlank @Size(max=100) String firstName,
        @NotBlank @Size(max=100) String lastName,
        @NotBlank @Pattern(regexp="\\+[1-9][0-9]{7,14}") String phoneNumber,
        @NotBlank @Email @Size(max=254) String email,
        @NotBlank @Size(min=12,max=72) String password,
        @NotBlank @Size(max=1000) String reason) {}
    public record StatusRequest(@NotBlank String status, @NotBlank @Size(max=1000) String reason) {}

    @PostMapping("/agents") @Transactional
    public Map<String,Object> createAgent(@Valid @RequestBody AgentRequest request, @AuthenticationPrincipal User admin) {
        requireAdmin(admin);
        String email=request.email().trim().toLowerCase(java.util.Locale.ROOT);
        if(users.existsByPhoneNumber(request.phoneNumber()) || users.existsByEmail(email))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Phone number or email is already registered");
        if(request.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Password must be at most 72 UTF-8 bytes");
        User agent=users.saveAndFlush(User.builder().firstName(request.firstName().trim()).lastName(request.lastName().trim())
            .phoneNumber(request.phoneNumber()).email(email).passwordHash(passwords.encode(request.password()))
            .role(Role.AGENT).userStatus(UserStatus.ACTIVE).enabled(true).phoneVerified(false)
            .registrationStage(0).failedLoginAttempts(0).build());
        record(admin,agent,"AGENT_CREATED",null,"ACTIVE",request.reason());
        return Map.of("id",agent.getId(),"status","ACTIVE");
    }

    @GetMapping("/{id}") @Transactional(readOnly=true)
    public Map<String,Object> account(@PathVariable Long id,@AuthenticationPrincipal User admin) {
        requireAdmin(admin);
        User user=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));
        if(user.getRole()!=Role.USER && user.getRole()!=Role.AGENT && user.getRole()!=Role.MERCHANT)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This account cannot be managed here");
        return Map.of("id",user.getId(),"status",user.getUserStatus().name(),"role",user.getRole().name(),"enabled",user.isEnabled(),"locked",!user.isAccountNonLocked());
    }

    @PostMapping("/{id}/status") @Transactional
    public Map<String,String> status(@PathVariable Long id,@Valid @RequestBody StatusRequest request,@AuthenticationPrincipal User admin) {
        requireAdmin(admin);
        User user=users.findForKycUpdate(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));
        if(user.getRole()!=Role.USER && user.getRole()!=Role.AGENT && user.getRole()!=Role.MERCHANT)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This account cannot be changed here");
        UserStatus next=switch(request.status()){case "ACTIVE"->UserStatus.ACTIVE;case "SUSPENDED"->UserStatus.SUSPENDED;
            default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose ACTIVE or SUSPENDED");};
        UserStatus before=user.getUserStatus();
        if(before!=UserStatus.ACTIVE && before!=UserStatus.SUSPENDED)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Only active or suspended accounts can use this action");
        if(before==next)return Map.of("status",next.name());
        user.setUserStatus(next);if(next==UserStatus.SUSPENDED)user.setTokenVersion(user.getTokenVersion()+1);users.save(user);
        if(next==UserStatus.SUSPENDED)tokens.revokeAllUserRefreshTokens(user);
        record(admin,user,"ACCOUNT_STATUS",before.name(),next.name(),request.reason());
        return Map.of("status",next.name());
    }
    private void requireAdmin(User admin){if(admin==null || admin.getRole()!=Role.ADMIN)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Admin account required");}
    private void record(User admin,User user,String action,String before,String after,String reason){
        audit.save(AuditLog.builder().actorId(admin.getId()).actorEmail(admin.getEmail()==null?admin.getPhoneNumber():admin.getEmail())
            .timestamp(LocalDateTime.now()).actionType(action).entityType("USER").entityId(user.getId())
            .previousState(before).newState(after).changeDescription(reason.trim()).success(true).build());
    }
}
