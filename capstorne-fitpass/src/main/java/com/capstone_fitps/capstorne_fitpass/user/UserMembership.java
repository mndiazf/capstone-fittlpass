// src/main/java/com/capstone_fitps/capstorne_fitpass/user/UserMembership.java
package com.capstone_fitps.capstorne_fitpass.user;

import com.capstone_fitps.capstorne_fitpass.branch.Branch;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "user_membership",
        uniqueConstraints = @UniqueConstraint(name="uq_membership_user", columnNames = "user_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    private MembershipType type; // MULTICLUB_ANUAL | ONECLUB_ANUAL | ONECLUB_MENSUAL

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private MembershipStatus status; // ACTIVE | EXPIRED

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** Sucursal asignada (OBLIGATORIA si type = ONECLUB_*) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch assignedBranch;

    /** Reglas de negocio: ONECLUB_* requiere assignedBranch != null */
    @PrePersist @PreUpdate
    private void validateBranchForOneClub() {
        boolean isOneClub = (type == MembershipType.ONECLUB_ANUAL || type == MembershipType.ONECLUB_MENSUAL);
        if (isOneClub && assignedBranch == null) {
            throw new IllegalStateException("Las membresías ONECLUB_* requieren sucursal asignada (branch_id).");
        }
    }
}
