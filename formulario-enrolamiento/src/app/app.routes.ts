import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component')
        .then(m => m.MainLayoutComponent),
    children: [
      // 👉 Página de inicio
      {
        path: '',
        loadComponent: () =>
          import('./features/home/home.component')
            .then(m => m.HomeComponent)
      },

      // 👉 Enrolar socio
      {
        path: 'enroll',
        loadComponent: () =>
          import('./features/enrollment/enroll.component')
            .then(m => m.EnrollComponent)
      },

      // 👉 Rutas pendientes (placeholders)
      {
        path: 'members',
        loadComponent: () =>
          import('./shared/placeholder')
            .then(m => m.PlaceholderComponent)
      },
      {
        path: 'access',
        loadComponent: () =>
          import('./shared/placeholder')
            .then(m => m.PlaceholderComponent)
      },

      // 👉 Redirección por defecto
      { path: '**', redirectTo: '' }
    ]
  }
];
