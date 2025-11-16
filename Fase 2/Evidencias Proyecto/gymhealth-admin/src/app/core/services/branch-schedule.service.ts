// src/app/core/services/branch-schedule.service.ts
// ✅ CORREGIDO: Filtrado correcto por sucursal según rol

import { Injectable, signal, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { 
  BranchSchedule, 
  BranchException, 
  Branch,
  DayOfWeek,
  ExceptionType 
} from '../models/branch-schedule.interface';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class BranchScheduleService {
  
  private authService = inject(AuthService);
  
  private selectedBranchSignal = signal<Branch | null>(null);
  selectedBranch = this.selectedBranchSignal.asReadonly();

  // Mock data: Sucursales
  private mockBranches: Branch[] = [
    {
      id: 1,
      name: 'GymHealth Las Condes',
      address: 'Av. Apoquindo 4501',
      city: 'Las Condes',
      region: 'Región Metropolitana',
      isActive: true
    },
    {
      id: 2,
      name: 'GymHealth Providencia',
      address: 'Av. Providencia 1650',
      city: 'Providencia',
      region: 'Región Metropolitana',
      isActive: true
    },
    {
      id: 3,
      name: 'GymHealth Viña del Mar',
      address: 'Av. San Martín 180',
      city: 'Viña del Mar',
      region: 'Región de Valparaíso',
      isActive: true
    }
  ];

  // Mock data: Horarios regulares
  private mockSchedules: BranchSchedule[] = [
    // Sucursal 1
    { id: 1, branchId: 1, branchName: 'GymHealth Las Condes', dayOfWeek: DayOfWeek.MONDAY, isOpen: true, openingTime: '06:00', closingTime: '23:00' },
    { id: 2, branchId: 1, branchName: 'GymHealth Las Condes', dayOfWeek: DayOfWeek.TUESDAY, isOpen: true, openingTime: '06:00', closingTime: '23:00' },
    { id: 3, branchId: 1, branchName: 'GymHealth Las Condes', dayOfWeek: DayOfWeek.WEDNESDAY, isOpen: true, openingTime: '06:00', closingTime: '23:00' },
    { id: 4, branchId: 1, branchName: 'GymHealth Las Condes', dayOfWeek: DayOfWeek.THURSDAY, isOpen: true, openingTime: '06:00', closingTime: '23:00' },
    { id: 5, branchId: 1, branchName: 'GymHealth Las Condes', dayOfWeek: DayOfWeek.FRIDAY, isOpen: true, openingTime: '06:00', closingTime: '23:00' },
    { id: 6, branchId: 1, branchName: 'GymHealth Las Condes', dayOfWeek: DayOfWeek.SATURDAY, isOpen: true, openingTime: '08:00', closingTime: '20:00' },
    { id: 7, branchId: 1, branchName: 'GymHealth Las Condes', dayOfWeek: DayOfWeek.SUNDAY, isOpen: true, openingTime: '09:00', closingTime: '18:00' },
    
    // Sucursal 2
    { id: 8, branchId: 2, branchName: 'GymHealth Providencia', dayOfWeek: DayOfWeek.MONDAY, isOpen: true, openingTime: '06:00', closingTime: '22:30' },
    { id: 9, branchId: 2, branchName: 'GymHealth Providencia', dayOfWeek: DayOfWeek.TUESDAY, isOpen: true, openingTime: '06:00', closingTime: '22:30' },
    { id: 10, branchId: 2, branchName: 'GymHealth Providencia', dayOfWeek: DayOfWeek.WEDNESDAY, isOpen: true, openingTime: '06:00', closingTime: '22:30' },
    { id: 11, branchId: 2, branchName: 'GymHealth Providencia', dayOfWeek: DayOfWeek.THURSDAY, isOpen: true, openingTime: '06:00', closingTime: '22:30' },
    { id: 12, branchId: 2, branchName: 'GymHealth Providencia', dayOfWeek: DayOfWeek.FRIDAY, isOpen: true, openingTime: '06:00', closingTime: '22:30' },
    { id: 13, branchId: 2, branchName: 'GymHealth Providencia', dayOfWeek: DayOfWeek.SATURDAY, isOpen: true, openingTime: '08:00', closingTime: '20:00' },
    { id: 14, branchId: 2, branchName: 'GymHealth Providencia', dayOfWeek: DayOfWeek.SUNDAY, isOpen: false },
    
    // Sucursal 3
    { id: 15, branchId: 3, branchName: 'GymHealth Viña del Mar', dayOfWeek: DayOfWeek.MONDAY, isOpen: true, openingTime: '07:00', closingTime: '22:00' },
    { id: 16, branchId: 3, branchName: 'GymHealth Viña del Mar', dayOfWeek: DayOfWeek.TUESDAY, isOpen: true, openingTime: '07:00', closingTime: '22:00' },
    { id: 17, branchId: 3, branchName: 'GymHealth Viña del Mar', dayOfWeek: DayOfWeek.WEDNESDAY, isOpen: true, openingTime: '07:00', closingTime: '22:00' },
    { id: 18, branchId: 3, branchName: 'GymHealth Viña del Mar', dayOfWeek: DayOfWeek.THURSDAY, isOpen: true, openingTime: '07:00', closingTime: '22:00' },
    { id: 19, branchId: 3, branchName: 'GymHealth Viña del Mar', dayOfWeek: DayOfWeek.FRIDAY, isOpen: true, openingTime: '07:00', closingTime: '22:00' },
    { id: 20, branchId: 3, branchName: 'GymHealth Viña del Mar', dayOfWeek: DayOfWeek.SATURDAY, isOpen: true, openingTime: '08:00', closingTime: '20:00' },
    { id: 21, branchId: 3, branchName: 'GymHealth Viña del Mar', dayOfWeek: DayOfWeek.SUNDAY, isOpen: true, openingTime: '09:00', closingTime: '18:00' }
  ];

  // Mock data: Excepciones
  private mockExceptions: BranchException[] = [
    {
      id: 1,
      branchId: 1,
      branchName: 'GymHealth Las Condes',
      date: new Date('2025-12-25'),
      isOpen: false,
      reason: 'Navidad',
      exceptionType: ExceptionType.HOLIDAY,
      createdBy: 'Admin Sistema',
      createdAt: new Date('2025-11-01')
    },
    {
      id: 2,
      branchId: 1,
      branchName: 'GymHealth Las Condes',
      date: new Date('2025-12-31'),
      isOpen: true,
      openingTime: '08:00',
      closingTime: '18:00',
      reason: 'Año Nuevo - Horario Especial',
      exceptionType: ExceptionType.SPECIAL_EVENT,
      createdBy: 'Admin Sistema',
      createdAt: new Date('2025-11-01')
    },
    {
      id: 3,
      branchId: 2,
      branchName: 'GymHealth Providencia',
      date: new Date('2025-12-25'),
      isOpen: false,
      reason: 'Navidad',
      exceptionType: ExceptionType.HOLIDAY,
      createdBy: 'Admin Sistema',
      createdAt: new Date('2025-11-01')
    }
  ];

  /**
   * ✅ CORREGIDO: Obtener sucursales filtradas por usuario
   */
  getBranches(): Observable<Branch[]> {
    // Si es super admin, mostrar todas las sucursales
    if (this.authService.isSuperAdmin()) {
      console.log('🔧 [BranchScheduleService] Super Admin - Mostrando todas las sucursales:', this.mockBranches.length);
      return of(this.mockBranches).pipe(delay(300));
    }

    // Si es admin de sucursal, mostrar solo su sucursal
    const userBranchId = this.authService.getCurrentUserBranchId();
    console.log('🔧 [BranchScheduleService] Admin Normal - Branch ID:', userBranchId);
    
    if (!userBranchId) {
      console.warn('⚠️ [BranchScheduleService] No se encontró branch ID para el usuario');
      return of([]).pipe(delay(300));
    }

    const userBranches = this.mockBranches.filter(b => b.id === userBranchId);
    console.log('🔧 [BranchScheduleService] Sucursales filtradas:', userBranches);
    
    return of(userBranches).pipe(delay(300));
  }

  /**
   * Obtener horarios regulares de una sucursal
   */
  getBranchSchedules(branchId: number): Observable<BranchSchedule[]> {
    const schedules = this.mockSchedules.filter(s => s.branchId === branchId);
    return of(schedules).pipe(delay(300));
  }

  /**
   * Obtener excepciones de una sucursal
   */
  getBranchExceptions(branchId: number): Observable<BranchException[]> {
    const exceptions = this.mockExceptions.filter(e => e.branchId === branchId);
    return of(exceptions).pipe(delay(300));
  }

  /**
   * Actualizar horario regular
   */
  updateSchedule(schedule: BranchSchedule): Observable<BranchSchedule> {
    const index = this.mockSchedules.findIndex(s => s.id === schedule.id);
    
    if (index !== -1) {
      const userName = this.authService.getCurrentUserFullName();
      this.mockSchedules[index] = {
        ...schedule,
        lastModifiedAt: new Date(),
        lastModifiedBy: userName
      };
    }
    
    return of(this.mockSchedules[index]).pipe(delay(500));
  }

  /**
   * Crear excepción
   */
  createException(exception: Omit<BranchException, 'id' | 'createdAt' | 'createdBy'>): Observable<BranchException> {
    const userName = this.authService.getCurrentUserFullName();
    
    const newException: BranchException = {
      ...exception,
      id: Math.max(...this.mockExceptions.map(e => e.id), 0) + 1,
      createdBy: userName,
      createdAt: new Date()
    };
    
    this.mockExceptions.push(newException);
    return of(newException).pipe(delay(500));
  }

  /**
   * Eliminar excepción
   */
  deleteException(exceptionId: number): Observable<boolean> {
    const index = this.mockExceptions.findIndex(e => e.id === exceptionId);
    if (index !== -1) {
      this.mockExceptions.splice(index, 1);
      return of(true).pipe(delay(500));
    }
    return of(false).pipe(delay(500));
  }

  /**
   * Actualizar excepción
   */
  updateException(exception: BranchException): Observable<BranchException> {
    const index = this.mockExceptions.findIndex(e => e.id === exception.id);
    if (index !== -1) {
      this.mockExceptions[index] = exception;
    }
    return of(this.mockExceptions[index]).pipe(delay(500));
  }

  /**
   * Seleccionar sucursal activa
   */
  selectBranch(branch: Branch | null): void {
    this.selectedBranchSignal.set(branch);
  }
}