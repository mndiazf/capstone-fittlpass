// src/main/java/com/capstone_fitps/capstorne_fitpass/repository/view/UserProfileView.java
package com.capstone_fitps.capstorne_fitpass.repository.view;

public interface UserProfileView {
    String getId();
    String getFirstName();
    String getMiddleName();
    String getLastName();
    String getSecondLastName();
    String getEmail();
    String getPhone();
    String getRut();
    String getStatus();

    String getMembershipType();
    String getMembershipStatus();
    String getMembershipStart();
    String getMembershipEnd();

    String getAccessStatus();
    String getEnrollmentStatus();

    String getMembershipBranchId();
    String getMembershipBranchName();
    String getMembershipBranchCode();
}
