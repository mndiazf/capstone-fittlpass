package com.capstone_fitps.capstorne_fitpass.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record RegisterRequest(
        @NotBlank String firstName,
        String middleName,
        @NotBlank String lastName,
        String secondLastName,
        @NotBlank @Email String email,
        String phone,
        @NotBlank String rut,
        @NotBlank String password,

        // opcionales de membresía (si registras con producto)
        String membership,
        String membershipId,
        String membershipPrice,
        String membershipDiscount,
        List<String> membershipFeatures,
        String joinDate,      // yyyy-MM-dd (opcional)
        String nextPayment,   // yyyy-MM-dd (opcional)
        String status         // active | pending | inactive (default active)
) {}
