package com.mamadou.sutura.admin.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mamadou.sutura.admin.dto.AdminPaymentResponse;
import com.mamadou.sutura.admin.dto.AdminPaymentResponse.FraudSummary;
import com.mamadou.sutura.fraud.entity.FraudEvaluationLog;
import com.mamadou.sutura.fraud.repository.FraudEvaluationLogRepository;
import com.mamadou.sutura.transaction.repository.TransactionRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class AdminPaymentRiskService {
    private final TransactionRepository transactions;
    private final FraudEvaluationLogRepository evaluations;
    private final ObjectMapper mapper;

    public record Feature(String feature, Double value, double contribution) {}
    public record Evaluation(Long id, String decision, BigDecimal score, List<String> reasons,
        String ruleTriggered, String provider, String providerTransactionId, String caseId,
        List<Feature> shapTopFeatures, LocalDateTime evaluatedAt, boolean detailsReadable) {}
    public record History(Long transactionId, String reference, String failureReason,
        String sentinelRecommendation, List<Evaluation> evaluations, int page, int totalPages, long totalElements) {}

    public Page<AdminPaymentResponse> payments(int page) {
        validatePage(page);
        var payments = transactions.findAll(PageRequest.of(page,50,Sort.by(Sort.Direction.DESC,"id")));
        if (payments.isEmpty()) return payments.map(t -> AdminPaymentResponse.from(t,null));
        var ids = payments.getContent().stream().map(t->t.getId()).toList();
        var refs = payments.getContent().stream().map(t->t.getReference()).toList();
        Map<Long,FraudEvaluationLogRepository.Summary> byId = new HashMap<>();
        Map<String,FraudEvaluationLogRepository.Summary> byRef = new HashMap<>();
        for (var evaluation : evaluations.latestForPayments(ids,refs)) {
            if (evaluation.getPersistedTransactionId()!=null) byId.put(evaluation.getPersistedTransactionId(),evaluation);
            else byRef.put(evaluation.getTransactionReference(),evaluation);
        }
        return payments.map(t->{
            var linked=byId.get(t.getId()); var legacy=byRef.get(t.getReference());
            var entry=linked==null?legacy:legacy!=null&&legacy.getId()>linked.getId()?legacy:linked;
            var risk=entry==null?null:new FraudSummary(entry.getId(),entry.getDecision(),validScore(entry.getScore()),entry.getCreatedAt());
            return AdminPaymentResponse.from(t,risk);
        });
    }

    public History history(Long id,int page) {
        validatePage(page);
        var payment=transactions.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Payment not found"));
        var history=evaluations.paymentHistory(id,payment.getReference(),PageRequest.of(page,10));
        return new History(id,payment.getReference(),payment.getFailureReason(),payment.getSentinelRecommendation(),
            history.getContent().stream().map(this::view).toList(),page,history.getTotalPages(),history.getTotalElements());
    }

    private Evaluation view(FraudEvaluationLog entry) {
        JsonNode reasons=read(entry.getReasonsJson()),features=read(entry.getFeaturesJson());
        boolean readable=(entry.getReasonsJson()==null||reasons.isArray()) && (entry.getFeaturesJson()==null||features.isObject());
        List<String> why=new ArrayList<>();
        if(reasons.isArray()) for(var reason:reasons) if(reason.isTextual()&&why.size()<32) why.add(reason.asText());
        List<Feature> contributions=new ArrayList<>();
        var shap=features.path("shapTopFeatures");
        if(shap.isArray()) for(var feature:shap) {
            if(contributions.size()>=32) break;
            var impact=feature.path("contribution"); var name=feature.path("feature");
            if(name.isTextual()&&name.asText().length()<=120&&impact.isNumber()&&Double.isFinite(impact.asDouble())) {
                var value=feature.path("value");
                contributions.add(new Feature(name.asText(),value.isNumber()&&Double.isFinite(value.asDouble())?value.asDouble():null,impact.asDouble()));
            }
        }
        return new Evaluation(entry.getId(),entry.getDecision(),validScore(entry.getScore()),why,entry.getRuleTriggered(),
            text(features,"provider"),text(features,"sentinelTransactionId"),text(features,"sentinelCaseId"),
            contributions,entry.getCreatedAt(),readable);
    }
    private JsonNode read(String value) {
        if(value==null||value.isBlank()) return com.fasterxml.jackson.databind.node.NullNode.getInstance();
        try { return mapper.readTree(value); } catch(Exception invalid) { return com.fasterxml.jackson.databind.node.NullNode.getInstance(); }
    }
    private String text(JsonNode node,String key) { var value=node.path(key);return value.isValueNode()&&!value.isNull()?value.asText():null; }
    private BigDecimal validScore(BigDecimal score) { return score!=null&&score.signum()>=0&&score.compareTo(BigDecimal.ONE)<=0?score:null; }
    private void validatePage(int page) { if(page<0||page>100000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid page"); }
}
