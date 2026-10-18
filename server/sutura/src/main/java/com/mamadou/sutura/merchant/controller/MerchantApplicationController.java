package com.mamadou.sutura.merchant.controller;

import com.mamadou.sutura.merchant.service.MerchantApplicationService;
import com.mamadou.sutura.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/merchant/application")
@PreAuthorize("hasRole('MERCHANT')")
@RequiredArgsConstructor
public class MerchantApplicationController {
  private final MerchantApplicationService service;

  @GetMapping
  public MerchantApplicationService.Application status(@AuthenticationPrincipal User user) {
    return service.status(user.getId());
  }

  @PostMapping("/resubmit")
  public MerchantApplicationService.Application resubmit(
      @AuthenticationPrincipal User user,
      @Valid @RequestBody MerchantApplicationService.Correction correction) {
    return service.resubmit(user.getId(), correction);
  }
}
