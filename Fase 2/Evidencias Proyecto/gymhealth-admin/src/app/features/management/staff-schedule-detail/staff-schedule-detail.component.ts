// src/app/features/management/staff-schedule-detail/staff-schedule-detail.component.ts

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { StaffScheduleService } from '../../../core/services/staff-schedule.service';
import { StaffMember, WorkSchedule, DayOfWeek } from '../../../core/models/staff-schedule.model';

@Component({
  selector: 'app-staff-schedule-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './staff-schedule-detail.component.html',
  styleUrl: './staff-schedule-detail.component.scss'
})
export class StaffScheduleDetailComponent implements OnInit {
  private staffService = inject(StaffScheduleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals
  selectedStaff = signal<StaffMember | null>(null);
  schedules = signal<WorkSchedule[]>([]);
  isEditing = signal(false);
  
  readonly daysOfWeek = Object.values(DayOfWeek);

  // Computed
  weeklyHours = computed(() => {
    const staff = this.selectedStaff();
    if (!staff) return 0;
    
    return this.schedules()
      .filter(s => s.staffId === staff.id && s.isActive)
      .reduce((total, schedule) => {
        const start = this.timeToMinutes(schedule.startTime);
        const end = this.timeToMinutes(schedule.endTime);
        return total + (end - start) / 60;
      }, 0);
  });

  activeDaysCount = computed(() => {
    const staff = this.selectedStaff();
    if (!staff) return 0;
    
    return this.schedules().filter(s => 
      s.staffId === staff.id && s.isActive
    ).length;
  });

  ngOnInit(): void {
    // Obtener ID del staff desde la ruta
    const staffId = this.route.snapshot.paramMap.get('id');
    
    if (staffId) {
      this.loadStaffData(staffId);
    }
  }

  loadStaffData(staffId: string): void {
    const staff = this.staffService.getStaffById(staffId);
    
    if (staff) {
      this.selectedStaff.set(staff);
      const staffSchedules = this.staffService.getSchedulesByStaffId(staff.id);
      this.schedules.set(staffSchedules);
    } else {
      alert('Personal no encontrado');
      this.goBack();
    }
  }

  getScheduleForDay(day: DayOfWeek): WorkSchedule | undefined {
    const staff = this.selectedStaff();
    if (!staff) return undefined;
    
    return this.schedules().find(s => 
      s.staffId === staff.id && 
      s.dayOfWeek === day
    );
  }

  toggleDay(day: DayOfWeek): void {
    const staff = this.selectedStaff();
    if (!staff) return;
    
    const schedule = this.getScheduleForDay(day);
    
    if (schedule) {
      this.schedules.update(current =>
        current.map(s =>
          s.id === schedule.id ? { ...s, isActive: !s.isActive } : s
        )
      );
    } else {
      const newSchedule: WorkSchedule = {
        id: Date.now().toString(),
        staffId: staff.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true
      };
      this.schedules.update(current => [...current, newSchedule]);
    }
  }

  updateTime(day: DayOfWeek, field: 'startTime' | 'endTime', value: string): void {
    const schedule = this.getScheduleForDay(day);
    if (!schedule) return;
    
    this.schedules.update(current =>
      current.map(s =>
        s.id === schedule.id ? { ...s, [field]: value } : s
      )
    );
  }

  toggleEditMode(): void {
    this.isEditing.update(v => !v);
  }

  saveSchedules(): void {
    const staff = this.selectedStaff();
    if (!staff) return;

    const staffSchedules = this.schedules().filter(s => s.staffId === staff.id);
    this.staffService.updateSchedules(staffSchedules);
    
    this.isEditing.set(false);
    alert('✅ Horarios personalizados guardados exitosamente');
  }

  goBack(): void {
    this.router.navigate(['/management/staff-schedule']);
  }

  getDuration(schedule: WorkSchedule | undefined): string {
    if (!schedule) return '--';
    
    const start = this.timeToMinutes(schedule.startTime);
    const end = this.timeToMinutes(schedule.endTime);
    const hours = (end - start) / 60;
    return `${hours}h`;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}