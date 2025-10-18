package com.capstone_fitps.capstorne_fitpass.user;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "face_enrollment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@DynamicInsert // <-- CLAVE: omite columnas NULL en el INSERT
public class FaceEnrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EnrollmentStatus status;

    // Embedding opcional: NULL al registrar; luego se setea al enrolar
    @Column(name = "embedding", columnDefinition = "vector(512)", nullable = true)
    @Convert(converter = com.capstone_fitps.capstorne_fitpass.db.VectorFloatToPgObjectConverter.class)
    @JdbcTypeCode(SqlTypes.OTHER) // forza JDBC OTHER para no tratarlo como bytea
    private float[] embedding;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}
