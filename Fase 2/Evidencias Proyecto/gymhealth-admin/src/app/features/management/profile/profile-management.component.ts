// src/app/features/management/profile-management/profile-management.component.ts

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: string;
  isParent?: boolean;
  parentId?: string;
}

interface Profile {
  id: string;
  name: string;
  color: string;
  permissions: string[];
}

@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './profile-management.component.html',
  styleUrls: ['./profile-management.component.scss']
})
export class ProfileManagementComponent {
  profileForm: FormGroup;
  profiles = signal<Profile[]>([]);
  selectedPermissions = signal<string[]>([]);
  editingProfile: Profile | null = null;
  displayedColumns = ['name', 'permissions', 'actions'];

  // 🔒 Permisos obligatorios (no se pueden desmarcar)
  readonly REQUIRED_PERMISSIONS = ['dashboard', 'notifications'];

  // 🎯 Permisos basados en el sidebar real
  availablePermissions = signal<Permission[]>([
    // Dashboard (OBLIGATORIO)
    { 
      id: 'dashboard', 
      name: 'Dashboard ⭐', 
      description: 'Acceso al panel principal (OBLIGATORIO para todos)',
      icon: 'home',
      isParent: false
    },
    
    // Miembros (Menú Padre)
    { 
      id: 'members', 
      name: '👥 Miembros', 
      description: 'Acceso completo al módulo de gestión de miembros',
      icon: 'group',
      isParent: true
    },
    { 
      id: 'enrollment', 
      name: 'Enrolamiento', 
      description: 'Registrar rostros para acceso facial',
      icon: 'face',
      isParent: false,
      parentId: 'members'
    },
    { 
      id: 'member-search', 
      name: 'Buscar Miembro', 
      description: 'Buscar y consultar información de miembros',
      icon: 'person_search',
      isParent: false,
      parentId: 'members'
    },
    { 
      id: 'member-block', 
      name: 'Infracciones', 
      description: 'Gestionar bloqueos e infracciones de miembros',
      icon: 'gavel',
      isParent: false,
      parentId: 'members'
    },
    
    // Ventas y Pagos (Menú Padre)
    { 
      id: 'salesandpayment', 
      name: '💰 Ventas y Pagos', 
      description: 'Acceso completo al módulo de ventas y pagos',
      icon: 'point_of_sale',
      isParent: true
    },
    { 
      id: 'presential-sale', 
      name: 'Venta Presencial', 
      description: 'Realizar ventas presenciales en el gimnasio',
      icon: 'store',
      isParent: false,
      parentId: 'salesandpayment'
    },
    
    // Reportes (Menú Padre)
    { 
      id: 'reports', 
      name: '📊 Reportes', 
      description: 'Acceso completo al módulo de reportes',
      icon: 'assessment',
      isParent: true
    },
    { 
      id: 'access-report', 
      name: 'Reporte de Accesos', 
      description: 'Ver y exportar registros de acceso al gimnasio',
      icon: 'login',
      isParent: false,
      parentId: 'reports'
    },
    
    // Mantenedor (Menú Padre)
    { 
      id: 'management', 
      name: '⚙️ Mantenedor', 
      description: 'Acceso completo al módulo de mantenedores',
      icon: 'settings',
      isParent: true
    },
    { 
      id: 'management-users', 
      name: 'Mantenedor de Usuarios', 
      description: 'Crear, editar y eliminar usuarios del sistema',
      icon: 'person',
      isParent: false,
      parentId: 'management'
    },
    { 
      id: 'management-profiles', 
      name: 'Mantenedor de Perfiles', 
      description: 'Gestionar perfiles y permisos',
      icon: 'admin_panel_settings',
      isParent: false,
      parentId: 'management'
    },
    { 
      id: 'management-staff-schedule', 
      name: 'Mantenedor de Horarios', 
      description: 'Gestionar horarios del personal',
      icon: 'event_note',
      isParent: false,
      parentId: 'management'
    },
    { 
      id: 'management-branch-schedule', 
      name: 'Horarios de Sucursal', 
      description: 'Configurar horarios de apertura de sucursales',
      icon: 'schedule',
      isParent: false,
      parentId: 'management'
    },
    
    // Notificaciones (OBLIGATORIO)
    { 
      id: 'notifications', 
      name: 'Notificaciones ⭐', 
      description: 'Ver y gestionar notificaciones (OBLIGATORIO para todos)',
      icon: 'notifications',
      isParent: false
    }
  ]);

  constructor(private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]]
    });
    this.loadProfiles();
    
    // 🔒 Inicializar con permisos obligatorios
    this.selectedPermissions.set([...this.REQUIRED_PERMISSIONS]);
  }

  loadProfiles() {
    const stored = localStorage.getItem('gymhealth_profiles');
    if (stored) {
      this.profiles.set(JSON.parse(stored));
      return;
    }
    
    const defaultProfiles: Profile[] = [
      { 
        id: '1', 
        name: 'Super Administrador', 
        color: 'purple',
        permissions: this.availablePermissions().map(p => p.id) // Todos los permisos
      },
      { 
        id: '2', 
        name: 'Recepcionista', 
        color: 'cyan',
        permissions: [
          'dashboard',
          'members',
          'enrollment',
          'member-search',
          'salesandpayment',
          'presential-sale',
          'notifications'
        ]
      },
      { 
        id: '3', 
        name: 'Gerente de Sucursal', 
        color: 'orange',
        permissions: [
          'dashboard',
          'members',
          'enrollment',
          'member-search',
          'member-block',
          'salesandpayment',
          'presential-sale',
          'reports',
          'access-report',
          'management-branch-schedule',
          'notifications'
        ]
      }
    ];
    
    this.profiles.set(defaultProfiles);
    localStorage.setItem('gymhealth_profiles', JSON.stringify(defaultProfiles));
  }

  /**
   * 🔄 Al seleccionar un permiso padre, auto-selecciona todos sus hijos
   * Al des-seleccionar un hijo, verifica si des-seleccionar el padre
   * 🔒 Los permisos obligatorios no se pueden desmarcar
   */
  togglePermission(permId: string, checked: boolean) {
    // 🔒 Prevenir desmarcar permisos obligatorios
    if (this.REQUIRED_PERMISSIONS.includes(permId) && !checked) {
      // No hacer nada, mantener el permiso marcado
      return;
    }

    const permission = this.availablePermissions().find(p => p.id === permId);
    
    if (checked) {
      // Agregar el permiso seleccionado
      const updated = [...this.selectedPermissions(), permId];
      
      // Si es un padre, agregar todos sus hijos automáticamente
      if (permission?.isParent) {
        const children = this.availablePermissions()
          .filter(p => p.parentId === permId)
          .map(p => p.id);
        
        children.forEach(childId => {
          if (!updated.includes(childId)) {
            updated.push(childId);
          }
        });
      }
      
      // Si es un hijo, agregar también el padre si no está
      if (permission?.parentId && !updated.includes(permission.parentId)) {
        updated.push(permission.parentId);
      }
      
      this.selectedPermissions.set(updated);
    } else {
      let updated = this.selectedPermissions().filter(id => id !== permId);
      
      // Si es un padre, remover todos sus hijos
      if (permission?.isParent) {
        const children = this.availablePermissions()
          .filter(p => p.parentId === permId)
          .map(p => p.id);
        
        updated = updated.filter(id => !children.includes(id));
      }
      
      // Si es un hijo, verificar si remover el padre
      if (permission?.parentId) {
        const siblings = this.availablePermissions()
          .filter(p => p.parentId === permission.parentId && p.id !== permId);
        
        const hasOtherChildrenSelected = siblings.some(sibling => 
          updated.includes(sibling.id)
        );
        
        // Si no hay otros hijos seleccionados, remover el padre
        if (!hasOtherChildrenSelected) {
          updated = updated.filter(id => id !== permission.parentId);
        }
      }
      
      // 🔒 Asegurar que los permisos obligatorios siempre estén
      this.REQUIRED_PERMISSIONS.forEach(reqId => {
        if (!updated.includes(reqId)) {
          updated.push(reqId);
        }
      });
      
      this.selectedPermissions.set(updated);
    }
  }

  isPermissionSelected(permId: string): boolean {
    return this.selectedPermissions().includes(permId);
  }

  /**
   * 🔒 Verificar si un permiso es obligatorio (no se puede desmarcar)
   */
  isPermissionRequired(permId: string): boolean {
    return this.REQUIRED_PERMISSIONS.includes(permId);
  }

  /**
   * 📋 Obtener permisos agrupados por categoría para mejor visualización
   */
  getGroupedPermissions(): { parent: Permission | null; children: Permission[] }[] {
    const groups: { parent: Permission | null; children: Permission[] }[] = [];
    
    // Permisos sin padre (independientes)
    const independentPerms = this.availablePermissions()
      .filter(p => !p.parentId && !p.isParent);
    
    if (independentPerms.length > 0) {
      groups.push({ parent: null, children: independentPerms });
    }
    
    // Permisos con estructura padre-hijo
    const parents = this.availablePermissions().filter(p => p.isParent);
    
    parents.forEach(parent => {
      const children = this.availablePermissions()
        .filter(p => p.parentId === parent.id);
      
      groups.push({ parent, children });
    });
    
    return groups;
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      alert('Por favor completa el formulario correctamente');
      return;
    }
    
    // Verificar que haya al menos un permiso además de los obligatorios
    const nonRequiredPerms = this.selectedPermissions()
      .filter(p => !this.REQUIRED_PERMISSIONS.includes(p));
    
    if (nonRequiredPerms.length === 0) {
      alert('Debes seleccionar al menos un permiso adicional además de Dashboard y Notificaciones');
      return;
    }

    const formData = this.profileForm.value;
    
    // 🔒 Asegurar que los permisos obligatorios estén incluidos
    const finalPermissions = [...new Set([
      ...this.REQUIRED_PERMISSIONS,
      ...this.selectedPermissions()
    ])];
    
    if (this.editingProfile) {
      const updated = this.profiles().map(p =>
        p.id === this.editingProfile!.id
          ? { ...p, ...formData, permissions: finalPermissions }
          : p
      );
      this.profiles.set(updated);
    } else {
      const newProfile: Profile = {
        id: Date.now().toString(),
        color: 'purple',
        ...formData,
        permissions: finalPermissions
      };
      this.profiles.set([...this.profiles(), newProfile]);
    }
    
    localStorage.setItem('gymhealth_profiles', JSON.stringify(this.profiles()));
    this.resetForm();
  }

  editProfile(profile: Profile) {
    this.editingProfile = profile;
    this.profileForm.patchValue(profile);
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    
    // 🔒 Asegurar que los permisos obligatorios estén siempre incluidos al editar
    const permissionsWithRequired = [...new Set([
      ...this.REQUIRED_PERMISSIONS,
      ...profile.permissions
    ])];
    
    this.selectedPermissions.set(permissionsWithRequired);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteProfile(profile: Profile) {
    if (!confirm(`¿Eliminar el perfil "${profile.name}"?`)) return;
    this.profiles.set(this.profiles().filter(p => p.id !== profile.id));
    localStorage.setItem('gymhealth_profiles', JSON.stringify(this.profiles()));
  }

  cancelEdit() {
    this.resetForm();
  }

  resetForm() {
    this.editingProfile = null;
    this.profileForm.reset();
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.setErrors(null);
    });
    
    // 🔒 Resetear a solo los permisos obligatorios
    this.selectedPermissions.set([...this.REQUIRED_PERMISSIONS]);
  }

  getPermissionName(id: string): string {
    const perm = this.availablePermissions().find(p => p.id === id);
    return perm?.name || id;
  }

  getPermissionDescription(id: string): string {
    const perm = this.availablePermissions().find(p => p.id === id);
    return perm?.description || '';
  }

  getColor(color: string): string {
    const map: Record<string, string> = {
      purple: '#9747FF',
      cyan: '#00D2C6',
      orange: '#F97316',
      blue: '#3b82f6',
      green: '#22c55e',
      pink: '#ec4899'
    };
    return map[color] ?? '#9747FF';
  }
}