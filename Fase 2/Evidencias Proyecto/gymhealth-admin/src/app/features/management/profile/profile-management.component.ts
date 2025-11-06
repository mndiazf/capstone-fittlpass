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

  availablePermissions = signal<Permission[]>([
    { id: 'dashboard',        name: 'Dashboard',           description: 'Ver página principal' },
    { id: 'members',          name: 'Miembros',            description: 'Gestión de miembros' },
    { id: 'enrollment',       name: 'Enrollment',          description: 'Control de acceso facial' },
    { id: 'classes',          name: 'Clases',              description: 'Gestión de clases' },
    { id: 'in_person_sale',   name: 'Venta Presencial',    description: 'Realizar ventas presenciales' },
    { id: 'reports',          name: 'Reportes',            description: 'Ver reportes y estadísticas' },
    { id: 'maintainer',       name: 'Mantenedor',          description: 'Acceso al módulo mantenedor' },
    { id: 'users',            name: 'Usuarios',            description: 'Mantenedor de usuarios' },
    { id: 'profiles',         name: 'Perfiles',            description: 'Mantenedor de perfiles' },
    { id: 'notifications',    name: 'Notificaciones',      description: 'Ver y gestionar notificaciones' },
    { id: 'settings',         name: 'Configuración',       description: 'Ajustes del sistema' }
  ]);

  constructor(private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      // si luego vuelves a usar color, agrega aquí el control
    });
    this.loadProfiles();
  }

  loadProfiles() {
    const stored = localStorage.getItem('gymhealth_profiles');
    if (stored) {
      this.profiles.set(JSON.parse(stored));
      return;
    }
    const defaultProfiles: Profile[] = [
      { id: '1', name: 'Administrador', color: 'purple',
        permissions: this.availablePermissions().map(p => p.id) },
      { id: '2', name: 'Recepcionista', color: 'green',
        permissions: ['dashboard','members','enrollment'] },
      { id: '3', name: 'Personal Trainer', color: 'orange',
        permissions: ['dashboard','classes','trainers'] }
    ];
    this.profiles.set(defaultProfiles);
    localStorage.setItem('gymhealth_profiles', JSON.stringify(defaultProfiles));
  }

  togglePermission(permId: string, checked: boolean) {
    if (checked) {
      this.selectedPermissions.set([...this.selectedPermissions(), permId]);
    } else {
      this.selectedPermissions.set(this.selectedPermissions().filter(id => id !== permId));
    }
  }

  isPermissionSelected(permId: string): boolean {
    return this.selectedPermissions().includes(permId);
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    if (this.selectedPermissions().length === 0) {
      alert('Debes seleccionar al menos un permiso'); return;
    }

    const formData = this.profileForm.value;
    if (this.editingProfile) {
      const updated = this.profiles().map(p =>
        p.id === this.editingProfile!.id
          ? { ...p, ...formData, permissions: this.selectedPermissions() }
          : p
      );
      this.profiles.set(updated);
    } else {
      const newProfile: Profile = {
        id: Date.now().toString(),
        color: 'purple',
        ...formData,
        permissions: this.selectedPermissions()
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
    this.selectedPermissions.set([...profile.permissions]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteProfile(profile: Profile) {
    if (!confirm(`¿Eliminar el perfil "${profile.name}"?`)) return;
    this.profiles.set(this.profiles().filter(p => p.id !== profile.id));
    localStorage.setItem('gymhealth_profiles', JSON.stringify(this.profiles()));
  }

  cancelEdit() { this.resetForm(); }

  resetForm() {
    this.editingProfile = null;
    this.profileForm.reset();
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.setErrors(null);
    });
    this.selectedPermissions.set([]);
  }

  getPermissionName(id: string) {
    return this.availablePermissions().find(p => p.id === id)?.name || id;
  }
  getPermissionDescription(id: string) {
    return this.availablePermissions().find(p => p.id === id)?.description || '';
  }
  getColor(color: string): string {
    const map: Record<string,string> = {
      purple:'#8b5cf6', blue:'#3b82f6', green:'#22c55e',
      cyan:'#06b6d4', orange:'#f97316', pink:'#ec4899'
    };
    return map[color] ?? '#8b5cf6';
  }
}