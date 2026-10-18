package com.mamadou.sutura.common.config;

import com.mamadou.sutura.auth.service.ApiKeyAuthenticationFilter;
import com.mamadou.sutura.auth.service.JwtAuthenticationFilter;
import com.mamadou.sutura.common.filter.CorrelationIdFilter;
import com.mamadou.sutura.common.filter.RateLimitingFilter;
import com.mamadou.sutura.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.password.CompromisedPasswordChecker;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.scrypt.SCryptPasswordEncoder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.password.HaveIBeenPwnedRestApiPasswordChecker;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SCryptPasswordEncoder scryptPasswordEncoder() {
        return new SCryptPasswordEncoder(16384,8, 16, 32, 32);
    }

    @Bean
    public CompromisedPasswordChecker  passwordChecker() {
        return new HaveIBeenPwnedRestApiPasswordChecker();
    }
    @Bean
    public UserDetailsService userDetailsService(UserRepository userRepository) {
        return username -> userRepository.findByLoginIdentifier(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            ApiKeyAuthenticationFilter apiKeyAuthenticationFilter,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            CorrelationIdFilter correlationIdFilter,
            RateLimitingFilter rateLimitingFilter) throws Exception {
        return http
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .exceptionHandling(errors -> errors
                    .authenticationEntryPoint((request,response,error)->{response.setStatus(401);response.setContentType("application/json");response.getWriter().write("{\"message\":\"Authentication required\"}");})
                    .accessDeniedHandler((request,response,error)->{response.setStatus(403);response.setContentType("application/json");response.getWriter().write("{\"message\":\"Access denied\"}");}))
                .csrf((csrf) -> csrf.disable())
                .httpBasic((httpBasic) -> httpBasic.disable())
                .formLogin((formLogin) -> formLogin.disable())
                .sessionManagement((session) -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests((auth) -> auth
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/merchant/register/**",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/recovery/request",
                                "/api/auth/recovery/confirm",
                                "/api/v1/webhooks/modempay/deposits",
                                "/api/v1/webhooks/sentinel",
                                "/api/v1/webhooks/modem-pay/**",
                                "/actuator/health",
                                "/actuator/health/**"
                        ).permitAll()
                        .requestMatchers("/actuator/**").denyAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(correlationIdFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(apiKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
