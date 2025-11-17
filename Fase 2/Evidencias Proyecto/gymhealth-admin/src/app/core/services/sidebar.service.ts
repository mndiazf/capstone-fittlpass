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
        },
        {
          id: 'member-search',
          icon: 'person_search',
          label: 'Buscar Miembro',
          route: '/members/search'
        },
        {
          id: 'member-block',
          icon: 'gavel',
          label: 'Infracciones',
          route: '/members/block'
        }
      ]
    },
    { 
      id: 'salesandpayment', 
      icon: 'point_of_sale', 
      label: 'Ventas y Pagos',
      children: [
        {
          id: 'presential-sale',
          icon: 'store',
          label: 'Venta Presencial',
          route: '/sales/presential'
        }
      ]
    },

    { 
      id: 'reports', 
      icon: 'assessment', 
      label: 'Reportes',
      children: [
        {
          id: 'access-report',
          icon: 'login',
          label: 'Reporte de Accesos',
          route: '/reports/access'
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
        },
        {
          id: 'management-staff-schedule',
          icon: 'event_note',
          label: 'Mantenedor de horarios',
          route: '/management/staff-schedule'
        },
        {
          id: 'management-branch-schedule',
          icon: 'schedule',
          label: 'Horarios de Sucursal',
          route: '/management/branch-schedule'
        }
      ]
    }
  ];

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