// =======================================
// AuthService (AJUSTADO)
// =======================================
package com.capstone_fitps.capstorne_fitpass.auth;

import com.capstone_fitps.capstorne_fitpass.dto.auth.LoginRequest;
import com.capstone_fitps.capstorne_fitpass.dto.auth.RegisterRequest;
import com.capstone_fitps.capstorne_fitpass.dto.auth.SessionDto;
import com.capstone_fitps.capstorne_fitpass.dto.auth.UserProfileDto;
import com.capstone_fitps.capstorne_fitpass.repository.FaceEnrollmentRepository;
import com.capstone_fitps.capstorne_fitpass.repository.UserMembershipRepository;
import com.capstone_fitps.capstorne_fitpass.repository.UserRepository;
import com.capstone_fitps.capstorne_fitpass.user.AccessStatus;
import com.capstone_fitps.capstorne_fitpass.user.EnrollmentStatus;
import com.capstone_fitps.capstorne_fitpass.user.MembershipStatus;
import com.capstone_fitps.capstorne_fitpass.user.MembershipType;
import com.capstone_fitps.capstorne_fitpass.user.FaceEnrollment;
import com.capstone_fitps.capstorne_fitpass.user.User;
import com.capstone_fitps.capstorne_fitpass.user.UserMembership;
import com.capstone_fitps.capstorne_fitpass.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserMembershipRepository userMembershipRepository;
    private final FaceEnrollmentRepository faceEnrollmentRepository;

    @Value("${app.auth.session-ttl-minutes:120}")
    private int sessionTtlMinutes;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email()))
            throw new ConflictException("Email ya registrado");
        if (userRepository.existsByRut(req.rut()))
            throw new ConflictException("RUT ya registrado");

        // Validar membresía obligatoria
        final MembershipType membershipType;
        try {
            membershipType = MembershipType.valueOf(req.membershipType().trim().toUpperCase());
        } catch (Exception e) {
            throw new ConflictException("membershipType inválido. Use: MULTICLUB_ANUAL | ONECLUB_ANUAL | ONECLUB_MENSUAL");
        }

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
                .accessStatus(AccessStatus.NO_ENROLADO) // por defecto hasta enrolar rostro
                .build();
        user = userRepository.save(user);

        // Fechas de membresía
        LocalDate start = LocalDate.now();
        LocalDate end = switch (membershipType) {
            case MULTICLUB_ANUAL, ONECLUB_ANUAL -> start.plusMonths(12);
            case ONECLUB_MENSUAL -> start.plusMonths(1);
        };
        MembershipStatus mstatus = end.isBefore(LocalDate.now()) ? MembershipStatus.EXPIRED : MembershipStatus.ACTIVE;

        // Crear registro de membresía
        UserMembership membership = UserMembership.builder()
                .user(user)
                .type(membershipType)
                .status(mstatus)
                .startDate(start)
                .endDate(end)
                .build();
        userMembershipRepository.save(membership);

        // Crear enrolamiento facial vacío (embedding NULL)
        FaceEnrollment enrollment = FaceEnrollment.builder()
                .user(user)
                .status(EnrollmentStatus.NOT_ENROLLED)
                .embedding(null)
                .build();
        faceEnrollmentRepository.save(enrollment);

        // armar respuesta
        return buildAuthResponse(attach(user, membership, enrollment));
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

    private User attach(User u, UserMembership m, FaceEnrollment e) {
        u.setMembership(m);
        u.setFaceEnrollment(e);
        return u;
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

        // Cargar relaciones si están en LAZY (según tu configuración)
        UserMembership m = user.getMembership();
        FaceEnrollment e = user.getFaceEnrollment();

        UserProfileDto profile = new UserProfileDto(
                user.getId(),
                user.getFirstName(),
                user.getMiddleName(),
                user.getLastName(),
                user.getSecondLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getRut(),
                user.getStatus(),
                m != null ? m.getType().name() : null,
                m != null ? m.getStatus().name() : null,
                m != null ? m.getStartDate().toString() : null,
                m != null ? m.getEndDate().toString() : null,
                user.getAccessStatus() != null ? user.getAccessStatus().name() : null,
                e != null ? e.getStatus().name() : null
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
