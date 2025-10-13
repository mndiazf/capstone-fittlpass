// src/app/core/models/menu-item.interface.ts

export interface MenuItem {
  id: string;
  icon: string;
  label: string;
  route?: string;
  badge?: string | number;
  badgeColor?: 'primary' | 'accent' | 'warn';
  children?: MenuItem[];
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
}