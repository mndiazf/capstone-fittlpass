// src/main/java/com/capstone_fitps/capstorne_fitpass/branch/Branch.java
package com.capstone_fitps.capstorne_fitpass.branch;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "branch", uniqueConstraints = {
        @UniqueConstraint(name = "uq_branch_code", columnNames = "code")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Branch {

    @Id
    @Column(length = 36, nullable = false)
    // IMPORTANTE: sin @GeneratedValue para permitir IDs fijos de seeding
    private String id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 48)
    private String code; // p.ej.: PROVIDENCIA, NUNOA, MAIPU

    @Column(length = 240)
    private String address;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
