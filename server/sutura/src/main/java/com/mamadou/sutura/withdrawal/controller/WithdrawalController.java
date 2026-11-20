package com.mamadou.sutura.withdrawal.controller;

import com.mamadou.sutura.common.security.SecurityRoleUtils;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.withdrawal.dto.CreateWithdrawalRequest;
import com.mamadou.sutura.withdrawal.dto.WithdrawalResponse;
import com.mamadou.sutura.withdrawal.entity.Withdrawal;
import com.mamadou.sutura.withdrawal.service.WithdrawalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/withdrawals")
@RequiredArgsConstructor
public class WithdrawalController {

    private final WithdrawalService withdrawalService;
    private final com.mamadou.sutura.agent.service.CashOutQrService cashOutQrService;

    @PostMapping
    public ResponseEntity<WithdrawalResponse> createWithdrawal(
            @Valid @RequestBody CreateWithdrawalRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        boolean isAgent = SecurityRoleUtils.isAgent(currentUser);
        Withdrawal withdrawal = withdrawalService.createWithdrawal(request, currentUser.getId(), isAgent);
        return ResponseEntity.ok(WithdrawalResponse.from(withdrawal));
    }

    @GetMapping
    public ResponseEntity<List<WithdrawalResponse>> listWithdrawals(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(withdrawalService.listForUser(currentUser.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WithdrawalResponse> getWithdrawal(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(withdrawalService.getById(id, currentUser.getId()));
    }

    @GetMapping("/reference/{reference}")
    public ResponseEntity<WithdrawalResponse> getWithdrawalByReference(@PathVariable String reference) {
        return ResponseEntity.ok(withdrawalService.getByReference(reference));
    }
    @PostMapping("/reference/{reference}/qr")
    public ResponseEntity<com.mamadou.sutura.agent.service.CashOutQrService.Qr> cashQr(
            @PathVariable String reference, @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(cashOutQrService.issue(reference, currentUser.getId()));
    }
}
