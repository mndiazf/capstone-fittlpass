// src/app/features/management/staff-schedule/staff-schedule.component.ts

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';

import { StaffScheduleService } from '../../../core/services/staff-schedule.service';
import { StaffMember, StaffRole, ShiftType, RoleGroup } from '../../../core/models/staff-schedule.model';

@Component({
  selector: 'app-staff-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatBadgeModule
  ],
  templateUrl: './staff-schedule.component.html',
  styleUrl: './staff-schedule.component.scss'
})
export class StaffScheduleComponent implements OnInit {
  private staffService = inject(StaffScheduleService);
  private router = inject(Router);

  // Signals
  roleGroups = computed(() => this.staffService.staffByRole());
  selectedStaffIds = signal<Set<string>>(new Set());
  expandedRoles = signal<Set<StaffRole>>(new Set());
  openShiftMenuFor = signal<string | null>(null); // Para controlar qué menú está abierto

  // Enums para la plantilla
  readonly ShiftType = ShiftType;
  readonly StaffRole = StaffRole;

  // Computed
  hasSelection = computed(() => this.selectedStaffIds().size > 0);
  
  selectedCount = computed(() => this.selectedStaffIds().size);

  selectedStaff = computed(() => {
    const ids = this.selectedStaffIds();
    const groups = this.roleGroups();
    const selected: StaffMember[] = [];
    
    groups.forEach(group => {
      group.members.forEach(member => {
        if (ids.has(member.id)) {
          selected.push(member);
        }
      });
    });
    
    return selected;
  });

  ngOnInit(): void {
    // Expandir todos los roles al inicio
    const allRoles = Object.values(StaffRole);
    this.expandedRoles.set(new Set(allRoles));
  }

  /**
   * Toggle selección de un miembro del staff
   */
  toggleStaffSelection(staffId: string): void {
    this.selectedStaffIds.update(current => {
      const newSet = new Set(current);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  }

  /**
   * Verificar si un staff está seleccionado
   */
  isSelected(staffId: string): boolean {
    return this.selectedStaffIds().has(staffId);
  }

  /**
   * Seleccionar todos los miembros de un rol
   */
  selectAllInRole(role: StaffRole): void {
    const group = this.roleGroups().find(g => g.role === role);
    if (!group) return;

    this.selectedStaffIds.update(current => {
      const newSet = new Set(current);
      group.members.forEach(member => newSet.add(member.id));
      return newSet;
    });
  }

  /**
   * Deseleccionar todos los miembros de un rol
   */
  deselectAllInRole(role: StaffRole): void {
    const group = this.roleGroups().find(g => g.role === role);
    if (!group) return;

    this.selectedStaffIds.update(current => {
      const newSet = new Set(current);
      group.members.forEach(member => newSet.delete(member.id));
      return newSet;
    });
  }

  /**
   * Verificar si todos los miembros de un rol están seleccionados
   */
  allSelectedInRole(role: StaffRole): boolean {
    const group = this.roleGroups().find(g => g.role === role);
    if (!group) return false;

    return group.members.every(member => this.selectedStaffIds().has(member.id));
  }

  /**
   * Verificar si algunos (pero no todos) están seleccionados en un rol
   */
  someSelectedInRole(role: StaffRole): boolean {
    const group = this.roleGroups().find(g => g.role === role);
    if (!group) return false;

    const selectedInRole = group.members.filter(member => 
      this.selectedStaffIds().has(member.id)
    ).length;

    return selectedInRole > 0 && selectedInRole < group.members.length;
  }

  /**
   * Limpiar selección
   */
  clearSelection(): void {
    this.selectedStaffIds.set(new Set());
  }

  /**
   * Asignar turno a los seleccionados
   */
  assignShift(shiftType: ShiftType): void {
    const ids = Array.from(this.selectedStaffIds());
    if (ids.length === 0) {
      alert('⚠️ Debes seleccionar al menos un miembro del personal');
      return;
    }

    this.staffService.assignShiftToMultiple(ids, shiftType);
    this.clearSelection();
    alert(`✅ Turno "${shiftType}" asignado exitosamente a ${ids.length} persona(s)`);
  }

  /**
   * Navegar a configuración avanzada
   */
  goToAdvancedConfig(staffId: string): void {
    this.router.navigate(['/management/staff-schedule/detail', staffId]);
  }

  /**
   * Toggle expansión de un rol
   */
  toggleRoleExpansion(role: StaffRole): void {
    this.expandedRoles.update(current => {
      const newSet = new Set(current);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  }

  /**
   * Verificar si un rol está expandido
   */
  isRoleExpanded(role: StaffRole): boolean {
    return this.expandedRoles().has(role);
  }

  /**
   * Obtener color del chip de turno
   */
  getShiftColor(shiftType: ShiftType): string {
    const colors: Record<ShiftType, string> = {
      [ShiftType.MORNING]: 'primary',
      [ShiftType.AFTERNOON]: 'accent',
      [ShiftType.NIGHT]: 'warn',
      [ShiftType.CUSTOM]: ''
    };
    return colors[shiftType] || '';
  }

  /**
   * Obtener icono del turno
   */
  getShiftIcon(shiftType: ShiftType): string {
    const icons: Record<ShiftType, string> = {
      [ShiftType.MORNING]: 'wb_sunny',
      [ShiftType.AFTERNOON]: 'wb_twilight',
      [ShiftType.NIGHT]: 'nights_stay',
      [ShiftType.CUSTOM]: 'settings'
    };
    return icons[shiftType] || 'schedule';
  }

  /**
   * Obtener descripción del turno
   */
  getShiftDescription(shiftType: ShiftType): string {
    const descriptions: Record<ShiftType, string> = {
      [ShiftType.MORNING]: '07:00 - 15:00 (L-V)',
      [ShiftType.AFTERNOON]: '14:00 - 22:00 (L-S)',
      [ShiftType.NIGHT]: '18:00 - 23:00 (L-V)',
      [ShiftType.CUSTOM]: 'Horario personalizado'
    };
    return descriptions[shiftType] || '';
  }

  /**
   * Toggle menú de turnos para un staff específico
   */
  toggleShiftMenu(staffId: string, event: Event): void {
    event.stopPropagation();
    if (this.openShiftMenuFor() === staffId) {
      this.openShiftMenuFor.set(null);
    } else {
      this.openShiftMenuFor.set(staffId);
    }
  }

  /**
   * Verificar si el menú de turnos está abierto para un staff
   */
  isShiftMenuOpen(staffId: string): boolean {
    return this.openShiftMenuFor() === staffId;
  }

  /**
   * Asignar turno a un staff individual
   */
  assignShiftToStaff(staffId: string, shiftType: ShiftType, event: Event): void {
    event.stopPropagation();
    this.staffService.assignShiftToMultiple([staffId], shiftType);
    this.openShiftMenuFor.set(null);
  }

  /**
   * Obtener turnos disponibles excluyendo el actual
   */
  getAvailableShifts(currentShift: ShiftType): ShiftType[] {
    return Object.values(ShiftType).filter(shift => shift !== currentShift);
  }

  /**
   * Obtener color del fondo del chip según el turno
   */
  getShiftChipColor(shiftType: ShiftType): string {
    const colors: Record<ShiftType, string> = {
      [ShiftType.MORNING]: 'rgba(251, 191, 36, 0.2)', // Amarillo/Sol
      [ShiftType.AFTERNOON]: 'rgba(249, 115, 22, 0.2)', // Naranja/Atardecer
      [ShiftType.NIGHT]: 'rgba(139, 92, 246, 0.2)', // Púrpura/Noche
      [ShiftType.CUSTOM]: 'rgba(0, 210, 198, 0.2)' // Calipso
    };
    return colors[shiftType] || 'rgba(0, 210, 198, 0.2)';
  }

  /**
   * Obtener color del borde del chip según el turno
   */
  getShiftChipBorderColor(shiftType: ShiftType): string {
    const colors: Record<ShiftType, string> = {
      [ShiftType.MORNING]: 'rgba(251, 191, 36, 0.4)',
      [ShiftType.AFTERNOON]: 'rgba(249, 115, 22, 0.4)',
      [ShiftType.NIGHT]: 'rgba(139, 92, 246, 0.4)',
      [ShiftType.CUSTOM]: 'rgba(0, 210, 198, 0.4)'
    };
    return colors[shiftType] || 'rgba(0, 210, 198, 0.4)';
  }
}