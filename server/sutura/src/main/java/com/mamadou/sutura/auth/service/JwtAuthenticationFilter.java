package com.mamadou.sutura.auth.service;

import com.mamadou.sutura.common.config.JWTConfig;
import com.mamadou.sutura.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JWTConfig jwtConfig;
  private final UserRepository userRepository;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");

    if (header == null || !header.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = header.substring(7);
    if (!jwtConfig.validateToken(token)) {
      filterChain.doFilter(request, response);
      return;
    }

    String type = jwtConfig.extractAllClaims(token).get("type", String.class);
    if (!"access_token".equals(type)
        || SecurityContextHolder.getContext().getAuthentication() != null) {
      filterChain.doFilter(request, response);
      return;
    }

    String username = jwtConfig.extractSubject(token);
    Number version = jwtConfig.extractAllClaims(token).get("tokenVersion", Number.class);
    userRepository
        .findByLoginIdentifier(username)
        .filter(
            user ->
                (version == null ? 0 : version.longValue()) == user.getTokenVersion()
                    && user.isEnabled()
                    && user.isAccountNonLocked()
                    && user.getUserStatus() != com.mamadou.sutura.user.enums.UserStatus.SUSPENDED
                    && user.getUserStatus() != com.mamadou.sutura.user.enums.UserStatus.BANNED)
        .ifPresent(
            user -> {
              UsernamePasswordAuthenticationToken authentication =
                  new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
              authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
              SecurityContextHolder.getContext().setAuthentication(authentication);
            });

    filterChain.doFilter(request, response);
  }
}
