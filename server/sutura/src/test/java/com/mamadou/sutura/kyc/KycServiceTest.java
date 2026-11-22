package com.mamadou.sutura.kyc;

import com.mamadou.sutura.auth.service.CurrentUserService;
import com.mamadou.sutura.kyc.client.SentinelKycClient;
import com.mamadou.sutura.kyc.dto.SentinelKycResponse;
import com.mamadou.sutura.kyc.entity.KycVerification;
import com.mamadou.sutura.kyc.repository.KycVerificationRepository;
import com.mamadou.sutura.kyc.service.KycService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import com.mamadou.sutura.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class KycServiceTest {
    private final CurrentUserService current = mock(CurrentUserService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final KycVerificationRepository records = mock(KycVerificationRepository.class);
    private final SentinelKycClient client = mock(SentinelKycClient.class);
    private final KycService service = new KycService(current, users, records, client);
    private final User user = User.builder().id(7).firstName("Mamadou").lastName("Bah").role(Role.USER).build();

    @BeforeEach
    void setup() {
        when(current.getCurrentUser()).thenReturn(user);
        when(users.findForKycUpdate(7L)).thenReturn(Optional.of(user));
        when(records.findById(7L)).thenReturn(Optional.empty());
        when(records.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void startsUsingAuthenticatedIdentityAndPersistsLink() {
        when(client.start("7", "Mamadou Bah")).thenReturn(response("PENDING", null));
        var result = service.start();
        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.sessionId()).isEqualTo(42);
        verify(client).start("7", "Mamadou Bah");
        verify(records).save(argThat(r -> r.getUserId() == 7 && r.getExternalCustomerId().equals("7")));
    }

    @Test
    void activeSessionIsReusedWithoutCreatingAnother() {
        when(records.findById(7L)).thenReturn(Optional.of(record("PENDING")));
        when(client.start("7", "Mamadou Bah")).thenReturn(response("PENDING", null));
        assertThat(service.start().sessionId()).isEqualTo(42);
        verify(client).start("7", "Mamadou Bah");
    }

    @Test
    void expiredSessionCanBeReplaced() {
        var old = record("PENDING");
        old.setExpiresAt(Instant.now().minusSeconds(10));
        when(records.findById(7L)).thenReturn(Optional.of(old));
        when(client.start("7", "Mamadou Bah")).thenReturn(response("PENDING", null));
        assertThat(service.start().status()).isEqualTo("PENDING");
        verify(client).start("7", "Mamadou Bah");
    }

    @ParameterizedTest
    @ValueSource(strings = {"FLAGGED", "VERIFIED"})
    void completedDecisionsCannotBeDiscardedByStartingAgain(String status) {
        var previous = record(status);
        previous.setExpiresAt(Instant.now().minusSeconds(10));
        when(records.findById(7L)).thenReturn(Optional.of(previous));
        assertThat(service.start().status()).isEqualTo(status);
        verifyNoInteractions(client);
    }

    @ParameterizedTest
    @ValueSource(strings = {"VERIFIED", "FLAGGED", "REJECTED"})
    void refreshPersistsAuthoritativeOutcome(String status) {
        when(records.findById(7L)).thenReturn(Optional.of(record("PENDING")));
        when(client.get(42L, "7")).thenReturn(response("COMPLETE", status));
        assertThat(service.refresh().status()).isEqualTo(status);
        verify(records).save(argThat(r -> r.getStatus().equals(status)));
    }

    @Test
    void failedRefreshDoesNotChangeStatusOrSave() {
        var previous = record("PENDING");
        when(records.findById(7L)).thenReturn(Optional.of(previous));
        when(client.get(42L, "7")).thenThrow(new RestClientException("timeout"));
        assertThatThrownBy(service::refresh).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(503));
        assertThat(previous.getStatus()).isEqualTo("PENDING");
        verify(records, never()).save(any());
    }

    @Test
    void seededVerificationRefreshDoesNotCallSentinelOrRewriteEvidence() {
        var seeded = record("VERIFIED");
        seeded.setSentinelSessionId(-1000000007L);
        seeded.setExplanation("Presentation fixture; no identity evidence was checked.");
        when(records.findById(7L)).thenReturn(Optional.of(seeded));
        var result = service.refresh();
        assertThat(result.status()).isEqualTo("VERIFIED");
        assertThat(result.explanation()).isEqualTo(seeded.getExplanation());
        verifyNoInteractions(client);
        verify(records, never()).save(any());
    }

    @Test
    void invalidPendingSessionMustBeRestartedAndCanBeReplaced() {
        var invalid = record("PENDING");
        invalid.setSentinelSessionId(-7L);
        when(records.findById(7L)).thenReturn(Optional.of(invalid));
        assertThatThrownBy(service::refresh).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(409));
        verifyNoInteractions(client);
        when(client.start("7", "Mamadou Bah")).thenReturn(response("PENDING", null));
        assertThat(service.start().sessionId()).isEqualTo(42L);
    }

    @Test
    void invalidCallbackIsRejectedBeforeAccessingAnyAccount() {
        assertThatThrownBy(() -> service.refreshFromCallback(7L, -7L))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
        verifyNoInteractions(users, client);
    }

    @Test
    void agentsCannotStartVerificationForOtherPeople() {
        user.setRole(Role.AGENT);
        assertThatThrownBy(service::start).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(403));
        verifyNoInteractions(client);
    }

    @Test
    void unauthenticatedRequestsFail() {
        when(current.getCurrentUser()).thenReturn(null);
        assertThatThrownBy(service::status).isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(401));
    }

    private KycVerification record(String status) {
        var r = new KycVerification();
        r.setUserId(7L);
        r.setSentinelSessionId(42L);
        r.setExternalCustomerId("7");
        r.setStatus(status);
        r.setHostedUrl("http://localhost:5173/kyc/test");
        r.setExpiresAt(Instant.now().plusSeconds(1800));
        return r;
    }

    private SentinelKycResponse response(String sessionStatus, String kycStatus) {
        return new SentinelKycResponse(42L, sessionStatus, "7", 9L, kycStatus,
                0.9, 0.9, "Identity result", "http://localhost:5173/kyc/test", Instant.now().plusSeconds(1800));
    }
}
