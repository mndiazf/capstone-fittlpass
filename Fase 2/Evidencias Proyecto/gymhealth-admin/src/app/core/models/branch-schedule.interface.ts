// src/app/core/models/branch-schedule.interface.ts

export interface BranchSchedule {
  id: number;
  branchId: number;
  branchName: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openingTime?: string; // Formato "HH:mm" (ej: "06:00")
  closingTime?: string; // Formato "HH:mm" (ej: "23:00")
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
}

export interface BranchException {
  id: number;
  branchId: number;
  branchName: string;
  date: Date;
  isOpen: boolean;
  openingTime?: string;
  closingTime?: string;
  reason: string;
  exceptionType: ExceptionType;
  createdBy: string;
  createdAt: Date;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  isActive: boolean;
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export enum ExceptionType {
  HOLIDAY = 'HOLIDAY',
  MAINTENANCE = 'MAINTENANCE',
  SPECIAL_EVENT = 'SPECIAL_EVENT',
  EMERGENCY = 'EMERGENCY',
  OTHER = 'OTHER'
}

export const DAY_NAMES: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
  [DayOfWeek.SATURDAY]: 'Sábado',
  [DayOfWeek.SUNDAY]: 'Domingo'
};

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  [ExceptionType.HOLIDAY]: 'Día Festivo',
  [ExceptionType.MAINTENANCE]: 'Mantención',
  [ExceptionType.SPECIAL_EVENT]: 'Evento Especial',
  [ExceptionType.EMERGENCY]: 'Emergencia',
  [ExceptionType.OTHER]: 'Otro'
};