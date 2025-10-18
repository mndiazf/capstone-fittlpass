// src/main/java/com/capstone_fitps/capstorne_fitpass/user/UserProfileController.java
package com.capstone_fitps.capstorne_fitpass.user;

import com.capstone_fitps.capstorne_fitpass.dto.auth.UserProfileDto;
import com.capstone_fitps.capstorne_fitpass.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserRepository userRepository;

    @GetMapping("/profile-by-rut/{rut}")
    public ResponseEntity<?> getProfileByRut(@PathVariable String rut) {
        var v = userRepository.findProfileByRut(rut.trim()).orElse(null);
        if (v == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiError("not_found", "No existe la persona para el RUT ingresado"));
        }

        var dto = new UserProfileDto(
                v.getId(),
                v.getFirstName(),
                v.getMiddleName(),
                v.getLastName(),
                v.getSecondLastName(),
                v.getEmail(),
                v.getPhone(),
                v.getRut(),
                v.getStatus(),

                v.getMembershipType(),
                v.getMembershipStatus(),
                v.getMembershipStart(),
                v.getMembershipEnd(),

                v.getAccessStatus(),
                v.getEnrollmentStatus(),

                v.getMembershipBranchId(),
                v.getMembershipBranchName(),
                v.getMembershipBranchCode()
        );

        return ResponseEntity.ok(dto);
    }

    record ApiError(String code, String message) {}
}
