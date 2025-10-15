// =======================================
// UserProfileDto (AJUSTADO)
// =======================================
package com.capstone_fitps.capstorne_fitpass.dto.auth;

/**
 * Perfil extendido para exponer datos de membresía, enrolamiento y acceso.
 */
public record UserProfileDto(
        String id,
        String firstName,
        String middleName,
        String lastName,
        String secondLastName,
        String email,
        String phone,
        String rut,
        String status,                 // active | pending | inactive

        // ===== Membresía =====
        String membershipType,         // MULTICLUB_ANUAL | ONECLUB_ANUAL | ONECLUB_MENSUAL
        String membershipStatus,       // ACTIVE | EXPIRED
        String membershipStart,        // ISO yyyy-MM-dd
        String membershipEnd,          // ISO yyyy-MM-dd

        // ===== Acceso / Enrolamiento =====
        String accessStatus,           // NO_ENROLADO | ACTIVO | BLOQUEADO
        String enrollmentStatus        // NOT_ENROLLED | ENROLLED
) {}
