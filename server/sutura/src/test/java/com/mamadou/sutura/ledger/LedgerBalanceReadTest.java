package com.mamadou.sutura.ledger;

import com.mamadou.sutura.ledger.entity.*;
import com.mamadou.sutura.ledger.enums.*;
import com.mamadou.sutura.ledger.service.LedgerBalanceComputationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ActiveProfiles("test")
@Transactional
class LedgerBalanceReadTest {
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory factory;
    @Autowired LedgerBalanceComputationService balances;

    @ParameterizedTest @EnumSource(LedgerAccountType.class)
    void exactBalanceUsesOneStatementForEveryAccountType(LedgerAccountType type) {
        var account = LedgerAccount.builder().code("read-" + UUID.randomUUID())
                .name("Read test").currency("GMD").type(type).build();
        em.persist(account);
        em.flush();
        assertThat(balances.computeBalance(account)).isEqualByComparingTo("0");
        post(account, LedgerPostingSide.CREDIT, "100.1234");
        post(account, LedgerPostingSide.DEBIT, "27.7778");
        em.flush();
        em.clear();
        var statistics = factory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var expected = new BigDecimal("72.3456");
        if (type == LedgerAccountType.ASSET || type == LedgerAccountType.EXPENSE) expected = expected.negate();
        assertThat(balances.computeBalance(account)).isEqualByComparingTo(expected);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
    }

    private void post(LedgerAccount account, LedgerPostingSide side, String amount) {
        em.persist(LedgerPosting.builder().account(account).side(side).amount(new BigDecimal(amount))
                .currency("GMD").traceId("read-" + UUID.randomUUID()).build());
    }
}
