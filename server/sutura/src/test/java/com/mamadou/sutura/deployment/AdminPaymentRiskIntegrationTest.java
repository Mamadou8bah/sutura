package com.mamadou.sutura.deployment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mamadou.sutura.transaction.entity.Transaction;
import com.mamadou.sutura.transaction.enums.*;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import com.mamadou.sutura.fraud.entity.FraudEvaluationLog;
import com.mamadou.sutura.fraud.repository.FraudEvaluationLogRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AdminPaymentRiskIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired TransactionRepository transactions;
    @Autowired FraudEvaluationLogRepository logs;
    @Autowired ObjectMapper mapper;
    MockMvc mvc;
    @BeforeEach void setup() { mvc=webAppContextSetup(context).apply(springSecurity()).build(); }

    private Transaction payment(String reason) {
        return transactions.saveAndFlush(Transaction.builder().reference("risk-test-"+UUID.randomUUID())
            .type(TransactionType.TRANSFER).status(TransactionStatus.FAILED).amount(new BigDecimal("125"))
            .currency("GMD").failureReason(reason).build());
    }
    private FraudEvaluationLog log(Transaction tx,String decision,String score,boolean legacy,String reasons,String features) {
        return logs.saveAndFlush(FraudEvaluationLog.builder().transactionReference(tx.getReference())
            .persistedTransactionId(legacy?null:tx.getId()).operationType("transfer").amount(tx.getAmount())
            .currency(tx.getCurrency()).decision(decision).score(new BigDecimal(score)).reasonsJson(reasons)
            .featuresJson(features).ruleTriggered("HIGH_AMOUNT").build());
    }

    @Test void latestScoreAndFullReasonsAreAvailableOnlyToAdmins() throws Exception {
        var tx=payment("Blocked by fraud detection");
        log(tx,"allow","0.2",false,"[]","{}");
        log(tx,"block","0.91",false,"[\"Unusual transfer amount\",\"Blocked by rule\"]",
            "{\"provider\":\"sentinel\",\"sentinelTransactionId\":\"sentinel-fixture\",\"ipAddress\":\"private-fixture\",\"shapTopFeatures\":[{\"feature\":\"amount\",\"value\":125,\"contribution\":0.4}]}");
        var response=mvc.perform(get("/api/v1/admin/operations/payments").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andReturn();
        var root=mapper.readTree(response.getResponse().getContentAsString());
        com.fasterxml.jackson.databind.JsonNode found=null;
        for(var row:root.path("content")) if(row.path("id").asLong()==tx.getId()) found=row;
        assertThat(found).isNotNull();
        assertThat(found.path("fraud").path("score").asDouble()).isEqualTo(.91);
        assertThat(found.path("fraud").path("decision").asText()).isEqualTo("block");
        mvc.perform(get("/api/v1/admin/operations/payments/"+tx.getId()+"/risk").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
            .andExpect(jsonPath("$.evaluations[0].reasons[0]").value("Unusual transfer amount"))
            .andExpect(jsonPath("$.evaluations[0].shapTopFeatures[0].contribution").value(.4))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private-fixture"))));
        for(String role:new String[]{"USER","AGENT","MERCHANT","DEVELOPER"}) {
            mvc.perform(get("/api/v1/admin/operations/payments/"+tx.getId()+"/risk").with(user("other").roles(role)))
                .andExpect(status().isForbidden());
        }
    }

    @Test void outagesDoNotInventAFraudScore() throws Exception {
        var tx=payment("Sentinel scoring unavailable");
        mvc.perform(get("/api/v1/admin/operations/payments/"+tx.getId()+"/risk").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(0))
            .andExpect(jsonPath("$.evaluations").isEmpty())
            .andExpect(jsonPath("$.failureReason").value("Sentinel scoring unavailable"));
    }

    @Test void legacyReferencesAndDamagedExplanationsDoNotCrashRiskView() throws Exception {
        var tx=payment("Awaiting review");
        log(tx,"review","0.4",true,"not-json","{");
        mvc.perform(get("/api/v1/admin/operations/payments/"+tx.getId()+"/risk").with(user("admin").roles("ADMIN")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.evaluations[0].score").value(.4))
            .andExpect(jsonPath("$.evaluations[0].detailsReadable").value(false))
            .andExpect(jsonPath("$.evaluations[0].reasons").isEmpty());
    }

    @Test void missingPaymentsAndInvalidHistoryPagesHaveUsefulStatuses() throws Exception {
        mvc.perform(get("/api/v1/admin/operations/payments/9223372036854775807/risk").with(user("admin").roles("ADMIN")))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/admin/operations/payments/1/risk?page=-1").with(user("admin").roles("ADMIN")))
            .andExpect(status().isBadRequest());
    }
}
