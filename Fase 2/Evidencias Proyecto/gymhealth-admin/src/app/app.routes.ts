import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },

  // Rutas públicas
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component')
          .then(m => m.LoginComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component')
          .then(m => m.ForgotPasswordComponent)
      }
    ]
  },

  // Rutas protegidas (todas requieren solo login)
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'enrollment',
        loadComponent: () => import('./features/members/enrollment/enrollment.component')
          .then(m => m.EnrollmentComponent)
      },
       {
        path: 'members/search',
        loadComponent: () => import('./features/members/member-search/member-search.component')
          .then(m => m.MemberSearchComponent),
        title: 'Búsqueda de Miembros - GymHealth'
      },
      {
        path: 'members/block',
        loadComponent: () => import('./features/members/member-block/member-block.component')
          .then(m => m.MemberBlockComponent),
        title: 'Registro de Infracciones - GymHealth'
      },
      
      // Venta Presencial
      {
        path: 'sales/presential',
        loadComponent: () => import('./features/salesandpayment/presential-sale/presential-sale.component')
          .then(m => m.PresentialSaleComponent)
      },
      
       {
        path: 'reports/access',
        loadComponent: () => import('./features/reports/access-report/access-report.component')
          .then(m => m.AccessReportComponent),
        title: 'Reporte de Accesos - GymHealth'
      },

      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component')
          .then(m => m.NotificationsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent)
      },
      // Management - Rutas existentes
      {
        path: 'management/users',
        loadComponent: () => import('./features/management/users/user-management.component')
          .then(m => m.UserManagementComponent)
      },
      {
        path: 'management/profiles',
        loadComponent: () => import('./features/management/profile/profile-management.component')
          .then(m => m.ProfileManagementComponent)
      },
      
      // 👇 GESTIÓN DE TURNOS
      {
        path: 'management/staff-schedule',
        loadComponent: () => import('./features/management/staff-schedule/staff-schedule.component')
          .then(m => m.StaffScheduleComponent),
        title: 'Gestión de Turnos - GymHealth'
      },
      {
        path: 'management/staff-schedule/detail/:id',
        loadComponent: () => import('./features/management/staff-schedule-detail/staff-schedule-detail.component')
          //                      
          .then(m => m.StaffScheduleDetailComponent),
        title: 'Configuración Avanzada - GymHealth'
      },
       {
        path: 'management/branch-schedule',
        loadComponent: () => import('./features/management/branch-schedule/branch-schedule.component')
          .then(m => m.BranchScheduleComponent),
        title: 'Horarios de Sucursal - GymHealth'
      }
    ]
  },
  
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];