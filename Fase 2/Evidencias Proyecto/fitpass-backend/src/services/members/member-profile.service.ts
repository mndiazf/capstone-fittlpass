// src/services/member/member-profile.service.ts

import { AppUserRow, FaceEnrollmentRow, MemberProfileRepository, MembershipRow } from "../../repositories/members/member-profile.repository";


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

    // 2) Membresía aplicable a la sucursal (ONECLUB en branch, MULTICLUB null)
    const membership: MembershipRow | null =
      await this.repo.findMembershipForUserAndBranch(user.id, branchId);

    // 3) Último estado de enrolamiento facial
    const face: FaceEnrollmentRow | null =
      await this.repo.findLastFaceEnrollment(user.id);

    // 4) Mapear membershipStatus
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

      membershipStatus =
        membership.membership_status === 'ACTIVE' ? 'active' : 'expired';
    }

    // 5) Estado de enrolamiento
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
