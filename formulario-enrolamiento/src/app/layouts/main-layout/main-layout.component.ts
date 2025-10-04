import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavComponent } from '../../shared/nav/nav.component';
import { FooterComponent } from '../../shared/footer/footer.component';

type NavItem = {
  label?: string;
  link: string;
  exact?: boolean;
  icon?: 'user' | 'gear' | 'report';
  aria?: string;
};

@Component({
  standalone: true,
  selector: 'app-main-layout',
  imports: [RouterModule, NavComponent, FooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  menu = [
    { label: 'Inicio', link: '/', exact: true },
    { label: 'Servicios', link: '/#servicios' },
    { label: 'Membresías', link: '/#membresias' },
    { label: 'Clases', link: '/#clases' },
  ];

  actions: NavItem[] = [
    { label: 'Login', link: '/login', icon: 'user', aria: 'Iniciar sesión' },
  ];
}