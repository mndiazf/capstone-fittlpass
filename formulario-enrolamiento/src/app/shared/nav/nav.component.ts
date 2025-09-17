import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export type IconName = 'user' | 'gear' | 'report';

export interface NavItem {
  label?: string;
  link: string;
  exact?: boolean;
  icon?: IconName;
  aria?: string;
}

@Component({
  standalone: true,
  selector: 'app-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent {
  @Input() brand = 'FitPass';
  @Input() items: NavItem[] | null = null;
  @Input() actions: NavItem[] | null = null;

  // Desktop
  readonly defaultItems: NavItem[] = [
    { label: 'Inicio',   link: '/', exact: true },
    { label: 'Reportes', link: '/reports' },
    { label: 'Enrolar',  link: '/enroll' },
    { label: 'Socios',   link: '/members' },
    { label: 'Accesos',  link: '/access' },
  ];
  readonly defaultActions: NavItem[] = [
    { label: 'Login', link: '/login', icon: 'user',  aria: 'Iniciar sesión' },
    { link: '/settings', icon: 'gear', aria: 'Configuración' },
    { label: 'Reportes', link: '/reports', icon: 'report', aria: 'Reportería' },
  ];

  // Estado del drawer móvil
  open = signal(false);
  toggle(){ this.open.update(v => !v); }

  get itemsToShow(){   return (this.items?.length ? this.items : this.defaultItems); }
  get actionsToShow(){ return (this.actions?.length ? this.actions : this.defaultActions); }
}
