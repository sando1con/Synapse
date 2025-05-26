package com.example.synapse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOriginPatterns(
                                "http://localhost:3000",// ✅ React

                                "http://44.222.173.239:8080",

                                "http://host.docker.internal",         // ✅ Docker 내부 접근
                                "http://192.168.0.*",                  // ✅ 공유 IP 접근 (로컬 네트워크용)
                                "http://127.0.0.1",                    // ✅ 일부 경우 대비
                                "http://localhost"                     // ✅ 추가 호환성
                        )
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}