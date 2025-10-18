// src/main/java/com/capstone_fitps/capstorne_fitpass/dto/auth/UserProfileDto.java
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
        String status,

        String membershipType,
        String membershipStatus,
        String membershipStart,
        String membershipEnd,

        String accessStatus,
        String enrollmentStatus,

        // NUEVO
        String membershipBranchId,
        String membershipBranchName,
        String membershipBranchCode
) {}
