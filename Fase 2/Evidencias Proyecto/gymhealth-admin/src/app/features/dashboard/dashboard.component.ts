// src/app/features/dashboard/dashboard.component.ts

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

interface DashboardStat {
  icon: string;
  value: string;
  label: string;
  badge: string;
  color: 'purple' | 'cyan' | 'orange' | 'green';
}

interface ActivityItem {
  icon: string;
  title: string;
  time: string;
  type: 'member' | 'payment' | 'class' | 'access';
}

interface BranchOccupancy {
  current: number;
  capacity: number;
  percentage: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme'
  }
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';
  
  // Ocupación de la sucursal
  branchOccupancy = signal<BranchOccupancy>({
    current: 42,
    capacity: 80,
    percentage: 52.5
  });

  // Estadísticas generales - visibles para todos
  stats: DashboardStat[] = [
    {
      icon: 'people',
      value: '42',
      label: 'Personas en Sucursal',
      badge: 'Ahora',
      color: 'purple'
    },
    {
      icon: 'fitness_center',
      value: '8',
      label: 'Clases Hoy',
      badge: '3 activas',
      color: 'cyan'
    },
    {
      icon: 'login',
      value: '127',
      label: 'Accesos Hoy',
      badge: '+15%',
      color: 'green'
    }
  ];

  // Actividades recientes
  activities: ActivityItem[] = [
    {
      icon: 'login',
      title: 'Juan Pérez ingresó al gimnasio',
      time: 'Hace 2 minutos',
      type: 'access'
    },
    {
      icon: 'person_add',
      title: 'Nueva inscripción: María González',
      time: 'Hace 15 minutos',
      type: 'member'
    },
    {
      icon: 'fitness_center',
      title: 'Clase de Spinning iniciada - Sala 2',
      time: 'Hace 30 minutos',
      type: 'class'
    },
    {
      icon: 'check_circle',
      title: 'Clase de Yoga completada',
      time: 'Hace 2 horas',
      type: 'class'
    }
  ];

  ngOnInit() {
    this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    this.observeThemeChanges();
    
    // TODO: Cargar datos reales desde el backend
    // this.loadDashboardData();
  }

  ngOnDestroy() {
    // Limpiar subscripciones si es necesario
  }

  private observeThemeChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  getOccupancyColor(): string {
    const percentage = this.branchOccupancy().percentage;
    if (percentage >= 80) return 'orange';
    if (percentage >= 60) return 'cyan';
    return 'green';
  }

  getOccupancyStatus(): string {
    const percentage = this.branchOccupancy().percentage;
    if (percentage >= 90) return 'Capacidad máxima';
    if (percentage >= 80) return 'Alta ocupación';
    if (percentage >= 60) return 'Ocupación media';
    if (percentage >= 30) return 'Ocupación baja';
    return 'Muy pocas personas';
  }
}