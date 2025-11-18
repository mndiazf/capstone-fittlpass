// src/dtos/member-profile.dto.ts
export interface MemberProfileDto {
  id: string;
  rut: string;
  fullName: string;
  email: string;
  phone: string | null;

  membershipStatus: 'active' | 'inactive' | 'expired';
  enrollmentStatus: 'enrolled' | 'locked' | 'none';
  enrollmentLocked: boolean;

  membershipPlanCode: string | null;
  membershipPlanLabel: string | null;
  membershipPlanScope: 'ONECLUB' | 'MULTICLUB' | null;
  membershipBranchId: string | null;
  membershipBranchName: string | null;
  membershipValidFrom: string | null; // ISO date string
  membershipValidTo: string | null;
}
