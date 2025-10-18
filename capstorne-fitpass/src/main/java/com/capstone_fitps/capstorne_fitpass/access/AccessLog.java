// src/main/java/com/capstone_fitps/capstorne_fitpass/access/AccessLog.java
package com.capstone_fitps.capstorne_fitpass.access;

import com.capstone_fitps.capstorne_fitpass.branch.Branch;
import com.capstone_fitps.capstorne_fitpass.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "access_log", indexes = {
        @Index(name="ix_accesslog_user", columnList = "user_id"),
        @Index(name="ix_accesslog_branch", columnList = "branch_id"),
        @Index(name="ix_accesslog_at", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /** Usuario que intentó acceder */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name="user_id", nullable = false)
    private User user;

    /** Sucursal donde se intentó el acceso */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name="branch_id", nullable = false)
    private Branch branch;

    /** Identificador del dispositivo/torniquete/cámara */
    @Column(name="device_id", length = 80)
    private String deviceId;

    /** GRANTED o DENIED */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AccessResult result;

    /** FACE | MANUAL | BACKOFFICE | TEST */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AccessSource source;

    /** Motivo breve (p.ej. OK, BLOQUEADO, MEMBRESIA_EXPIRADA, SUCURSAL_NO_AUTORIZADA) */
    @Column(length = 120)
    private String reason;

    @CreationTimestamp
    @Column(name="created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
