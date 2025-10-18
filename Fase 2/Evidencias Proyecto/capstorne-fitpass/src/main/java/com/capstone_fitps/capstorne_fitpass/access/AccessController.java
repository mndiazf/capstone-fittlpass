// src/main/java/com/capstone_fitps/capstorne_fitpass/access/AccessController.java
package com.capstone_fitps.capstorne_fitpass.access;

import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/access")
public class AccessController {

    private final AccessService accessService;

    public static class AccessCheckDto {
        @NotBlank public String userId;
        @NotBlank public String branchId;
        public String deviceId;
        public AccessSource source = AccessSource.FACE;
    }

    @PostMapping("/check")
    public ResponseEntity<?> check(@RequestBody AccessCheckDto body) {
        var resp = accessService.checkAndLog(
                new AccessService.AccessRequest(body.userId, body.branchId, body.deviceId, body.source)
        );
        return ResponseEntity.ok(resp);
    }
}
