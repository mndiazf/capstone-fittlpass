// src/app/core/services/staff-schedule.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { 
  StaffMember, 
  WorkSchedule, 
  DayOfWeek, 
  StaffRole, 
  ShiftType, 
  Shift, 
  RoleGroup,
  PREDEFINED_SHIFTS,
  Branch
} from '../models/staff-schedule.model';

@Injectable({
  providedIn: 'root'
})
export class StaffScheduleService {
  
  // Signal para la sucursal del admin actual
  private currentBranchSignal = signal<string>('1'); // Cambia esto según el admin logueado
  
  // Signals para estado reactivo
  private staffMembersSignal = signal<StaffMember[]>([
    // SUCURSAL 1 - Centro
    {
      id: '1',
      rut: '12345678-9',
      name: 'Juan Pérez González',
      role: StaffRole.ENTRENADOR,
      email: 'juan.perez@gymhealth.cl',
      phone: '+56912345678',
      status: 'active',
      startDate: new Date('2023-01-15'),
      branchId: '1',
      branchName: 'Sucursal Centro',
      shiftType: ShiftType.MORNING,
      hasCustomSchedule: false
    },
    {
      id: '2',
      rut: '98765432-1',
      name: 'María García López',
      role: StaffRole.RECEPCIONISTA,
      email: 'maria.garcia@gymhealth.cl',
      phone: '+56987654321',
      status: 'active',
      startDate: new Date('2023-03-10'),
      branchId: '1',
      branchName: 'Sucursal Centro',
      shiftType: ShiftType.AFTERNOON,
      hasCustomSchedule: false
    },
    {
      id: '3',
      rut: '11223344-5',
      name: 'Carlos Muñoz Silva',
      role: StaffRole.INSTRUCTOR,
      email: 'carlos.munoz@gymhealth.cl',
      phone: '+56911223344',
      status: 'active',
      startDate: new Date('2023-06-20'),
      branchId: '1',
      branchName: 'Sucursal Centro',
      shiftType: ShiftType.MORNING,
      hasCustomSchedule: false
    },
    {
      id: '4',
      rut: '22334455-6',
      name: 'Ana Martínez Rojas',
      role: StaffRole.NUTRICIONISTA,
      email: 'ana.martinez@gymhealth.cl',
      phone: '+56922334455',
      status: 'active',
      startDate: new Date('2023-08-05'),
      branchId: '1',
      branchName: 'Sucursal Centro',
      shiftType: ShiftType.CUSTOM,
      hasCustomSchedule: true
    },
    {
      id: '5',
      rut: '33445566-7',
      name: 'Pedro Soto Vargas',
      role: StaffRole.RECEPCIONISTA,
      email: 'pedro.soto@gymhealth.cl',
      phone: '+56933445566',
      status: 'active',
      startDate: new Date('2023-09-12'),
      branchId: '1',
      branchName: 'Sucursal Centro',
      shiftType: ShiftType.NIGHT,
      hasCustomSchedule: false
    },
    
    // SUCURSAL 2 - Norte
    {
      id: '6',
      rut: '44556677-8',
      name: 'Laura Fernández Castro',
      role: StaffRole.RECEPCIONISTA,
      email: 'laura.fernandez@gymhealth.cl',
      phone: '+56944556677',
      status: 'active',
      startDate: new Date('2023-07-20'),
      branchId: '2',
      branchName: 'Sucursal Norte',
      shiftType: ShiftType.MORNING,
      hasCustomSchedule: false
    },
    {
      id: '7',
      rut: '55667788-9',
      name: 'Roberto Díaz Morales',
      role: StaffRole.ENTRENADOR,
      email: 'roberto.diaz@gymhealth.cl',
      phone: '+56955667788',
      status: 'active',
      startDate: new Date('2023-10-05'),
      branchId: '2',
      branchName: 'Sucursal Norte',
      shiftType: ShiftType.AFTERNOON,
      hasCustomSchedule: false
    }
  ]);

  private schedulesSignal = signal<WorkSchedule[]>([
    // Ana Martínez - Horario personalizado (Lunes, Miércoles, Viernes)
    { id: '15', staffId: '4', dayOfWeek: DayOfWeek.MONDAY, startTime: '10:00', endTime: '19:00', isActive: true },
    { id: '16', staffId: '4', dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '10:00', endTime: '19:00', isActive: true },
    { id: '17', staffId: '4', dayOfWeek: DayOfWeek.FRIDAY, startTime: '10:00', endTime: '19:00', isActive: true },
  ]);

  // Computed signals
  readonly staffMembers = this.staffMembersSignal.asReadonly();
  readonly schedules = this.schedulesSignal.asReadonly();
  readonly currentBranch = this.currentBranchSignal.asReadonly();

  // Staff filtrado por sucursal del admin
  readonly staffByBranch = computed(() => 
    this.staffMembersSignal().filter(s => s.branchId === this.currentBranchSignal())
  );

  // Staff agrupado por roles (solo de la sucursal actual)
  readonly staffByRole = computed(() => {
    const staff = this.staffByBranch();
    const groups: RoleGroup[] = [];

    Object.values(StaffRole).forEach(role => {
      const members = staff.filter(s => s.role === role && s.status === 'active');
      if (members.length > 0) {
        groups.push({ role, members });
      }
    });

    return groups;
  });

  readonly totalStaff = computed(() => this.staffByBranch().length);
  readonly activeStaff = computed(() => 
    this.staffByBranch().filter(s => s.status === 'active').length
  );

  /**
   * Establecer sucursal actual del admin
   */
  setCurrentBranch(branchId: string): void {
    this.currentBranchSignal.set(branchId);
  }

  /**
   * Obtener staff por ID
   */
  getStaffById(id: string): StaffMember | undefined {
    return this.staffMembersSignal().find(s => s.id === id);
  }

  /**
   * Obtener horarios de un miembro del personal
   */
  getSchedulesByStaffId(staffId: string): WorkSchedule[] {
    return this.schedulesSignal().filter(s => s.staffId === staffId);
  }

  /**
   * Asignar turno a múltiples miembros del personal
   */
  assignShiftToMultiple(staffIds: string[], shiftType: ShiftType): void {
    this.staffMembersSignal.update(current =>
      current.map(staff => {
        if (staffIds.includes(staff.id)) {
          return {
            ...staff,
            shiftType,
            hasCustomSchedule: false
          };
        }
        return staff;
      })
    );

    // Crear horarios automáticamente según el turno
    if (shiftType !== ShiftType.CUSTOM) {
      const shift = PREDEFINED_SHIFTS[shiftType];
      staffIds.forEach(staffId => {
        this.createSchedulesFromShift(staffId, shift);
      });
    }
  }

  /**
   * Crear horarios a partir de un turno predefinido
   */
  private createSchedulesFromShift(staffId: string, shift: Shift): void {
    // Eliminar horarios anteriores del staff
    this.schedulesSignal.update(current =>
      current.filter(s => s.staffId !== staffId)
    );

    // Crear nuevos horarios
    const newSchedules: WorkSchedule[] = shift.days.map(day => ({
      id: `${staffId}-${day}-${Date.now()}`,
      staffId,
      dayOfWeek: day,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isActive: true
    }));

    this.schedulesSignal.update(current => [...current, ...newSchedules]);
  }

  /**
   * Actualizar horarios de un miembro del personal (modo personalizado)
   */
  updateSchedules(schedules: WorkSchedule[]): void {
    const staffId = schedules[0]?.staffId;
    if (!staffId) return;

    // Marcar al staff como horario personalizado
    this.staffMembersSignal.update(current =>
      current.map(staff =>
        staff.id === staffId
          ? { ...staff, hasCustomSchedule: true, shiftType: ShiftType.CUSTOM }
          : staff
      )
    );

    // Actualizar horarios
    this.schedulesSignal.update(current => {
      const filtered = current.filter(s => s.staffId !== staffId);
      return [...filtered, ...schedules];
    });
  }

  /**
   * Agregar un horario
   */
  addSchedule(schedule: WorkSchedule): WorkSchedule {
    const newSchedule: WorkSchedule = {
      ...schedule,
      id: Date.now().toString()
    };
    
    this.schedulesSignal.update(current => [...current, newSchedule]);
    return newSchedule;
  }

  /**
   * Eliminar un horario
   */
  deleteSchedule(scheduleId: string): void {
    this.schedulesSignal.update(current => 
      current.filter(s => s.id !== scheduleId)
    );
  }

  /**
   * Toggle estado de un horario
   */
  toggleSchedule(scheduleId: string): void {
    this.schedulesSignal.update(current =>
      current.map(s => 
        s.id === scheduleId ? { ...s, isActive: !s.isActive } : s
      )
    );
  }

  /**
   * Calcular horas semanales
   */
  calculateWeeklyHours(schedules: WorkSchedule[]): number {
    return schedules
      .filter(s => s.isActive)
      .reduce((total, schedule) => {
        const start = this.timeToMinutes(schedule.startTime);
        const end = this.timeToMinutes(schedule.endTime);
        return total + (end - start) / 60;
      }, 0);
  }

  /**
   * Obtener reporte semanal por rol
   */
  getWeeklyReportByRole() {
    return this.staffByRole().map(group => {
      const totalHours = group.members.reduce((total, staff) => {
        const staffSchedules = this.schedulesSignal().filter(s => 
          s.staffId === staff.id && s.isActive
        );
        return total + this.calculateWeeklyHours(staffSchedules);
      }, 0);

      return {
        role: group.role,
        memberCount: group.members.length,
        totalHours,
        averageHours: totalHours / group.members.length
      };
    });
  }

  /**
   * Convertir tiempo a minutos
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}