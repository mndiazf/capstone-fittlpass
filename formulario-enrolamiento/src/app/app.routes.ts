import { Routes } from '@angular/router';

export const routes: Routes = [
     {
        path: '',
        loadComponent: () =>
          import('./features/home/home.component')
            .then(m => m.HomeComponent)
      },

      // ===== Perfil con subrutas =====
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component')
            .then(m => m.ProfileComponent),
        children: [
          { path: '', redirectTo: 'datos', pathMatch: 'full' },
          {
            path: 'datos',
            loadComponent: () =>
              import('./features/profile/datos/datos.component')
                .then(m => m.DatosComponent)
          },
          // TODO: Descomentar cuando AccountComponent exista
          // {
          //   path: 'account',
          //   loadComponent: () =>
          //     import('./features/profile/account.component')
          //       .then(m => m.AccountComponent)
          // },
          // TODO: Descomentar cuando EnrollComponent exista
          // {
          //   path: 'enrollment',
          //   loadComponent: () =>
          //     import('./features/enrollment/enroll.component')
          //       .then(m => m.EnrollComponent)
          // }
        ]
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/auth/checkout/checkout.component')
            .then(m => m.CheckoutComponent)
      },
      // Otras rutas / placeholders
      {
        path: 'members',
        loadComponent: () =>
          import('./shared/placeholder').then(m => m.PlaceholderComponent)
      },
      {
        path: 'access',
        loadComponent: () =>
          import('./shared/placeholder').then(m => m.PlaceholderComponent)
      },

      // Auth (si usas pantallas dedicadas)
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component')
            .then(m => m.LoginComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgotpassword/forgot-password.component')
            .then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },

      // Catch-all
      { path: '**', redirectTo: '' }
];