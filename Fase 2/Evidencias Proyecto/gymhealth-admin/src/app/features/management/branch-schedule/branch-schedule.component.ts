// src/app/features/management/branch-schedule/branch-schedule.component.ts

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BranchScheduleService } from '../../../core/services/branch-schedule.service';
import { 
  Branch, 
  BranchSchedule, 
  BranchException, 
  DayOfWeek, 
  DAY_NAMES,
  ExceptionType,
  EXCEPTION_TYPE_LABELS
} from '../../../core/models/branch-schedule.interface';

@Component({
  selector: 'app-branch-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTableModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './branch-schedule.component.html',
  styleUrl: './branch-schedule.component.scss'
})
export class BranchScheduleComponent implements OnInit {
  
  // Signals
  branches = signal<Branch[]>([]);
  schedules = signal<BranchSchedule[]>([]);
  exceptions = signal<BranchException[]>([]);
  isLoading = signal(false);
  showExceptionForm = signal(false);

  // Forms
  exceptionForm: FormGroup;

  // Enums y mapas para el template
  dayNames = DAY_NAMES;
  exceptionTypes = Object.values(ExceptionType);
  exceptionTypeLabels = EXCEPTION_TYPE_LABELS;

  // Orden de días
  dayOrder = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY
  ];

  // Fecha mínima para el datepicker
  minDate = new Date();

  // Verificar si debe mostrar selector (solo si hay múltiples sucursales)
  showBranchSelector = computed(() => {
    const branches = this.branches();
    return branches.length > 1;
  });

  constructor(
    public scheduleService: BranchScheduleService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.exceptionForm = this.fb.group({
      date: [null, Validators.required],
      isOpen: [false],
      openingTime: [''],
      closingTime: [''],
      reason: ['', Validators.required],
      exceptionType: [ExceptionType.OTHER, Validators.required]
    });

    // Suscribirse a cambios en isOpen para validar horarios
    this.exceptionForm.get('isOpen')?.valueChanges.subscribe(isOpen => {
      if (isOpen) {
        this.exceptionForm.get('openingTime')?.setValidators(Validators.required);
        this.exceptionForm.get('closingTime')?.setValidators(Validators.required);
      } else {
        this.exceptionForm.get('openingTime')?.clearValidators();
        this.exceptionForm.get('closingTime')?.clearValidators();
      }
      this.exceptionForm.get('openingTime')?.updateValueAndValidity();
      this.exceptionForm.get('closingTime')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    this.scheduleService.getBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        
        // ✅ Seleccionar automáticamente la sucursal del usuario
        // Si solo hay una sucursal (admin normal), se selecciona automáticamente
        // Si hay múltiples (super admin), se selecciona la primera
        if (branches.length > 0) {
          this.onBranchSelected(branches[0]);
        }
        
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showError('Error al cargar las sucursales');
      }
    });
  }

  onBranchSelected(branch: Branch): void {
    this.scheduleService.selectBranch(branch);
    this.loadBranchData(branch.id);
  }

  loadBranchData(branchId: number): void {
    this.isLoading.set(true);

    // Cargar horarios regulares
    this.scheduleService.getBranchSchedules(branchId).subscribe({
      next: (schedules) => {
        // Ordenar por día de la semana
        const ordered = this.dayOrder
          .map(day => schedules.find(s => s.dayOfWeek === day))
          .filter((s): s is BranchSchedule => s !== undefined);
        
        this.schedules.set(ordered);
      },
      error: () => this.showError('Error al cargar horarios')
    });

    // Cargar excepciones
    this.scheduleService.getBranchExceptions(branchId).subscribe({
      next: (exceptions) => {
        // Ordenar por fecha
        const sorted = exceptions.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        this.exceptions.set(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showError('Error al cargar excepciones');
      }
    });
  }

  onScheduleToggle(schedule: BranchSchedule, isOpen: boolean): void {
    const updated = { ...schedule, isOpen };
    
    // Si se cierra, limpiar horarios
    if (!isOpen) {
      updated.openingTime = undefined;
      updated.closingTime = undefined;
    }

    this.updateSchedule(updated);
  }

  onTimeChange(schedule: BranchSchedule, field: 'openingTime' | 'closingTime', value: string): void {
    const updated = { ...schedule, [field]: value };
    this.updateSchedule(updated);
  }

  updateSchedule(schedule: BranchSchedule): void {
    this.scheduleService.updateSchedule(schedule).subscribe({
      next: () => {
        this.showSuccess('Horario actualizado correctamente');
        // Actualizar en la lista local
        const current = this.schedules();
        const index = current.findIndex(s => s.id === schedule.id);
        if (index !== -1) {
          current[index] = schedule;
          this.schedules.set([...current]);
        }
      },
      error: () => this.showError('Error al actualizar horario')
    });
  }

  toggleExceptionForm(): void {
    this.showExceptionForm.update(v => !v);
    if (!this.showExceptionForm()) {
      this.exceptionForm.reset({
        isOpen: false,
        exceptionType: ExceptionType.OTHER
      });
    }
  }

  onSubmitException(): void {
    if (this.exceptionForm.invalid) {
      this.showError('Por favor complete todos los campos requeridos');
      return;
    }

    const selectedBranch = this.scheduleService.selectedBranch();
    if (!selectedBranch) {
      this.showError('Debe seleccionar una sucursal');
      return;
    }

    const formValue = this.exceptionForm.value;
    const exception: Omit<BranchException, 'id' | 'createdAt' | 'createdBy'> = {
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      date: formValue.date,
      isOpen: formValue.isOpen,
      openingTime: formValue.isOpen ? formValue.openingTime : undefined,
      closingTime: formValue.isOpen ? formValue.closingTime : undefined,
      reason: formValue.reason,
      exceptionType: formValue.exceptionType
    };

    this.scheduleService.createException(exception).subscribe({
      next: (created) => {
        this.showSuccess('Excepción creada correctamente');
        this.exceptions.update(list => [...list, created].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ));
        this.toggleExceptionForm();
      },
      error: () => this.showError('Error al crear excepción')
    });
  }

  deleteException(exception: BranchException): void {
    if (!confirm(`¿Está seguro de eliminar la excepción del ${this.formatDate(exception.date)}?`)) {
      return;
    }

    this.scheduleService.deleteException(exception.id).subscribe({
      next: () => {
        this.showSuccess('Excepción eliminada correctamente');
        this.exceptions.update(list => list.filter(e => e.id !== exception.id));
      },
      error: () => this.showError('Error al eliminar excepción')
    });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  isDateInPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}