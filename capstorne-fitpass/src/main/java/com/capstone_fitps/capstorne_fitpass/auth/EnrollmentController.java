// =======================================
// EnrollmentController (NUEVO)
// =======================================
package com.capstone_fitps.capstorne_fitpass.auth;

import com.capstone_fitps.capstorne_fitpass.repository.FaceEnrollmentRepository;
import com.capstone_fitps.capstorne_fitpass.repository.UserRepository;
import com.capstone_fitps.capstorne_fitpass.user.AccessStatus;
import com.capstone_fitps.capstorne_fitpass.user.EnrollmentStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/enrollment")
public class EnrollmentController {

    private final FaceEnrollmentRepository faceRepo;
    private final UserRepository userRepo;

    @Getter @Setter
    public static class EmbeddingDto {
        /** vector 512 L2-normalizado (InsightFace normed_embedding) */
        @NotNull
        @Size(min = 512, max = 512)
        private float[] vector;
    }

    /** Guarda/actualiza el embedding facial y marca ENROLLED. */
    @PostMapping("/{userId}/face")
    public ResponseEntity<?> saveEmbedding(@PathVariable String userId, @Valid @RequestBody EmbeddingDto body) {
        var user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User no existe"));
        var fe = faceRepo.findByUserId(userId).orElseThrow(() -> new RuntimeException("Enrollment no existe"));

        // Normalización defensiva (por si llega levemente desnormalizado)
        float norm = 0f;
        for (float v : body.getVector()) norm += v * v;
        norm = (float) Math.sqrt(norm);
        if (norm > 0f && Math.abs(norm - 1f) > 1e-3) {
            for (int i = 0; i < body.getVector().length; i++) {
                body.getVector()[i] /= norm;
            }
        }

        fe.setEmbedding(body.getVector());
        fe.setStatus(EnrollmentStatus.ENROLLED);

        // Si estaba NO_ENROLADO, activar acceso
        if (user.getAccessStatus() == AccessStatus.NO_ENROLADO) {
            user.setAccessStatus(AccessStatus.ACTIVO);
        }

        faceRepo.save(fe);
        userRepo.save(user);
        return ResponseEntity.ok().build();
    }

    /** Cambia el estado de acceso manualmente (ACTIVO | BLOQUEADO | NO_ENROLADO). */
    @PostMapping("/{userId}/access/{status}")
    public ResponseEntity<?> setAccess(@PathVariable String userId, @PathVariable String status) {
        var user = userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User no existe"));
        var newStatus = AccessStatus.valueOf(status.toUpperCase());
        user.setAccessStatus(newStatus);
        userRepo.save(user);
        return ResponseEntity.ok().build();
    }
}
