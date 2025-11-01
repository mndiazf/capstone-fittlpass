// src/app/core/services/sidebar.service.ts

import { Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/menu-item.interface';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isOpenSignal = signal(true);
  private activeItemSignal = signal('dashboard');
  private expandedItemsSignal = signal<string[]>([]);

  isOpen = this.isOpenSignal.asReadonly();
  activeItem = this.activeItemSignal.asReadonly();
  expandedItems = this.expandedItemsSignal.asReadonly();

  mainMenuItems: MenuItem[] = [
    { 
      id: 'dashboard', 
      icon: 'home', 
      label: 'Dashboard', 
      route: '/dashboard' 
    },
    { 
      id: 'members', 
      icon: 'group', 
      label: 'Miembros',
      children: [
        {
          id: 'enrollment',
          icon: 'face',
          label: 'Enrolamiento',
          route: '/enrollment'
        }
      ]
    },
    
   { 
      id: 'management', 
      icon: 'settings', 
      label: 'Mantenedor',
      children: [
        {
          id: 'management-users',
          icon: 'person',
          label: 'Mantenedor de Usuarios',
          route: '/management/users'
        },
        {
          id: 'management-profiles',
          icon: 'admin_panel_settings',
          label: 'Mantenedor de Perfiles',
          route: '/management/profiles'
        }
      ]
    }
  ];
  

  // ← SOLO NOTIFICACIONES - Configuración ahora está en el perfil de usuario
  bottomMenuItems: MenuItem[] = [
    { 
      id: 'notifications', 
      icon: 'notifications', 
      label: 'Notificaciones', 
      route: '/notifications', 
      badge: '3', 
      badgeColor: 'warn' 
    }
  ];

  toggle(): void {
    this.isOpenSignal.update(value => !value);
  }

  setActiveItem(itemId: string): void {
    this.activeItemSignal.set(itemId);
  }

  open(): void {
    this.isOpenSignal.set(true);
  }

  close(): void {
    this.isOpenSignal.set(false);
  }

  toggleExpand(itemId: string): void {
    const currentExpanded = this.expandedItemsSignal();
    if (currentExpanded.includes(itemId)) {
      this.expandedItemsSignal.set(currentExpanded.filter(id => id !== itemId));
    } else {
      this.expandedItemsSignal.set([...currentExpanded, itemId]);
    }
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItemsSignal().includes(itemId);
  }
}