// src/app/features/settings/settings.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    FormsModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  private themeService = inject(ThemeService);
  private snackBar = inject(MatSnackBar);
  
  isDarkMode: boolean = true;
  private pendingChanges: boolean = false;

  constructor() {
    // Inicializar con el tema actual
    this.isDarkMode = this.themeService.isDarkMode();
  }

  onThemeChange(): void {
    // Aplicar el tema inmediatamente al mover el toggle
    const newTheme = this.isDarkMode ? 'dark' : 'light';
    this.themeService.setTheme(newTheme);
    this.pendingChanges = true;
  }

  saveChanges(): void {
    this.snackBar.open('Configuración guardada correctamente', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
    });
    this.pendingChanges = false;
  }
}