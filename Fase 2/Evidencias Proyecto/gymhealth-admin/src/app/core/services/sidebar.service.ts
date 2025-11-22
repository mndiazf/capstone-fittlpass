// src/app/core/services/sidebar.service.ts

import { Injectable, signal } from '@angular/core';
import { MenuItem } from '../models/menu-item.interface';
import { Auth } from '../services/auth/auth';

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

  // 🔹 Menú completo (catálogo)
  private readonly allMenuItems: MenuItem[] = [
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
          id: 'management-branch-schedule',
          icon: 'schedule',
          label: 'Horarios de Sucursal',
          route: '/management/branch-schedule'
        }
      ]
    }
  ];

  // 🔹 Menú que realmente ve el usuario (filtrado)
  mainMenuItems: MenuItem[] = [];

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

  constructor(private auth: Auth) {
    // Inicial: construir menú según permisos del JWT (si hay payload en storage)
    this.refreshMenuFromPermissions();
  }

  // =========================
  // BUILD / REFRESH MENÚ
  // =========================
  refreshMenuFromPermissions(): void {
    const codes = this.auth.permissionCodes; // ['dashboard', 'members', 'enrollment', ...]
    const allowed = new Set<string>(codes);

    this.mainMenuItems = this.allMenuItems
      .map((item) => {
        const children = item.children ?? [];

        // Filtrar hijos por permiso (id === code)
        const allowedChildren = children.filter((c) =>
          allowed.has(c.id)
        );

        const hasOwnPermission = allowed.has(item.id);
        const showItem = hasOwnPermission || allowedChildren.length > 0;

        if (!showItem) {
          return null;
        }

        return {
          ...item,
          children: allowedChildren.length > 0 ? allowedChildren : undefined
        } as MenuItem;
      })
      .filter((item): item is MenuItem => item !== null);
  }

  // 🔸 Puedes llamar a esto manualmente tras login si quieres refrescar sin recargar la app
  forceReloadMenu(): void {
    this.refreshMenuFromPermissions();
  }

  // =========================
  // CONTROL VISUAL
  // =========================

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
