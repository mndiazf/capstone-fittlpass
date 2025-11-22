// src/app/features/management/profile-management/profile-management.component.ts

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  PermissionDto,
  ProfileDto,
  ProfileManagement,
} from '../../../core/services/profiles/profile-management';
import { Auth } from '../../../core/services/auth/auth';

// === Configuración de UI local basada en "code" ===

const REQUIRED_PERMISSION_CODES = ['dashboard', 'notifications'];

const PERMISSION_UI_CONFIG: Record<
  string,
  { icon: string; isParent?: boolean; parentCode?: string }
> = {
  // Dashboard (OBLIGATORIO)
  dashboard: {
    icon: 'home',
  },

  // Miembros (padre)
  members: {
    icon: 'group',
    isParent: true,
  },
  enrollment: {
    icon: 'face',
    parentCode: 'members',
  },
  'member-search': {
    icon: 'person_search',
    parentCode: 'members',
  },
  'member-block': {
    icon: 'gavel',
    parentCode: 'members',
  },

  // Ventas y pagos
  salesandpayment: {
    icon: 'point_of_sale',
    isParent: true,
  },
  'presential-sale': {
    icon: 'store',
    parentCode: 'salesandpayment',
  },

  // Reportes
  reports: {
    icon: 'assessment',
    isParent: true,
  },
  'access-report': {
    icon: 'login',
    parentCode: 'reports',
  },

  // Mantenedor
  management: {
    icon: 'settings',
    isParent: true,
  },
  'management-users': {
    icon: 'person',
    parentCode: 'management',
  },
  'management-profiles': {
    icon: 'admin_panel_settings',
    parentCode: 'management',
  },
  'management-staff-schedule': {
    icon: 'event_note',
    parentCode: 'management',
  },
  'management-branch-schedule': {
    icon: 'schedule',
    parentCode: 'management',
  },

  // Notificaciones (OBLIGATORIO)
  notifications: {
    icon: 'notifications',
  },
};

// ===== Tipos de la vista =====

interface PermissionVm {
  id: string; // UUID backend
  code: string;
  name: string;
  description: string | null;
  icon: string;
  isParent?: boolean;
  parentCode?: string;
}

interface ProfileVm {
  id: string;
  branchId: string;
  name: string;
  color: string;
  permissions: PermissionVm[];
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
    MatTooltipModule,
  ],
  templateUrl: './profile-management.component.html',
  styleUrls: ['./profile-management.component.scss'],
})
export class ProfileManagementComponent implements OnInit {
  profileForm: FormGroup;

  // estado
  profiles = signal<ProfileVm[]>([]);
  availablePermissions = signal<PermissionVm[]>([]);
  selectedPermissions = signal<string[]>([]); // IDs

  editingProfile: ProfileVm | null = null;
  displayedColumns = ['name', 'permissions', 'actions'];

  loading = false;
  saving = false;

  // IDs de permisos obligatorios (llenados al cargar permisos)
  private requiredPermissionIds: string[] = [];

  // sucursal actual del admin (del JWT)
  private currentBranchId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private profileApi: ProfileManagement,
    private auth: Auth
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    this.loadPermissionsAndProfiles();
  }

  // =======================
  // Carga inicial
  // =======================

  private loadPermissionsAndProfiles(): void {
    this.loading = true;

    const branch = this.auth.currentBranch;
    if (!branch) {
      console.error('No hay sucursal en el JWT');
      this.loading = false;
      alert(
        'No se encontró una sucursal asociada al usuario. Reintenta el login o contacta al administrador.'
      );
      return;
    }

    this.currentBranchId = branch.id;

    this.profileApi.getAllPermissions().subscribe({
      next: (perms) => {
        this.setAvailablePermissions(perms);
        // una vez que tenemos permisos, cargamos perfiles de la sucursal
        this.loadProfilesFromApi(branch.id);
      },
      error: (err) => {
        console.error('Error al cargar permisos', err);
        this.loading = false;
        alert('Error al cargar permisos.');
      },
    });
  }

  private setAvailablePermissions(perms: PermissionDto[]): void {
    const mapped: PermissionVm[] = perms.map((p) => {
      const config = PERMISSION_UI_CONFIG[p.code] ?? { icon: 'check_box' };
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        icon: config.icon,
        isParent: config.isParent,
        parentCode: config.parentCode,
      };
    });

    this.availablePermissions.set(mapped);

    // inicializar permisos obligatorios
    const requiredIds = mapped
      .filter((p) => REQUIRED_PERMISSION_CODES.includes(p.code))
      .map((p) => p.id);

    this.requiredPermissionIds = requiredIds;
    this.selectedPermissions.set([...requiredIds]);
  }

  private loadProfilesFromApi(branchId: string): void {
    this.profileApi.getAllProfiles(branchId).subscribe({
      next: (data) => {
        const vms = data.map((p, index) => this.mapProfileDtoToVm(p, index));
        this.profiles.set(vms);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar perfiles', err);
        this.loading = false;
        alert('Error al cargar perfiles.');
      },
    });
  }

  private mapProfileDtoToVm(dto: ProfileDto, index: number): ProfileVm {
    const allPerms = this.availablePermissions();

    const permsVm: PermissionVm[] = dto.permissions.map((perm) => {
      const meta = allPerms.find((p) => p.id === perm.id);
      if (meta) {
        return meta;
      }
      // fallback si no está en la lista actual
      const config = PERMISSION_UI_CONFIG[perm.code] ?? { icon: 'check_box' };
      return {
        id: perm.id,
        code: perm.code,
        name: perm.name,
        description: perm.description,
        icon: config.icon,
        isParent: config.isParent,
        parentCode: config.parentCode,
      };
    });

    return {
      id: dto.id,
      branchId: dto.branchId,
      name: dto.name,
      color: this.pickColor(index),
      permissions: permsVm,
    };
  }

  private pickColor(index: number): string {
    const palette = ['purple', 'cyan', 'orange', 'blue', 'green', 'pink'];
    return palette[index % palette.length];
  }

  // =======================
  // UI permisos
  // =======================

  getGroupedPermissions(): { parent: PermissionVm | null; children: PermissionVm[] }[] {
    const all = this.availablePermissions();
    const groups: { parent: PermissionVm | null; children: PermissionVm[] }[] =
      [];

    // independientes (sin padre y no marcados como parent)
    const independent = all.filter((p) => !p.parentCode && !p.isParent);
    if (independent.length > 0) {
      groups.push({ parent: null, children: independent });
    }

    // padres
    const parents = all.filter((p) => p.isParent);
    parents.forEach((parent) => {
      const children = all.filter((p) => p.parentCode === parent.code);
      groups.push({ parent, children });
    });

    return groups;
  }

  togglePermission(permId: string, checked: boolean): void {
    const current = this.selectedPermissions();
    const perms = this.availablePermissions();
    const permission = perms.find((p) => p.id === permId);
    if (!permission) return;

    // no permitir desmarcar obligatorios
    if (!checked && this.requiredPermissionIds.includes(permId)) {
      return;
    }

    if (checked) {
      const updated = new Set(current);
      updated.add(permId);

      // si es padre, marcar todos los hijos
      if (permission.isParent) {
        const children = perms.filter((p) => p.parentCode === permission.code);
        children.forEach((c) => updated.add(c.id));
      }

      // si es hijo, marcar padre si existe
      if (permission.parentCode) {
        const parent = perms.find((p) => p.code === permission.parentCode);
        if (parent) {
          updated.add(parent.id);
        }
      }

      this.selectedPermissions.set(Array.from(updated));
    } else {
      let updated = current.filter((id) => id !== permId);

      // si es padre, desmarcar todos los hijos
      if (permission.isParent) {
        const children = perms.filter((p) => p.parentCode === permission.code);
        const childrenIds = children.map((c) => c.id);
        updated = updated.filter((id) => !childrenIds.includes(id));
      }

      // si es hijo, ver si hay hermanos marcados; si no, desmarcar padre
      if (permission.parentCode) {
        const siblings = perms.filter(
          (p) => p.parentCode === permission.parentCode && p.id !== permId
        );
        const hasSiblingSelected = siblings.some((s) =>
          updated.includes(s.id)
        );
        if (!hasSiblingSelected) {
          const parent = perms.find((p) => p.code === permission.parentCode);
          if (parent) {
            updated = updated.filter((id) => id !== parent.id);
          }
        }
      }

      // asegurar que los obligatorios sigan presentes
      this.requiredPermissionIds.forEach((reqId) => {
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

  isPermissionRequired(permId: string): boolean {
    return this.requiredPermissionIds.includes(permId);
  }

  // =======================
  // CRUD Perfiles
  // =======================

  saveProfile(): void {
    if (this.profileForm.invalid) {
      alert('Por favor completa el formulario correctamente');
      return;
    }

    if (!this.currentBranchId) {
      alert(
        'No hay sucursal activa en la sesión. Vuelve a iniciar sesión o selecciona una sucursal.'
      );
      return;
    }

    const allPerms = this.availablePermissions();
    const selectedIds = this.selectedPermissions();

    const selectedPerms = allPerms.filter((p) => selectedIds.includes(p.id));
    const nonRequiredSelected = selectedPerms.filter(
      (p) => !REQUIRED_PERMISSION_CODES.includes(p.code)
    );

    if (nonRequiredSelected.length === 0) {
      alert(
        'Debes seleccionar al menos un permiso adicional además de los obligatorios.'
      );
      return;
    }

    const formData = this.profileForm.value;
    const finalPermissionIds = Array.from(new Set(selectedIds));

    this.saving = true;

    if (this.editingProfile) {
      this.profileApi
        .updateProfile(this.editingProfile.id, {
          name: formData.name,
          permissionIds: finalPermissionIds,
        })
        .subscribe({
          next: (updatedDto) => {
            const current = this.profiles();
            const index = current.findIndex(
              (p) => p.id === this.editingProfile!.id
            );
            if (index >= 0) {
              const vm = this.mapProfileDtoToVm(updatedDto, index);
              const copy = [...current];
              copy[index] = vm;
              this.profiles.set(copy);
            }
            this.resetForm();
            this.saving = false;
          },
          error: (err) => {
            console.error('Error al actualizar perfil', err);
            this.saving = false;
            alert('Error al actualizar perfil.');
          },
        });
    } else {
      this.profileApi
        .createProfile({
          branchId: this.currentBranchId,
          name: formData.name,
          permissionIds: finalPermissionIds,
        })
        .subscribe({
          next: (createdDto) => {
            const current = this.profiles();
            const vm = this.mapProfileDtoToVm(createdDto, current.length);
            this.profiles.set([...current, vm]);
            this.resetForm();
            this.saving = false;
          },
          error: (err) => {
            console.error('Error al crear perfil', err);
            this.saving = false;
            alert('Error al crear perfil.');
          },
        });
    }
  }

  editProfile(profile: ProfileVm): void {
    this.editingProfile = profile;
    this.profileForm.patchValue({ name: profile.name });
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();

    const selectedIds = profile.permissions.map((p) => p.id);
    const withRequired = Array.from(
      new Set([...this.requiredPermissionIds, ...selectedIds])
    );
    this.selectedPermissions.set(withRequired);
  }

  deleteProfile(profile: ProfileVm): void {
    if (!confirm(`¿Eliminar el perfil "${profile.name}"?`)) return;

    this.profileApi.deleteProfile(profile.id).subscribe({
      next: () => {
        const updated = this.profiles().filter((p) => p.id !== profile.id);
        this.profiles.set(updated);
      },
      error: (err) => {
        console.error('Error al eliminar perfil', err);
        alert('Error al eliminar perfil.');
      },
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.editingProfile = null;
    this.profileForm.reset();
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    Object.keys(this.profileForm.controls).forEach((key) => {
      this.profileForm.get(key)?.setErrors(null);
    });

    // volver a solo permisos obligatorios
    this.selectedPermissions.set([...this.requiredPermissionIds]);
  }

  // =======================
  // Helpers UI
  // =======================

  getPermissionName(id: string): string {
    const perm = this.availablePermissions().find((p) => p.id === id);
    return perm?.name || id;
  }

  getPermissionDescription(id: string): string {
    const perm = this.availablePermissions().find((p) => p.id === id);
    return perm?.description || '';
  }

  getColor(color: string): string {
    const map: Record<string, string> = {
      purple: '#9747FF',
      cyan: '#00D2C6',
      orange: '#F97316',
      blue: '#3b82f6',
      green: '#22c55e',
      pink: '#ec4899',
    };
    return map[color] ?? '#9747FF';
  }
}
