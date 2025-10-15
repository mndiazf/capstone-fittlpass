package com.capstone_fitps.capstorne_fitpass.repository;

import com.capstone_fitps.capstorne_fitpass.user.FaceEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FaceEnrollmentRepository extends JpaRepository<FaceEnrollment, String> {
    Optional<FaceEnrollment> findByUserId(String userId);
}