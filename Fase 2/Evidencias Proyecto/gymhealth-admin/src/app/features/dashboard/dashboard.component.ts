// src/app/features/dashboard/dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme'
  }
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';

  stats = [
    {
      icon: 'group',
      value: '127',
      label: 'Miembros Activos',
      badge: '+12%',
      color: 'purple'
    },
    {
      icon: 'calendar_today',
      value: '24',
      label: 'Clases Programadas',
      badge: 'Hoy',
      color: 'cyan'
    },
    {
      icon: 'credit_card',
      value: '$45,780',
      label: 'Ingresos Totales',
      badge: 'Mes',
      color: 'orange'
    }
  ];

  ngOnInit() {
    // Sincronizar con el tema del documento
    this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    // Escuchar cambios en el tema
    this.observeThemeChanges();
  }

  ngOnDestroy() {
    // Limpiar el observer si es necesario
  }

  private observeThemeChanges() {
    // Observar cambios en el atributo data-theme del documento
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
}