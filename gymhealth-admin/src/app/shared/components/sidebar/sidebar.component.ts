// src/app/shared/components/sidebar/sidebar.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SidebarService } from '../../../core/services/sidebar.service';
import { AuthService } from '../../../core/services/auth.service'; // ← NUEVO
import { MenuItem } from '../../../core/models/menu-item.interface';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  sidebarService = inject(SidebarService);
  private router = inject(Router);
  private authService = inject(AuthService); // ← NUEVO: Inyectar AuthService

  get isOpen() {
    return this.sidebarService.isOpen();
  }

  get activeItem() {
    return this.sidebarService.activeItem();
  }

  get mainMenuItems() {
    return this.sidebarService.mainMenuItems;
  }

  get bottomMenuItems() {
    return this.sidebarService.bottomMenuItems;
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  onMenuItemClick(item: MenuItem): void {
    if (item.children && item.children.length > 0) {
      // Si tiene hijos, expandir/colapsar
      this.sidebarService.toggleExpand(item.id);
    } else {
      // Si no tiene hijos, navegar
      this.sidebarService.setActiveItem(item.id);

      if (item.route) {
        this.router.navigate([item.route]);
      }
    }
  }

  // ============================================
  // MÉTODOS PARA EL MENÚ DE USUARIO
  // ============================================

  toggleUserMenu(): void {
    this.sidebarService.toggleExpand('user-menu');
  }

  onSettingsClick(): void {
    console.log('Navegar a configuración');
    this.router.navigate(['/settings']);
  }

  onLogout(): void {
    // Cerrar sesión usando el AuthService
    this.authService.logout('user_logout');
    console.log('Sesión cerrada por el usuario');
  }

  isActiveItem(itemId: string): boolean {
    return this.activeItem === itemId;
  }

  isExpanded(itemId: string): boolean {
    return this.sidebarService.isExpanded(itemId);
  }
}