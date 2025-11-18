// src/app/shared/components/sidebar/sidebar.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SidebarService } from '../../../core/services/sidebar.service';
// 👇 IMPORTA EL NUEVO SERVICIO DE AUTH ADMIN
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
  // 👇 Usa el nuevo servicio Auth (admin)
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
    // depende de cómo llamaste a los getters en el servicio
    // aquí asumo: auth.adminEmail
    return this.auth.adminEmail ?? '';
  }

  get userName(): string {
    // asumo que el servicio expone un nombre legible
    // p.ej. "Admin Santiago Centro"
    return this.auth.adminName ?? 'Administrador';
  }

  get userInitials(): string {
    // iniciales calculadas en el servicio, ej: "AC"
    return this.auth.adminInitials ?? 'AD';
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

  // ============================================
  // MÉTODOS PARA EL MENÚ DE USUARIO
  // ============================================

  toggleUserMenu(): void {
    this.sidebarService.toggleExpand('user-menu');
  }

  onSettingsClick(): void {
    this.router.navigate(['/settings']);
  }

  onLogout(): void {
    // 1) Limpiar sesión (token + payload)
    this.auth.logout();

    // 2) (Opcional) limpiar estado del sidebar
    this.sidebarService.setActiveItem(''); // si tienes método, o lo dejas así

    // 3) Redirigir al login
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
