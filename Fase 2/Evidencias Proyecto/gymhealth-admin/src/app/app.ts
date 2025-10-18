// src/app/app.component.ts

import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionWarningModalComponent } from './shared/components/modals/session-warning-modal.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SessionWarningModalComponent
  ],
  template: `
    <router-outlet></router-outlet>
    <app-session-warning-modal></app-session-warning-modal>
  `,
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private themeService = inject(ThemeService);
  title = 'gymhealth-admin';

  ngOnInit(): void {
    // El ThemeService ya se inicializa en su constructor
    // y carga el tema guardado del localStorage automáticamente
    console.log('Tema inicial cargado:', this.themeService.theme());
  }
}