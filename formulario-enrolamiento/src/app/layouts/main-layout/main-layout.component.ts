import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavComponent, NavItem } from '../../shared/nav/nav.component';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({  
  standalone: true,
  selector: 'app-main-layout',
  imports: [RouterModule, NavComponent, FooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
menu = [
  { label: 'Inicio',   link: '/', exact: true },
  { label: 'Reportes', link: '/reports' },   // ← aquí, al lado de Inicio
  { label: 'Enrolar',  link: '/enroll' },
  { label: 'Socios',   link: '/members' },
  { label: 'Accesos',  link: '/access' },
];

actions: NavItem[] = [
  { label: 'Login', link: '/login', icon: 'user', aria: 'Iniciar sesión' },
  { link: '/settings', icon: 'gear', aria: 'Configuración' },

];
}
