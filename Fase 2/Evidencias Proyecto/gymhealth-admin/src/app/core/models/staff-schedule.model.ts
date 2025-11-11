// src/app/core/models/staff-schedule.model.ts

export enum DayOfWeek {
  MONDAY = 'Lunes',
  TUESDAY = 'Martes',
  WEDNESDAY = 'Miércoles',
  THURSDAY = 'Jueves',
  FRIDAY = 'Viernes',
  SATURDAY = 'Sábado',
  SUNDAY = 'Domingo'
}

export enum StaffRole {
  RECEPCIONISTA = 'Recepcionista',
  ENTRENADOR = 'Entrenador Personal',
  INSTRUCTOR = 'Instructor de Clases',
  NUTRICIONISTA = 'Nutricionista',
  MANTENIMIENTO = 'Mantenimiento',
  LIMPIEZA = 'Limpieza'
}

export enum ShiftType {
  MORNING = 'Mañana',
  AFTERNOON = 'Tarde',
  NIGHT = 'Noche',
  CUSTOM = 'Personalizado'
}

export interface Shift {
  type: ShiftType;
  startTime: string;
  endTime: string;
  days: DayOfWeek[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
}

export interface StaffMember {
  id: string;
  rut: string;
  name: string;
  role: StaffRole;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  startDate: Date;
  branchId: string; // Nueva propiedad
  branchName: string; // Nueva propiedad
  shiftType: ShiftType; // Nuevo: tipo de turno asignado
  hasCustomSchedule: boolean; // Nuevo: indica si tiene horario personalizado
}

export interface WorkSchedule {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface RoleGroup {
  role: StaffRole;
  members: StaffMember[];
  defaultShift?: Shift;
}

// Turnos predefinidos
export const PREDEFINED_SHIFTS: Record<ShiftType, Shift> = {
  [ShiftType.MORNING]: {
    type: ShiftType.MORNING,
    startTime: '07:00',
    endTime: '15:00',
    days: [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY
    ]
  },
  [ShiftType.AFTERNOON]: {
    type: ShiftType.AFTERNOON,
    startTime: '14:00',
    endTime: '22:00',
    days: [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY
    ]
  },
  [ShiftType.NIGHT]: {
    type: ShiftType.NIGHT,
    startTime: '18:00',
    endTime: '23:00',
    days: [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY
    ]
  },
  [ShiftType.CUSTOM]: {
    type: ShiftType.CUSTOM,
    startTime: '09:00',
    endTime: '18:00',
    days: []
  }
};