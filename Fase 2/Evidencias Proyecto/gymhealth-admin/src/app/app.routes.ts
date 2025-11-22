// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { PermissionGuard } from './core/guards/permission-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },

  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
    ],
  },

  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [PermissionGuard],
        data: { permission: 'dashboard' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'enrollment',
        canActivate: [PermissionGuard],
        data: { permission: 'enrollment' },
        loadComponent: () =>
          import(
            './features/members/enrollment/enrollment.component'
          ).then((m) => m.EnrollmentComponent),
      },
      {
        path: 'members/search',
        canActivate: [PermissionGuard],
        data: { permission: 'member-search' },
        loadComponent: () =>
          import(
            './features/members/member-search/member-search.component'
          ).then((m) => m.MemberSearchComponent),
        title: 'Búsqueda de Miembros - GymHealth',
      },
      {
        path: 'members/block',
        canActivate: [PermissionGuard],
        data: { permission: 'members' },
        loadComponent: () =>
          import(
            './features/members/member-block/member-block.component'
          ).then((m) => m.MemberBlockComponent),
        title: 'Registro de Infracciones - GymHealth',
      },
      {
        path: 'sales/presential',
        canActivate: [PermissionGuard],
        data: { permission: 'presential-sale' },
        loadComponent: () =>
          import(
            './features/salesandpayment/presential-sale/presential-sale.component'
          ).then((m) => m.PresentialSaleComponent),
      },
      {
        path: 'reports/access',
        canActivate: [PermissionGuard],
        data: { permission: 'access-report' },
        loadComponent: () =>
          import(
            './features/reports/access-report/access-report.component'
          ).then((m) => m.AccessReportComponent),
        title: 'Reporte de Accesos - GymHealth',
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'management/users',
        canActivate: [PermissionGuard],
        data: { permission: 'management-users' },
        loadComponent: () =>
          import(
            './features/management/users/user-management.component'
          ).then((m) => m.UserManagementComponent),
      },
      {
        path: 'management/profiles',
        canActivate: [PermissionGuard],
        data: { permission: 'management-profiles' },
        loadComponent: () =>
          import(
            './features/management/profile/profile-management.component'
          ).then((m) => m.ProfileManagementComponent),
      },
      {
        path: 'management/staff-schedule',
        canActivate: [PermissionGuard],
        data: { permission: 'management-staff-schedule' },
        loadComponent: () =>
          import(
            './features/management/staff-schedule/staff-schedule.component'
          ).then((m) => m.StaffScheduleComponent),
        title: 'Gestión de Turnos - GymHealth',
      },
      {
        path: 'management/staff-schedule/detail/:id',
        canActivate: [PermissionGuard],
        data: { permission: 'management-staff-schedule' },
        loadComponent: () =>
          import(
            './features/management/staff-schedule-detail/staff-schedule-detail.component'
          ).then((m) => m.StaffScheduleDetailComponent),
        title: 'Configuración Avanzada - GymHealth',
      },
      {
        path: 'management/branch-schedule',
        canActivate: [PermissionGuard],
        data: { permission: 'management-branch-schedule' },
        loadComponent: () =>
          import(
            './features/management/branch-schedule/branch-schedule.component'
          ).then((m) => m.BranchScheduleComponent),
        title: 'Horarios de Sucursal - GymHealth',
      },
    ],
  },

  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
