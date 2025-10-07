package com.capstone_fitps.capstorne_fitpass.repository;

import com.capstone_fitps.capstorne_fitpass.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByRut(String rut);
}
