// src/app/core/models/branch-schedule.interface.ts

export type BranchStatusValue = 'OPEN' | 'CLOSED' | 'TEMP_CLOSED';

// === DTOs que vienen / van al BACKEND ===

export interface OpeningHourDto {
  id: string;
  branchId: string;
  dayOfWeek: number;   // 1 = lunes ... 7 = domingo
  openTime: string;    // 'HH:MM' o 'HH:MM:SS'
  closeTime: string;   // 'HH:MM' o 'HH:MM:SS'
}

export interface SaveOpeningHourInput {
  dayOfWeek: number;   // 1..7
  openTime: string;    // 'HH:MM' o 'HH:MM:SS'
  closeTime: string;   // 'HH:MM' o 'HH:MM:SS'
}

export interface BranchStatusDto {
  branchId: string;
  status: BranchStatusValue;
  updatedAt: string;
  reason: string | null;
}

// === Modelo UI ===

export interface BranchStatus extends BranchStatusDto {
  isOpen: boolean; // calculado en el front: status === 'OPEN'
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  active?: boolean;
}

// Día de la semana alineado a tu BD (1..7)
export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

// Para indexar sin errores de tipos en el template
export const DAY_NAMES: Record<number, string> = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
  [DayOfWeek.SATURDAY]: 'Sábado',
  [DayOfWeek.SUNDAY]: 'Domingo',
};

// Modelo que usa SOLO el mantenedor UI (no se manda tal cual al backend)
export interface BranchSchedule {
  dayOfWeek: DayOfWeek;
  openTime: string;     // 'HH:MM'
  closeTime: string;    // 'HH:MM'
  backendId?: string;   // id del registro en branch_opening_hours (si existe)
}
