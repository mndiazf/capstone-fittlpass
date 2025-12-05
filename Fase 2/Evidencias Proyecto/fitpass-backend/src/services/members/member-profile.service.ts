// src/services/members/member-profile.service.ts
import {
  AppUserRow,
  FaceEnrollmentRow,
  MemberProfileRepository,
  MembershipRow,
  SearchMemberRow,
} from '../../repositories/members/member-profile.repository';

export interface MemberProfileDto {
  id: string;
  rut: string;
  fullName: string;
  email: string;
  phone: string | null;

  membershipType: string | null;   // plan_code
  membershipName: string | null;   // plan_name
  membershipStatus: 'active' | 'expired' | 'inactive';
  membershipScope: 'ONECLUB' | 'MULTICLUB' | null;
  membershipBranchId: string | null;
  membershipBranchName: string | null;
  membershipStart: string | null;
  membershipEnd: string | null;

  enrollmentStatus: 'enrolled' | 'not_enrolled' | 'locked';
  enrollmentLocked: boolean;
}

export class MemberProfileService {
  constructor(
    private readonly repo: MemberProfileRepository,
  ) {}

  public async getProfileByRutAndBranch(
    rut: string,
    branchId: string
  ): Promise<MemberProfileDto> {
    const normalizedRut = this.normalizeRut(rut);

    // 1) Usuario
    const user: AppUserRow | null =
      await this.repo.findUserByNormalizedRut(normalizedRut);

    if (!user) {
      const err: any = new Error('MEMBER_NOT_FOUND');
      err.status = 404;
      throw err;
    }

    // 2) Membresía aplicable a la sucursal
    const membership: MembershipRow | null =
      await this.repo.findMembershipForUserAndBranch(user.id, branchId);

    if (!membership) {
      const err: any = new Error('MEMBERSHIP_NOT_ALLOWED_FOR_BRANCH');
      err.status = 403;
      throw err;
    }

    // 3) Último estado de enrolamiento facial
    const face: FaceEnrollmentRow | null =
      await this.repo.findLastFaceEnrollment(user.id);

    // 4) Mapear membershipStatus con override por fecha de vencimiento
    const profile = this.buildProfileDtoFromRows(user, membership, face);
    return profile;
  }

  /**
   * Búsqueda incremental por term (RUT o nombre) filtrando por branchId.
   * Usado para autocompletar.
   */
  public async searchProfiles(
    term: string,
    branchId: string,
    limit = 10
  ): Promise<MemberProfileDto[]> {
    const normalizedRut = this.normalizeRut(term);

    // 1) Obtenemos filas combinadas (usuario + "mejor" membership para esa branch)
    const rows: SearchMemberRow[] =
      await this.repo.searchMembersByTermAndBranch(
        term,
        normalizedRut,
        branchId,
        limit
      );

    if (rows.length === 0) {
      return [];
    }

    // 2) Para evitar N+1 fuerte, podríamos optimizar más adelante.
    // Por ahora: por cada user_id buscamos su último face_enrollment.
    const uniqueUserIds = [...new Set(rows.map(r => r.user_id))];

    const faceByUser = new Map<string, FaceEnrollmentRow | null>();
    await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const face = await this.repo.findLastFaceEnrollment(userId);
        faceByUser.set(userId, face);
      })
    );

    // 3) Mapear rows → MemberProfileDto (usando la misma lógica que getProfileByRutAndBranch)
    const profiles: MemberProfileDto[] = rows.map((row) => {
      const user: AppUserRow = {
        id: row.user_id,
        rut: row.rut,
        email: row.email,
        phone: row.phone,
        first_name: row.first_name,
        middle_name: row.middle_name,
        last_name: row.last_name,
        second_last_name: row.second_last_name,
        access_status: row.access_status,
        status: row.user_status,
      };

      const membership: MembershipRow = {
        membership_id: row.membership_id,
        membership_status: row.membership_status,
        start_date: row.start_date,
        end_date: row.end_date,
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        plan_code: row.plan_code,
        plan_name: row.plan_name,
        plan_scope: row.plan_scope,
      };

      const face = faceByUser.get(row.user_id) ?? null;

      return this.buildProfileDtoFromRows(user, membership, face);
    });

    return profiles;
  }

  // ===== Helpers compartidos =====

  private buildProfileDtoFromRows(
    user: AppUserRow,
    membership: MembershipRow | null,
    face: FaceEnrollmentRow | null
  ): MemberProfileDto {
    // 4) Mapear membershipStatus con override por fecha de vencimiento
    let membershipStatus: 'active' | 'expired' | 'inactive' = 'inactive';
    let membershipType: string | null = null;
    let membershipName: string | null = null;
    let membershipScope: 'ONECLUB' | 'MULTICLUB' | null = null;
    let membershipBranchId: string | null = null;
    let membershipBranchName: string | null = null;
    let membershipStart: string | null = null;
    let membershipEnd: string | null = null;

    if (membership) {
      membershipType = membership.plan_code;
      membershipName = membership.plan_name;
      membershipScope = membership.plan_scope;
      membershipBranchId = membership.branch_id;
      membershipBranchName = membership.branch_name;
      membershipStart = membership.start_date;
      membershipEnd = membership.end_date;

      const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
      const endDateStr = membership.end_date;                  // 'YYYY-MM-DD'

      if (endDateStr < todayStr) {
        membershipStatus = 'expired';
      } else if (membership.membership_status === 'EXPIRED') {
        membershipStatus = 'expired';
      } else {
        membershipStatus = 'active';
      }
    }

    // 5) Estado de enrolamiento / bloqueo
    let enrollmentStatus: 'enrolled' | 'not_enrolled' | 'locked' = 'not_enrolled';
    let enrollmentLocked = false;

    if (user.access_status === 'BLOQUEADO') {
      enrollmentStatus = 'locked';
      enrollmentLocked = true;
    } else if (face && face.status === 'ENROLLED') {
      enrollmentStatus = 'enrolled';
    }

    return {
      id: user.id,
      rut: user.rut,
      fullName: this.buildFullName(user),
      email: user.email,
      phone: user.phone,

      membershipType,
      membershipName,
      membershipStatus,
      membershipScope,
      membershipBranchId,
      membershipBranchName,
      membershipStart,
      membershipEnd,

      enrollmentStatus,
      enrollmentLocked,
    };
  }

  private normalizeRut(rut: string): string {
    return rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  }

  private buildFullName(user: AppUserRow): string {
    const parts = [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.second_last_name,
    ].filter(Boolean);

    return parts.join(' ');
  }
}
