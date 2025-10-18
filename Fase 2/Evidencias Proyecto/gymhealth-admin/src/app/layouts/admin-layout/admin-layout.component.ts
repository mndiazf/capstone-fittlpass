// src/app/layouts/admin-layout/admin-layout.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme'
  }
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  currentTheme: string = 'dark';
  private themeObserver?: MutationObserver;

  ngOnInit() {
    // Obtener tema inicial del documento
    this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    // Observar cambios en el tema del documento
    this.observeThemeChanges();
  }

  ngOnDestroy() {
    // Limpiar el observer
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  private observeThemeChanges() {
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
}