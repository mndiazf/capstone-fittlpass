// src/app/features/management/branch-schedule/branch-schedule.component.ts

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import {
  Branch,
  BranchSchedule,
  BranchStatus,
  DayOfWeek,
  DAY_NAMES,
  OpeningHourDto,
  SaveOpeningHourInput,
} from '../../../core/models/branch-schedule.interface';

import {
  Auth,
  AdminJwtPayloadBranch,
} from '../../../core/services/auth/auth';
import { BranchManagement } from '../../../core/services/branch/branch-management';

@Component({
  selector: 'app-branch-schedule',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './branch-schedule.component.html',
  styleUrl: './branch-schedule.component.scss',
})
export class BranchScheduleComponent implements OnInit {
  // Estado UI
  currentBranch = signal<Branch | null>(null);
  schedules = signal<BranchSchedule[]>([]);
  branchStatus = signal<BranchStatus | null>(null);

  isLoading = signal(false);
  isSaving = signal(false);
  isChangingBranchStatus = signal(false);

  // Día -> nombre
  dayNames = DAY_NAMES;
  dayOrder = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ];

  // Form dummy por si después agregas algo global
  scheduleForm: FormGroup;

  constructor(
    private readonly scheduleService: BranchManagement,
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar,
    private readonly auth: Auth
  ) {
    this.scheduleForm = this.fb.group({
      dummy: [''],
    });

    // Para que SIEMPRE veas los 7 días, incluso antes de que responda el backend
    this.schedules.set(this.createEmptyWeek());
  }

  ngOnInit(): void {
    this.initBranchFromJwt();
  }

  /**
   * Saca la sucursal del JWT y carga horarios + estado.
   */
  private initBranchFromJwt(): void {
    const payload = this.auth.decodedToken;

    if (!payload || !payload.branches || payload.branches.length === 0) {
      this.showError('No se encontró sucursal en el token');
      return;
    }

    const branchPayload: AdminJwtPayloadBranch = payload.branches[0];

    const branch: Branch = {
      id: branchPayload.id,
      code: branchPayload.code,
      name: branchPayload.name,
      address: '',
      city: '',
      region: '',
      active: true,
    };

    this.currentBranch.set(branch);

    this.loadBranchStatus(branch.id);
    this.loadOpeningHours(branch.id);
  }

  // ================== Helpers de semana ==================

  private createEmptyWeek(): BranchSchedule[] {
    return this.dayOrder.map((day) => ({
      dayOfWeek: day,
      openTime: '',
      closeTime: '',
      backendId: undefined,
    }));
  }

  private buildWeekFromOpeningHours(rows: OpeningHourDto[]): BranchSchedule[] {
    const base = this.createEmptyWeek();

    for (const row of rows) {
      const day = base.find(
        (d) => d.dayOfWeek === (row.dayOfWeek as DayOfWeek)
      );
      if (!day) continue;

      day.openTime = this.toHHMM(row.openTime);
      day.closeTime = this.toHHMM(row.closeTime);
      day.backendId = row.id;
    }

    return base;
  }

  private toHHMM(time: string): string {
    if (!time) return '';
    const parts = time.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
    }

  private toBackendTime(time: string): string {
    if (!time) return '';
    if (time.length === 5) {
      return `${time}:00`;
    }
    return time;
  }

  // ================== Carga de datos ==================

  private loadOpeningHours(branchId: string): void {
    this.isLoading.set(true);

    this.scheduleService.getOpeningHours(branchId).subscribe({
      next: (rows: OpeningHourDto[]) => {
        const week = this.buildWeekFromOpeningHours(rows);
        this.schedules.set(week);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        // Aunque falle, ya tienes la semana vacía y puedes guardar
        this.showError('Error al cargar horarios de la sucursal');
      },
    });
  }

  private loadBranchStatus(branchId: string): void {
    this.scheduleService.getBranchStatus(branchId).subscribe({
      next: (status) => {
        this.branchStatus.set(status);
      },
      error: () => {
        this.showError('Error al cargar el estado de la sucursal');
      },
    });
  }

  // ================== Acciones de horarios ==================

  onTimeChange(
    schedule: BranchSchedule,
    field: 'openTime' | 'closeTime',
    value: string
  ): void {
    const updated: BranchSchedule = {
      ...schedule,
      [field]: value,
    };

    const current = this.schedules().map((s) =>
      s.dayOfWeek === schedule.dayOfWeek ? updated : s
    );
    this.schedules.set(current);
  }

  saveSchedules(): void {
    const branch = this.currentBranch();
    if (!branch) return;

    this.isSaving.set(true);

    const payload: SaveOpeningHourInput[] = this.schedules()
      // Solo días que tengan ambas horas -> día con horario
      .filter((d) => d.openTime && d.closeTime)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        openTime: this.toBackendTime(d.openTime),
        closeTime: this.toBackendTime(d.closeTime),
      }));

    this.scheduleService
      .saveOpeningHours(branch.id, payload)
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showSuccess('Horarios actualizados correctamente');
          this.loadOpeningHours(branch.id);
        },
        error: () => {
          this.isSaving.set(false);
          this.showError('Error al actualizar horarios');
        },
      });
  }

  // ================== Abrir / cerrar sucursal ==================

  toggleBranchStatus(): void {
    const branch = this.currentBranch();
    const currentStatus = this.branchStatus();

    if (!branch) return;

    this.isChangingBranchStatus.set(true);

    if (!currentStatus || currentStatus.status !== 'OPEN') {
      // Abrir sucursal
      this.scheduleService.openBranch(branch.id).subscribe({
        next: (status) => {
          this.branchStatus.set(status);
          this.showSuccess('Sucursal abierta correctamente');
          this.isChangingBranchStatus.set(false);
        },
        error: () => {
          this.showError('Error al abrir la sucursal');
          this.isChangingBranchStatus.set(false);
        },
      });
    } else {
      // Cerrar sucursal SIN motivo (solo cerrar)
      this.scheduleService.closeBranch(branch.id).subscribe({
        next: (status) => {
          this.branchStatus.set(status);
          this.showSuccess('Sucursal cerrada correctamente');
          this.isChangingBranchStatus.set(false);
        },
        error: () => {
          this.showError('Error al cerrar la sucursal');
          this.isChangingBranchStatus.set(false);
        },
      });
    }
  }

  // ================== Helpers UI ==================

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
