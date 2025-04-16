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
                .csrf().disable() // CSRF 비활성화 (개발용)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/**").permitAll() // 회원가입, 로그인 등 허용
                        .anyRequest().authenticated()           // 나머지는 로그인 필요
                )
                .formLogin().disable(); // 기본 로그인 화면 제거

        return http.build();
    }
}