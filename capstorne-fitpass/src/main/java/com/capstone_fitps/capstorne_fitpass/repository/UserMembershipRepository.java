package com.capstone_fitps.capstorne_fitpass.repository;

import com.capstone_fitps.capstorne_fitpass.user.UserMembership;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserMembershipRepository extends JpaRepository<UserMembership, String> {}
