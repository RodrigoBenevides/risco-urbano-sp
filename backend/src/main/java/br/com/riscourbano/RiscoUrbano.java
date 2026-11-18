package br.com.riscourbano;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class RiscoUrbano implements WebMvcConfigurer {
    public static void main(String[] args) {
        SpringApplication.run(RiscoUrbano.class, args);
    }

    @Bean
    Clock relogio() {
        return Clock.systemUTC();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:8081", "http://127.0.0.1:8081")
            .allowedMethods("GET", "POST").allowedHeaders("Content-Type", "Accept");
    }
}
