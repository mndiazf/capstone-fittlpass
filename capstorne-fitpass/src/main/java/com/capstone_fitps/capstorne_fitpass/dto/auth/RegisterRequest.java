package com.capstone_fitps.capstorne_fitpass.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
        @NotBlank String firstName,
        String middleName,
        @NotBlank String lastName,
        String secondLastName,
        @NotBlank @Email String email,
        String phone,
        @NotBlank String rut,
        @NotBlank String password,

        // obligatorio: MULTICLUB_ANUAL | ONECLUB_ANUAL | ONECLUB_MENSUAL
        @NotBlank String membershipType,

        // status usuario (default "active" si no viene)
        String status
) {}
