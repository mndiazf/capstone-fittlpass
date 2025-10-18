package com.capstone_fitps.capstorne_fitpass.user;

import com.capstone_fitps.capstorne_fitpass.dto.auth.UserProfileDto;
import com.capstone_fitps.capstorne_fitpass.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Reutilizamos entidades y mapeamos igual que en AuthService.buildAuthResponse(...)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserRepository userRepository;

    @GetMapping("/profile-by-rut/{rut}")
    public ResponseEntity<?> getProfileByRut(@PathVariable String rut) {
        var user = userRepository.findByRut(rut.trim())
                .orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError("not_found", "No existe la persona para el RUT ingresado"));
        }

        var m = user.getMembership();
        var e = user.getFaceEnrollment();

        String branchId = null, branchName = null, branchCode = null;
        if (m != null && m.getAssignedBranch() != null) {
            branchId = m.getAssignedBranch().getId();
            branchName = m.getAssignedBranch().getName();
            branchCode = m.getAssignedBranch().getCode();
        }

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
                m != null ? (m.getStartDate() != null ? m.getStartDate().toString() : null) : null,
                m != null ? (m.getEndDate() != null ? m.getEndDate().toString() : null) : null,
                user.getAccessStatus() != null ? user.getAccessStatus().name() : null,
                e != null ? e.getStatus().name() : null,
                branchId,
                branchName,
                branchCode
        );

        return ResponseEntity.ok(profile);
    }

    record ApiError(String code, String message) {}
}
