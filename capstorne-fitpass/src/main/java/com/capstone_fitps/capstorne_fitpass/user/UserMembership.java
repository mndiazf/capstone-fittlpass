package com.capstone_fitps.capstorne_fitpass.user;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "user_membership")
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
}
