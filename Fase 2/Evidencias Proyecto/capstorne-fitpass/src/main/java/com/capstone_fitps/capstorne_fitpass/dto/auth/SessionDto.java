package com.capstone_fitps.capstorne_fitpass.dto.auth;


public record SessionDto(
        String sessionId,
        long issuedAt,     // epoch ms
        long expiresAt,    // epoch ms
        int  ttlMinutes    // 120 por defecto (config)
) {}
