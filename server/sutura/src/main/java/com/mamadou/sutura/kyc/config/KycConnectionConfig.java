package com.mamadou.sutura.kyc.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/** KYC may cold-start; payment scoring retains its separate short timeout. */
@Configuration
public class KycConnectionConfig {
    @Bean
    public RestTemplate sentinelKycRestTemplate(
            @Value("${sutura.kyc.connect-timeout-ms:5000}") int connectTimeout,
            @Value("${sutura.kyc.read-timeout-ms:20000}") int readTimeout) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.max(1000, Math.min(10000, connectTimeout)));
        factory.setReadTimeout(Math.max(1000, Math.min(45000, readTimeout)));
        return new RestTemplate(factory);
    }
}
