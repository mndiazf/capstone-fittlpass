// src/main/java/com/capstone_fitps/capstorne_fitpass/access/AccessLogRepository.java
package com.capstone_fitps.capstorne_fitpass.access;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessLogRepository extends JpaRepository<AccessLog, String> {}
