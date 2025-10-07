package com.capstone_fitps.capstorne_fitpass.dto.auth;

public record UserProfileDto(
        String id,
        String firstName,
        String middleName,
        String lastName,
        String secondLastName,
        String email,
        String phone,
        String rut,
        String status
) {}
