// src/main/java/com/capstone_fitps/capstorne_fitpass/access/AccessService.java
package com.capstone_fitps.capstorne_fitpass.access;

import com.capstone_fitps.capstorne_fitpass.branch.Branch;
import com.capstone_fitps.capstorne_fitpass.branch.BranchRepository;
import com.capstone_fitps.capstorne_fitpass.repository.UserRepository;
import com.capstone_fitps.capstorne_fitpass.user.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class AccessService {

    private final UserRepository userRepo;
    private final BranchRepository branchRepo;
    private final AccessLogRepository logRepo;

    public record AccessRequest(String userId, String branchId, String deviceId, AccessSource source) {}
    public record AccessResponse(boolean granted, String reason) {}

    @Transactional
    public AccessResponse checkAndLog(AccessRequest req) {
        var user = userRepo.findById(req.userId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no existe"));
        var branch = branchRepo.findById(req.branchId())
                .orElseThrow(() -> new IllegalArgumentException("Sucursal no existe"));

        // Reglas
        if (user.getAccessStatus() == AccessStatus.BLOQUEADO) {
            log(user, branch, req.deviceId(), AccessResult.DENIED, req.source(), "BLOQUEADO");
            return new AccessResponse(false, "BLOQUEADO");
        }
        var m = user.getMembership();
        if (m == null || m.getStatus() != MembershipStatus.ACTIVE) {
            log(user, branch, req.deviceId(), AccessResult.DENIED, req.source(), "MEMBRESIA_NO_ACTIVA");
            return new AccessResponse(false, "MEMBRESIA_NO_ACTIVA");
        }
        if (user.getFaceEnrollment() == null || user.getFaceEnrollment().getStatus() != EnrollmentStatus.ENROLLED) {
            log(user, branch, req.deviceId(), AccessResult.DENIED, req.source(), "NO_ENROLADO");
            return new AccessResponse(false, "NO_ENROLADO");
        }

        boolean isOneClub = (m.getType() == MembershipType.ONECLUB_ANUAL || m.getType() == MembershipType.ONECLUB_MENSUAL);
        if (isOneClub) {
            Branch assigned = m.getAssignedBranch();
            if (assigned == null || !assigned.getId().equals(branch.getId())) {
                log(user, branch, req.deviceId(), AccessResult.DENIED, req.source(), "SUCURSAL_NO_AUTORIZADA");
                return new AccessResponse(false, "SUCURSAL_NO_AUTORIZADA");
            }
        }

        // Si llegó hasta aquí, GRANTED
        log(user, branch, req.deviceId(), AccessResult.GRANTED, req.source(), "OK");
        return new AccessResponse(true, "OK");
    }

    private void log(User u, Branch b, String deviceId, AccessResult res, AccessSource src, String reason) {
        logRepo.save(AccessLog.builder()
                .user(u)
                .branch(b)
                .deviceId(deviceId)
                .result(res)
                .source(src == null ? AccessSource.FACE : src)
                .reason(reason)
                .build());
    }
}
