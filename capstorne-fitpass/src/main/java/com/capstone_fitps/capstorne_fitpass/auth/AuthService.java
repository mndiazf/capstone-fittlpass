package com.capstone_fitps.capstorne_fitpass.auth;


import com.capstone_fitps.capstorne_fitpass.dto.auth.LoginRequest;
import com.capstone_fitps.capstorne_fitpass.dto.auth.RegisterRequest;
import com.capstone_fitps.capstorne_fitpass.dto.auth.SessionDto;
import com.capstone_fitps.capstorne_fitpass.dto.auth.UserProfileDto;
import com.capstone_fitps.capstorne_fitpass.repository.UserRepository;
import com.capstone_fitps.capstorne_fitpass.user.User;
import com.capstone_fitps.capstorne_fitpass.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    @Value("${app.auth.session-ttl-minutes:120}")
    private int sessionTtlMinutes;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email()))
            throw new ConflictException("Email ya registrado");
        if (userRepository.existsByRut(req.rut()))
            throw new ConflictException("RUT ya registrado");

        String hash = BCrypt.hashpw(req.password(), BCrypt.gensalt());

        User user = User.builder()
                .firstName(req.firstName())
                .middleName(req.middleName())
                .lastName(req.lastName())
                .secondLastName(req.secondLastName())
                .email(req.email())
                .phone(req.phone())
                .rut(req.rut())
                .passwordHash(hash)
                .status(req.status() != null ? req.status() : "active")
                .build();

        user = userRepository.save(user);
        return buildAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new UnauthorizedException("Credenciales inválidas"));

        if (!BCrypt.checkpw(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Credenciales inválidas");
        }
        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        long nowMs = Instant.now().toEpochMilli();
        long expires = nowMs + TimeUtil.minutesToMillis(sessionTtlMinutes);

        SessionDto session = new SessionDto(
                "sess-" + UUID.randomUUID(),
                nowMs,
                expires,
                sessionTtlMinutes
        );

        UserProfileDto profile = new UserProfileDto(
                user.getId(),
                user.getFirstName(),
                user.getMiddleName(),
                user.getLastName(),
                user.getSecondLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRut(),
                user.getStatus()
        );

        return new AuthResponse(profile, session);
    }

    // ====== Respuesta y errores ======
    public record AuthResponse(UserProfileDto profile, SessionDto session) {}

    public static class ConflictException extends RuntimeException {
        public ConflictException(String m) { super(m); }
    }

    public static class UnauthorizedException extends RuntimeException {
        public UnauthorizedException(String m) { super(m); }
    }
}
