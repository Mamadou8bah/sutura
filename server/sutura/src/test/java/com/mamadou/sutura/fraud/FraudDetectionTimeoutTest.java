package com.mamadou.sutura.fraud;

import com.mamadou.sutura.fraud.config.FraudDetectionConfig;
import com.mamadou.sutura.fraud.config.FraudDetectionProperties;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;
import static org.junit.jupiter.api.Assertions.*;

class FraudDetectionTimeoutTest {
    @Test
    void slowResponseCanCompleteButConfiguredReadDeadlineStillApplies() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            try {
                Thread.sleep(2200);
                byte[] body = "{\"status\":\"UP\"}".getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            String url = "http://127.0.0.1:" + server.getAddress().getPort();
            var properties = new FraudDetectionProperties();
            var config = new FraudDetectionConfig();
            assertEquals("{\"status\":\"UP\"}", config.fraudDetectionRestTemplate(properties).getForObject(url, String.class));
            properties.setTimeoutMs(100);
            assertThrows(ResourceAccessException.class,
                    () -> config.fraudDetectionRestTemplate(properties).getForObject(url, String.class));
        } finally {
            server.stop(0);
        }
    }
}
