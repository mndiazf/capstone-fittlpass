// src/app/core/services/profile-management.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Ajusta esta URL base según tu setup:
 * - Si tu BFF/Node corre en el mismo dominio → deja '/api/admin'
 * - Si corre en otro host/puerto → por ejemplo 'http://localhost:3000/api/admin'
 */
const API_ADMIN_BASE = 'http://localhost:3000/api/admin';

// ====== DTOs que devuelve el backend ======

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  canView?: boolean;
  canEdit?: boolean;
}

export interface ProfileDto {
  id: string;
  branchId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  permissions: PermissionDto[];
}

export interface UserProfileAssignmentDto {
  assignmentId: string;
  userId: string;
  profileId: string;
  profileName: string;
  branchId: string;       // ahora siempre viene con sucursal
  active: boolean;
  createdAt: string;      // viene como ISO string
  endedAt: string | null; // viene como ISO string o null
}

// ====== Payloads que enviaremos al backend ======

export interface CreateProfileRequest {
  branchId: string;                 // 💡 perfil exclusivo para una sucursal
  name: string;
  description?: string | null;
  isDefault?: boolean;
  // lista de ids de ui_permission asociados al perfil
  permissionIds?: string[];
}

export interface UpdateProfileRequest {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  permissionIds?: string[]; // reemplaza completamente los permisos
}

export interface AssignProfileToUserRequest {
  profileId: string;      // branch se resuelve desde el perfil en el backend
}

@Injectable({
  providedIn: 'root',
})
export class ProfileManagement {
  constructor(private readonly http: HttpClient) {}

  // =========================
  //   PERMISOS (UI)
  // =========================

  /**
   * Obtiene todos los permisos disponibles (para armar el árbol de módulos/funcionalidades).
   * GET /api/admin/permissions
   */
  getAllPermissions(): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${API_ADMIN_BASE}/permissions`);
  }

  // =========================
  //   PERFILES
  // =========================

  /**
   * Lista todos los perfiles con sus permisos para una sucursal.
   * GET /api/admin/profiles?branchId=...
   */
  getAllProfiles(branchId: string): Observable<ProfileDto[]> {
    const params = new HttpParams().set('branchId', branchId);
    return this.http.get<ProfileDto[]>(`${API_ADMIN_BASE}/profiles`, { params });
  }

  /**
   * Obtiene un perfil por id (con sus permisos).
   * GET /api/admin/profiles/:id
   */
  getProfileById(id: string): Observable<ProfileDto> {
    return this.http.get<ProfileDto>(`${API_ADMIN_BASE}/profiles/${id}`);
  }

  /**
   * Crea un nuevo perfil con permisos para una sucursal.
   * POST /api/admin/profiles
   */
  createProfile(payload: CreateProfileRequest): Observable<ProfileDto> {
    return this.http.post<ProfileDto>(`${API_ADMIN_BASE}/profiles`, payload);
  }

  /**
   * Actualiza un perfil existente.
   * PUT /api/admin/profiles/:id
   */
  updateProfile(
    id: string,
    payload: UpdateProfileRequest
  ): Observable<ProfileDto> {
    return this.http.put<ProfileDto>(
      `${API_ADMIN_BASE}/profiles/${id}`,
      payload
    );
  }

  /**
   * Elimina un perfil.
   * DELETE /api/admin/profiles/:id
   * Devuelve 204 sin body.
   */
  deleteProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${API_ADMIN_BASE}/profiles/${id}`);
  }

  // =========================
  //   ASIGNACIÓN A STAFF
  // =========================

  /**
   * Lista los perfiles asignados a un usuario STAFF.
   * GET /api/admin/staff/:userId/profiles
   */
  getUserProfiles(userId: string): Observable<UserProfileAssignmentDto[]> {
    return this.http.get<UserProfileAssignmentDto[]>(
      `${API_ADMIN_BASE}/staff/${userId}/profiles`
    );
  }

  /**
   * Asigna un perfil a un usuario STAFF.
   * POST /api/admin/staff/:userId/profiles
   * El backend toma branchId desde el perfil.
   */
  assignProfileToUser(
    userId: string,
    payload: AssignProfileToUserRequest
  ): Observable<UserProfileAssignmentDto> {
    return this.http.post<UserProfileAssignmentDto>(
      `${API_ADMIN_BASE}/staff/${userId}/profiles`,
      payload
    );
  }

  /**
   * Desactiva una asignación de perfil (no borra, marca inactive + ended_at).
   * DELETE /api/admin/staff/profile-assignments/:assignmentId
   */
  deactivateAssignment(assignmentId: string): Observable<void> {
    return this.http.delete<void>(
      `${API_ADMIN_BASE}/staff/profile-assignments/${assignmentId}`
    );
  }
}
