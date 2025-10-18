// =======================================
// AuthService (AJUSTADO, compatibilidad con UserProfileDto de 18 campos)
// =======================================
package com.capstone_fitps.capstorne_fitpass.auth;

import com.capstone_fitps.capstorne_fitpass.branch.Branch;
import com.capstone_fitps.capstorne_fitpass.branch.BranchRepository;
import com.capstone_fitps.capstorne_fitpass.dto.auth.LoginRequest;
import com.capstone_fitps.capstorne_fitpass.dto.auth.RegisterRequest;
import com.capstone_fitps.capstorne_fitpass.dto.auth.SessionDto;
import com.capstone_fitps.capstorne_fitpass.dto.auth.UserProfileDto;
import com.capstone_fitps.capstorne_fitpass.repository.FaceEnrollmentRepository;
import com.capstone_fitps.capstorne_fitpass.repository.UserMembershipRepository;
import com.capstone_fitps.capstorne_fitpass.repository.UserRepository;
import com.capstone_fitps.capstorne_fitpass.user.AccessStatus;
import com.capstone_fitps.capstorne_fitpass.user.EnrollmentStatus;
import com.capstone_fitps.capstorne_fitpass.user.FaceEnrollment;
import com.capstone_fitps.capstorne_fitpass.user.MembershipStatus;
import com.capstone_fitps.capstorne_fitpass.user.MembershipType;
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
    private final BranchRepository branchRepository; // <-- NUEVO

    @Value("${app.auth.session-ttl-minutes:120}")
    private int sessionTtlMinutes;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        // Normalizaciones defensivas
        final String email = req.email() == null ? null : req.email().trim().toLowerCase();
        final String rut   = req.rut() == null ? null : req.rut().trim();
        final String status = (req.status() != null && !req.status().isBlank()) ? req.status().trim() : "active";
        final String membershipTypeRaw = req.membershipType() == null ? "" : req.membershipType().trim().toUpperCase();

        if (email == null || email.isBlank()) throw new ConflictException("Email es obligatorio");
        if (rut == null || rut.isBlank())     throw new ConflictException("RUT es obligatorio");
        if (membershipTypeRaw.isBlank())      throw new ConflictException("membershipType es obligatorio");

        if (userRepository.existsByEmail(email))
            throw new ConflictException("Email ya registrado");
        if (userRepository.existsByRut(rut))
            throw new ConflictException("RUT ya registrado");

        // Validar membresía obligatoria
        final MembershipType membershipType;
        try {
            membershipType = MembershipType.valueOf(membershipTypeRaw);
        } catch (Exception e) {
            throw new ConflictException("membershipType inválido. Use: MULTICLUB_ANUAL | ONECLUB_ANUAL | ONECLUB_MENSUAL");
        }

        // Hash de contraseña
        if (req.password() == null || req.password().isBlank()) {
            throw new ConflictException("Password es obligatorio");
        }
        String hash = BCrypt.hashpw(req.password(), BCrypt.gensalt());

        // Crear usuario
        User user = User.builder()
                .firstName(req.firstName())
                .middleName(req.middleName())
                .lastName(req.lastName())
                .secondLastName(req.secondLastName())
                .email(email)
                .phone(req.phone())
                .rut(rut)
                .passwordHash(hash)
                .status(status)
                .accessStatus(AccessStatus.NO_ENROLADO) // por defecto hasta enrolar rostro
                .build();
        user = userRepository.save(user);

        // Resolver branch si corresponde
        boolean isOneClub = (membershipType == MembershipType.ONECLUB_ANUAL || membershipType == MembershipType.ONECLUB_MENSUAL);
        Branch assignedBranch = null;
        if (isOneClub) {
            String branchId = req.branchId();
            if (branchId == null || branchId.isBlank()) {
                throw new ConflictException("branchId es obligatorio para membresías ONECLUB_*");
            }
            assignedBranch = branchRepository.findById(branchId.trim())
                    .orElseThrow(() -> new ConflictException("branchId no existe: " + branchId));
            if (!assignedBranch.isActive()) {
                throw new ConflictException("La sucursal indicada no está activa");
            }
        }

        // Fechas de membresía
        LocalDate start = LocalDate.now();
        LocalDate end = switch (membershipType) {
            case MULTICLUB_ANUAL, ONECLUB_ANUAL -> start.plusMonths(12);
            case ONECLUB_MENSUAL -> start.plusMonths(1);
        };
        MembershipStatus mstatus = end.isBefore(LocalDate.now()) ? MembershipStatus.EXPIRED : MembershipStatus.ACTIVE;

        // Crear registro de membresía (con branch si aplica)
        UserMembership membership = UserMembership.builder()
                .user(user)
                .type(membershipType)
                .status(mstatus)
                .startDate(start)
                .endDate(end)
                .assignedBranch(assignedBranch) // <-- CLAVE
                .build();
        userMembershipRepository.save(membership);

        // Crear enrolamiento facial vacío (embedding NULL)
        FaceEnrollment enrollment = FaceEnrollment.builder()
                .user(user)
                .status(EnrollmentStatus.NOT_ENROLLED)
                .embedding(null)
                .build();
        faceEnrollmentRepository.save(enrollment);

        // Respuesta
        return buildAuthResponse(attach(user, membership, enrollment));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        final String email = req.email() == null ? null : req.email().trim().toLowerCase();
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Credenciales inválidas");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Credenciales inválidas"));

        if (req.password() == null || !BCrypt.checkpw(req.password(), user.getPasswordHash())) {
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

        // Cargar relaciones (si están LAZY)
        UserMembership m = user.getMembership();
        FaceEnrollment e = user.getFaceEnrollment();

        // Poblar datos de sucursal si existen
        String branchId = null, branchName = null, branchCode = null;
        if (m != null && m.getAssignedBranch() != null) {
            branchId = m.getAssignedBranch().getId();
            branchName = m.getAssignedBranch().getName();
            branchCode = m.getAssignedBranch().getCode();
        }

        // IMPORTANTE: UserProfileDto espera 18 parámetros
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
                e != null ? e.getStatus().name() : null,
                branchId,   // ahora poblado cuando corresponda
                branchName,
                branchCode
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
