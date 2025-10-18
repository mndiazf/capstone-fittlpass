// src/main/java/com/capstone_fitps/capstorne_fitpass/branch/BranchSeeder.java
package com.capstone_fitps.capstorne_fitpass.branch;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Order(10)
@RequiredArgsConstructor
public class BranchSeeder implements CommandLineRunner {

    private final BranchRepository repo;

    @Override
    @Transactional
    public void run(String... args) {
        var seeds = List.of(
                new Seed("11111111-1111-1111-1111-111111111111", "Providencia",     "PROVIDENCIA",     "Av. Providencia 1234, Providencia"),
                new Seed("22222222-2222-2222-2222-222222222222", "Ñuñoa",           "NUNOA",           "Irarrázaval 5678, Ñuñoa"),
                new Seed("33333333-3333-3333-3333-333333333333", "Maipú",           "MAIPU",           "Av. Pajaritos 1111, Maipú"),
                new Seed("44444444-4444-4444-4444-444444444444", "Las Condes",      "LAS_CONDES",      "Av. Apoquindo 4321, Las Condes"),
                new Seed("55555555-5555-5555-5555-555555555555", "Santiago Centro", "SANTIAGO_CENTRO", "Alameda 1001, Santiago")
        );

        for (var s : seeds) {
            repo.findById(s.id()).ifPresentOrElse(existing -> {
                boolean dirty = false;
                if (!existing.getName().equals(s.name()))       { existing.setName(s.name());       dirty = true; }
                if (!existing.getCode().equals(s.code()))       { existing.setCode(s.code());       dirty = true; }
                if (!equalsNullSafe(existing.getAddress(), s.address())) {
                    existing.setAddress(s.address()); dirty = true;
                }
                if (!existing.isActive()) { existing.setActive(true); dirty = true; }
                if (dirty) repo.save(existing); // entidad gestionada
            }, () -> {
                // Insertar nuevo respetando el ID fijo
                var b = Branch.builder()
                        .id(s.id())
                        .name(s.name())
                        .code(s.code())
                        .address(s.address())
                        .active(true)
                        .build();
                repo.save(b);
            });
        }
    }

    private static boolean equalsNullSafe(String a, String b) {
        return a == null ? b == null : a.equals(b);
    }

    private record Seed(String id, String name, String code, String address) {}
}
