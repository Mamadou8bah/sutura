package com.mamadou.sutura.notification.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ResendEmailSenderTest {
  @Test
  void usesHttpsAuthenticatedTransportWithTimeout() throws Exception {
    var client = mock(HttpClient.class);
    HttpResponse<Void> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(200);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(response);
    new ResendEmailSender(client, new ObjectMapper(), "private-test-key", "verified@example.com")
        .send("recipient@example.com", "Sign in", "One-time code");
    var request = ArgumentCaptor.forClass(HttpRequest.class);
    verify(client).send(request.capture(), any(HttpResponse.BodyHandler.class));
    assertEquals("https://api.resend.com/emails", request.getValue().uri().toString());
    assertEquals(
        "Bearer private-test-key",
        request.getValue().headers().firstValue("Authorization").orElseThrow());
    assertEquals(10, request.getValue().timeout().orElseThrow().getSeconds());
    assertTrue(request.getValue().bodyPublisher().orElseThrow().contentLength() > 0);
  }

  @Test
  void rejectsProviderFailureWithoutLeakingPayloadOrCredentials() throws Exception {
    var client = mock(HttpClient.class);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new java.io.IOException("private-credentials-and-body"));
    var failure =
        assertThrows(
            IllegalStateException.class,
            () ->
                new ResendEmailSender(
                        client, new ObjectMapper(), "private-key", "sender@example.com")
                    .send("recipient@example.com", "Sign in", "private-code"));
    assertFalse(failure.toString().contains("private-"));
    assertNull(failure.getCause());
  }
}
