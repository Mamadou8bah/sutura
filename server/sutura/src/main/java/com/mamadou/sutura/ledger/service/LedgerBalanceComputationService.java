package com.mamadou.sutura.ledger.service;

import com.mamadou.sutura.ledger.entity.LedgerAccount;
import com.mamadou.sutura.ledger.enums.LedgerAccountType;
import com.mamadou.sutura.ledger.enums.LedgerPostingSide;
import com.mamadou.sutura.ledger.repository.LedgerPostingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class LedgerBalanceComputationService {

    private final LedgerPostingRepository ledgerPostingRepository;

    @Transactional(readOnly = true)
    public BigDecimal computeBalance(LedgerAccount account) {
        BigDecimal netCredits = ledgerPostingRepository.netCreditsByAccountId(account.getId(), LedgerPostingSide.CREDIT);
        return hasDebitNormalBalance(account) ? netCredits.negate() : netCredits;
    }

    private boolean hasDebitNormalBalance(LedgerAccount account) {
        return account.getType() == LedgerAccountType.ASSET
                || account.getType() == LedgerAccountType.EXPENSE;
    }
}
