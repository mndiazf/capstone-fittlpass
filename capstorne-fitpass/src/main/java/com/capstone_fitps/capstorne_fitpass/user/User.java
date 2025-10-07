package com.capstone_fitps.capstorne_fitpass.user;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "app_user",
        uniqueConstraints = {
                @UniqueConstraint(name="uq_user_email", columnNames = "email"),
                @UniqueConstraint(name="uq_user_rut", columnNames = "rut")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 120)
    private String firstName;

    @Column(length = 120)
    private String middleName;

    @Column(nullable = false, length = 120)
    private String lastName;

    @Column(length = 120)
    private String secondLastName;

    @Column(nullable = false, length = 180)
    private String email;

    @Column(length = 32)
    private String phone;

    @Column(nullable = false, length = 20)
    private String rut; // normaliza como necesites

    // credenciales
    @Column(nullable = false)
    private String passwordHash;

    @Column(length = 16)
    private String status;           // active | pending | inactive

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}
