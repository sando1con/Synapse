package com.example.synapse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors().and()
                .csrf().disable()
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/", "/index.html", "/favicon.ico", "/manifest.json",
                                "/static/**", "/js/**", "/css/**", "/images/**",
                                "/api/**", "/shared/**"
                        ).permitAll()
                        .anyRequest().permitAll() // ← 여기서 authenticated() 대신 임시로 permitAll 해도 됨
                )
                .formLogin().disable();

        return http.build();
    }
}