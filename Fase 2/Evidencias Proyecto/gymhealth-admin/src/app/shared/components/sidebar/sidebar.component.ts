// src/app/shared/components/sidebar/sidebar.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SidebarService } from '../../../core/services/sidebar.service';
import { MenuItem } from '../../../core/models/menu-item.interface';
import { Auth } from '../../../core/services/auth/auth';

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
  private auth = inject(Auth);

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

  // ==============================
  // DATOS DEL USUARIO (desde JWT)
  // ==============================
  get userEmail(): string {
    return this.auth.adminEmail ?? '';
  }

  get userName(): string {
    return this.auth.adminName ?? 'Administrador';
  }

  get userInitials(): string {
    return this.auth.adminInitials ?? 'AD';
  }

  // 👉 Nuevo: nombre del rol ("Administrador de Sucursal", "Recepcionista", etc.)
  get userRoleName(): string {
    return this.auth.adminRoleName ?? '';
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  onMenuItemClick(item: MenuItem): void {
    if (item.children && item.children.length > 0) {
      this.sidebarService.toggleExpand(item.id);
    } else {
      this.sidebarService.setActiveItem(item.id);

      if (item.route) {
        this.router.navigate([item.route]);
      }
    }
  }

  toggleUserMenu(): void {
    this.sidebarService.toggleExpand('user-menu');
  }

  onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  onLogout(): void {
    this.auth.logout();
    this.sidebarService.setActiveItem('');
    this.router.navigate(['/auth/login']);
    console.log('Sesión cerrada por el usuario (admin), redirigiendo a login');
  }

  isActiveItem(itemId: string): boolean {
    return this.activeItem === itemId;
  }

  isExpanded(itemId: string): boolean {
    return this.sidebarService.isExpanded(itemId);
  }
}
