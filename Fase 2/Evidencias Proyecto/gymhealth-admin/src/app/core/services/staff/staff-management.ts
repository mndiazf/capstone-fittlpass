// src/app/core/services/management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Perfiles de staff por sucursal.
 * Viene directamente del backend.
 */
export interface StaffProfileDto {
  id: string;
  branchId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  requiresPassword: boolean;
}

/**
 * Resultado del buscador (autocomplete) por nombre o RUT.
 */
export interface StaffUserSearchResult {
  id: string;
  fullName: string;
  rut: string;
  email: string;
  branchId: string;
  branchName: string;
  profileId: string;
  profileName: string;
  active: boolean;
}

/**
 * Detalle completo del usuario staff para el formulario.
 */
export interface StaffUserDto {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  rut: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | null;
  accessStatus: 'ACTIVO' | 'BLOQUEADO' | 'NO_ENROLADO';
  branchId: string;
  branchName: string;
  profileId: string;
  profileName: string;
  active: boolean;
}

/**
 * Payload para crear un colaborador.
 * OJO: `password` solo es obligatorio para Administrador / Recepcionista.
 */
export interface CreateStaffUserPayload {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  rut: string;
  email: string;
  phone?: string | null;
  branchId: string;
  profileId: string;
  isActive: boolean;
  password?: string;
}

/**
 * Payload para actualizar un colaborador.
 * Solo envías lo que realmente cambió.
 */
export interface UpdateStaffUserPayload {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  secondLastName?: string | null;
  email?: string;
  phone?: string | null;
  branchId?: string;
  profileId?: string;
  isActive?: boolean;
  password?: string; // si cambias perfil a admin/recepción o quieres resetear clave
}

@Injectable({
  providedIn: 'root',
})
export class StaffManagement {
  /**
   * Base de los endpoints de staff.
   * Usamos ruta relativa para que funcione bien en SSR y en el browser.
   * Ej: /api/staff/users/search
   */
  private readonly baseUrl = 'http://localhost:3000/api/staff';

  constructor(private readonly http: HttpClient) {}

  // ====== Perfiles de staff (para el select "Perfil") ======

  /**
   * Obtiene los perfiles disponibles para una sucursal.
   * GET /api/staff/profiles?branchId=...
   */
  getProfilesByBranch(branchId: string): Observable<StaffProfileDto[]> {
    const params = new HttpParams().set('branchId', branchId);
    return this.http.get<StaffProfileDto[]>(
      `${this.baseUrl}/profiles`,
      { params },
    );
  }

  // ====== Buscador por nombre / RUT (autocomplete) ======

  /**
   * Buscar colaboradores por nombre o RUT.
   * Se usa en el buscador superior mientras el usuario escribe.
   *
   * GET /api/staff/users/search?q=...&branchId=...
   */
  searchStaffUsers(
    term: string,
    branchId?: string,
  ): Observable<StaffUserSearchResult[]> {
    let params = new HttpParams().set('q', term);
    if (branchId) {
      params = params.set('branchId', branchId);
    }

    return this.http.get<StaffUserSearchResult[]>(
      `${this.baseUrl}/users/search`,
      { params },
    );
  }

  // ====== Detalle de colaborador ======

  /**
   * Obtiene el detalle completo de un colaborador staff
   * para rellenar el formulario al seleccionarlo en el buscador.
   *
   * GET /api/staff/users/:id
   */
  getStaffUserById(userId: string): Observable<StaffUserDto> {
    return this.http.get<StaffUserDto>(`${this.baseUrl}/users/${userId}`);
  }

  // ====== Crear colaborador ======

  /**
   * Crea un nuevo colaborador de staff.
   * POST /api/staff/users
   *
   * - Si el perfil es Administrador o Recepcionista → `password` debe venir.
   * - Si es otro perfil → puedes omitir `password` y el backend la ignora.
   */
  createStaffUser(
    payload: CreateStaffUserPayload,
  ): Observable<StaffUserDto> {
    return this.http.post<StaffUserDto>(
      `${this.baseUrl}/users`,
      payload,
    );
  }

  // ====== Actualizar colaborador ======

  /**
   * Actualiza un colaborador existente.
   * PUT /api/staff/users/:id
   *
   * Envía solo los campos que cambian.
   * Si se cambia a un perfil que requiere contraseña, debes mandar `password`.
   */
  updateStaffUser(
    userId: string,
    payload: UpdateStaffUserPayload,
  ): Observable<StaffUserDto> {
    return this.http.put<StaffUserDto>(
      `${this.baseUrl}/users/${userId}`,
      payload,
    );
  }
}
