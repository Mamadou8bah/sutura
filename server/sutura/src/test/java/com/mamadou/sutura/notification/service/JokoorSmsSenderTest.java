package com.mamadou.sutura.notification.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class JokoorSmsSenderTest {
  @Test
  void submitsAnAuthenticatedImmediateSmsWithUnmodifiedContent() throws Exception {
    var client = mock(HttpClient.class);
    HttpResponse<Void> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(201);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenReturn(response);
    var mapper = new ObjectMapper();
    String message = "Sutura code: 012345. Do not share. \"é\"\nExpires soon.";
    new JokoorSmsSender(client, mapper, "sk_live_private_test").send("+2207654321", message);
    var captured = ArgumentCaptor.forClass(HttpRequest.class);
    verify(client).send(captured.capture(), any(HttpResponse.BodyHandler.class));
    var request = captured.getValue();
    assertEquals("https://api.jokoor.com/v1/sms", request.uri().toString());
    assertEquals("POST", request.method());
    assertEquals(
        "Bearer sk_live_private_test", request.headers().firstValue("Authorization").orElseThrow());
    assertEquals("application/json", request.headers().firstValue("Content-Type").orElseThrow());
    assertEquals(10, request.timeout().orElseThrow().getSeconds());
    var payload = mapper.readTree(body(request));
    assertEquals("+2207654321", payload.get("recipient_phone").asText());
    assertEquals(message, payload.get("message_body").asText());
    assertFalse(payload.get("is_draft").asBoolean());
  }

  @Test
  void rejectsProviderFailuresWithoutRetrying() throws Exception {
    for (int status : new int[] {400, 401, 402, 429, 500}) {
      var client = mock(HttpClient.class);
      HttpResponse<Void> response = mock(HttpResponse.class);
      when(response.statusCode()).thenReturn(status);
      when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
          .thenReturn(response);
      assertThrows(
          IllegalStateException.class,
          () ->
              new JokoorSmsSender(client, new ObjectMapper(), "sk_live_private_test")
                  .send("+2207654321", "private-code"));
      verify(client, times(1)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
  }

  @Test
  void hidesTransportErrorsAndCredentials() throws Exception {
    var client = mock(HttpClient.class);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new java.io.IOException("sk_live_private_test private-code"));
    var failure =
        assertThrows(
            IllegalStateException.class,
            () ->
                new JokoorSmsSender(client, new ObjectMapper(), "sk_live_private_test")
                    .send("+2207654321", "private-code"));
    assertFalse(failure.toString().contains("private"));
    assertNull(failure.getCause());
  }

  @Test
  void restoresInterruptedStatus() throws Exception {
    var client = mock(HttpClient.class);
    when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
        .thenThrow(new InterruptedException("private-code"));
    try {
      assertThrows(
          IllegalStateException.class,
          () ->
              new JokoorSmsSender(client, new ObjectMapper(), "sk_live_private_test")
                  .send("+2207654321", "private-code"));
      assertTrue(Thread.currentThread().isInterrupted());
    } finally {
      Thread.interrupted();
    }
  }

  @Test
  void rejectsTestAndMissingKeysBeforeSending() {
    var client = mock(HttpClient.class);
    for (String key : new String[] {"", "sk_test_private", "sk_live_"}) {
      assertThrows(
          IllegalArgumentException.class,
          () -> new JokoorSmsSender(client, new ObjectMapper(), key));
    }
    verifyNoInteractions(client);
  }

  private static byte[] body(HttpRequest request) throws Exception {
    var output = new ByteArrayOutputStream();
    var complete = new CompletableFuture<byte[]>();
    request
        .bodyPublisher()
        .orElseThrow()
        .subscribe(
            new Flow.Subscriber<ByteBuffer>() {
              public void onSubscribe(Flow.Subscription subscription) {
                subscription.request(Long.MAX_VALUE);
              }

              public void onNext(ByteBuffer buffer) {
                byte[] bytes = new byte[buffer.remaining()];
                buffer.get(bytes);
                output.writeBytes(bytes);
              }

              public void onError(Throwable error) {
                complete.completeExceptionally(error);
              }

              public void onComplete() {
                complete.complete(output.toByteArray());
              }
            });
    return complete.get(5, TimeUnit.SECONDS);
  }
}
