package com.mamadou.sutura.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mamadou.sutura.webhook.config.ModemPayConfig;
import com.mamadou.sutura.webhook.service.*;
import com.mamadou.sutura.withdrawal.service.WithdrawalReservationService;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class ModemPayWebhookModeTest {
    @Test void liveAccountsRejectTestAndMissingModesBeforeAnySettlement() {
        var signature=mock(WebhookSignatureService.class);when(signature.verifySignature(any(),any())).thenReturn(true);
        var deposits=mock(ProviderDepositSettlementService.class);var payouts=mock(WithdrawalReservationService.class);
        var config=new ModemPayConfig();config.setApiKey("sk_live_fixture");
        var service=new ModemPayWebhookService(signature,new ObjectMapper(),deposits,payouts,config);
        for(String mode: new String[]{",\"test_mode\":true",""}) {
            String body="{\"event\":\"charge.succeeded\",\"payload\":{\"id\":\"charge\",\"amount\":30,\"currency\":\"GMD\",\"reference\":\"ref\""+mode+"}}";
            assertThatThrownBy(() -> service.processWebhook(body,"signed")).isInstanceOf(SecurityException.class);
        }
        verifyNoInteractions(deposits,payouts);
    }
}
