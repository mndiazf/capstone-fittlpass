// =======================================
// AuthController (AJUSTADO)
// =======================================
package com.capstone_fitps.capstorne_fitpass.auth;

import com.capstone_fitps.capstorne_fitpass.dto.auth.LoginRequest;
import com.capstone_fitps.capstorne_fitpass.dto.auth.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        var resp = authService.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        var resp = authService.login(req);
        return ResponseEntity.ok(resp);
    }

    // Manejo de errores simple
    @ExceptionHandler(AuthService.ConflictException.class)
    public ResponseEntity<?> handleConflict(AuthService.ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("conflict", ex.getMessage()));
    }

    @ExceptionHandler(AuthService.UnauthorizedException.class)
    public ResponseEntity<?> handleUnauthorized(AuthService.UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("unauthorized", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError("bad_request", ex.getMessage()));
    }

    record ApiError(String code, String message) {}
}
