package com.capstone_fitps.capstorne_fitpass.repository;

import com.capstone_fitps.capstorne_fitpass.repository.view.UserProfileView;
import com.capstone_fitps.capstorne_fitpass.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    /** Búsqueda exacta por RUT tal como está almacenado (con puntos/guión). */
    Optional<User> findByRut(String rut);

    boolean existsByEmail(String email);

    boolean existsByRut(String rut);
    @Query(value = """
        select
          u.id                                    as id,
          u.first_name                            as firstName,
          u.middle_name                           as middleName,
          u.last_name                             as lastName,
          u.second_last_name                      as secondLastName,
          u.email                                 as email,
          u.phone                                 as phone,
          u.rut                                   as rut,
          u.status::text                          as status,

          m.type::text                            as membershipType,
          m.status::text                          as membershipStatus,
          to_char(m.start_date,'YYYY-MM-DD')      as membershipStart,
          to_char(m.end_date,'YYYY-MM-DD')        as membershipEnd,

          u.access_status::text                   as accessStatus,
          e.status::text                          as enrollmentStatus,

          b.id                                    as membershipBranchId,
          b.name                                  as membershipBranchName,
          b.code                                  as membershipBranchCode
        from app_user u
        left join user_membership m on m.user_id = u.id
        left join branch b on b.id = m.branch_id
        left join face_enrollment e on e.user_id = u.id
        where u.rut = :rut
        """, nativeQuery = true)
    Optional<UserProfileView> findProfileByRut(@Param("rut") String rut);
}