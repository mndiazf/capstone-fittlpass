// src/main/java/com/capstone_fitps/capstorne_fitpass/branch/BranchRepository.java
package com.capstone_fitps.capstorne_fitpass.branch;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, String> {
    Optional<Branch> findByCode(String code);
}
