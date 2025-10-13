// src/app/features/notifications/notifications.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../core/services/theme.service';

export interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme'
  }
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private themeObserver?: MutationObserver;
  
  currentTheme: string = 'dark';

  notifications: Notification[] = [
    {
      id: 1,
      type: 'success',
      title: 'Nuevo miembro registrado',
      message: 'Juan Pérez se ha registrado exitosamente en el gimnasio.',
      time: 'Hace 5 minutos',
      read: false,
      icon: 'person_add'
    },
    {
      id: 2,
      type: 'info',
      title: 'Pago recibido',
      message: 'Se ha procesado el pago de membresía de María González por $80.',
      time: 'Hace 15 minutos',
      read: false,
      icon: 'payment'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Membresía próxima a vencer',
      message: 'La membresía de Carlos Rodríguez vence en 3 días.',
      time: 'Hace 1 hora',
      read: false,
      icon: 'warning'
    },
    {
      id: 4,
      type: 'success',
      title: 'Clase completada',
      message: 'La clase de Yoga de las 10:00 AM ha finalizado exitosamente.',
      time: 'Hace 2 horas',
      read: true,
      icon: 'check_circle'
    },
    {
      id: 5,
      type: 'info',
      title: 'Nueva clase programada',
      message: 'Se ha programado una nueva clase de Spinning para mañana a las 6:00 PM.',
      time: 'Hace 3 horas',
      read: true,
      icon: 'event'
    },
    {
      id: 6,
      type: 'error',
      title: 'Error en el sistema de pagos',
      message: 'Se detectó un problema al procesar algunos pagos. Revisar inmediatamente.',
      time: 'Hace 4 horas',
      read: true,
      icon: 'error'
    }
  ];

  ngOnInit(): void {
    // Obtener tema inicial del ThemeService
    this.currentTheme = this.themeService.isDarkMode() ? 'dark' : 'light';
    
    // Observar cambios en el tema del documento
    this.observeThemeChanges();
  }

  ngOnDestroy(): void {
    // Limpiar el observer
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  private observeThemeChanges(): void {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id: number): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = !notification.read;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  deleteNotification(id: number): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
    }
  }
}