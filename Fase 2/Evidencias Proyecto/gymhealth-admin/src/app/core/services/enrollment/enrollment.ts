// src/app/core/services/enrollment/enrollment.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, map } from 'rxjs';
import { Auth } from '../auth/auth';

/**
 * Respuesta cruda que entrega el backend:
 * GET /api/members/search?term=...&branchId=...&limit=10
 */
export interface MemberApiResponse {
  id: string;
  rut: string;
  fullName: string;
  email: string;
  phone: string | null;

  // Opcionales (a futuro)
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  secondLastName?: string | null;

  // Datos de membresía (pueden venir null si no tiene)
  membershipType: string | null;   // plan_code
  membershipName: string | null;   // plan_name
  membershipStatus: 'active' | 'inactive' | 'expired' | string;
  membershipScope: 'ONECLUB' | 'MULTICLUB' | null | string;
  membershipBranchId: string | null;
  membershipBranchName: string | null;
  membershipStart: string | null;  // 'YYYY-MM-DD' (o ISO)
  membershipEnd: string | null;    // 'YYYY-MM-DD' (o ISO)

  // Último enrolamiento (si lo agregas en el backend más adelante)
  lastEnrollment?: string | null;

  enrollmentStatus: 'enrolled' | 'not_enrolled' | 'locked' | string;
  enrollmentLocked: boolean;
}

/**
 * Modelo que usa la UI (EnrollmentComponent)
 */
export interface MemberUiModel {
  id: string;
  rut: string;
  fullName: string;
  email: string;
  phone: string | null;

  // Para el template
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  secondLastName?: string | null;

  // Label legible de la membresía
  membershipType: string | null;
  membershipName: string | null;
  membership?: string;  // usado como "memberData.membership" en el HTML

  membershipStatus: 'active' | 'inactive' | 'expired' | string;
  membershipScope: 'ONECLUB' | 'MULTICLUB' | null | string;
  membershipBranchId: string | null;
  membershipBranchName: string | null;
  membershipStart: Date | null;
  membershipEnd: Date | null;

  // Para mostrar "Último enrolamiento"
  lastEnrollment?: Date | null;

  // Para la lógica de la vista:
  enrollmentStatus: 'enrolled' | 'not_enrolled' | 'locked' | string;
  enrollmentLocked: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Enrollment {
  // 👇 Ajusta si tu backend está en otra URL/puerto
  private readonly apiBaseUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private auth: Auth,
  ) {}

  /**
   * Búsqueda de miembros por término libre (RUT o nombre),
   * usando la branch del admin logueado.
   *
   * GET /api/members/search?term=...&branchId=branch-scl-centro&limit=10
   */
  searchMembers(term: string, limit: number = 10): Observable<MemberUiModel[]> {
    const branch = this.auth.currentBranch;
    if (!branch) {
      return throwError(
        () =>
          new Error(
            'No hay sucursal seleccionada en el contexto del administrador',
          ),
      );
    }

    const url = `${this.apiBaseUrl}/members/search`;

    let params = new HttpParams()
      .set('term', term)
      .set('branchId', branch.id)
      .set('limit', String(limit));

    let headers = new HttpHeaders();
    const token = this.auth.token;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http
      .get<MemberApiResponse[]>(url, { params, headers })
      .pipe(map((apiList) => apiList.map((api) => this.mapApiToUiModel(api))));
  }

  // ======================================================
  // Helpers para el componente
  // ======================================================

  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }

  enrollFace(userId: string, image: Blob): Observable<unknown> {
    const formData = new FormData();
    formData.append('image', image);

    const url = `http://localhost:3200/api/face/enroll/${userId}`;

    let headers = new HttpHeaders();
    const token = this.auth.token;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post(url, formData, { headers });
  }

  // ======================
  // Mappers privados
  // ======================

  private mapApiToUiModel(api: MemberApiResponse): MemberUiModel {
    // Derivar firstName / lastName si no vienen desglosados
    let firstName = api.firstName;
    let lastName = api.lastName;

    if (!firstName || !lastName) {
      const parts = (api.fullName || '').trim().split(/\s+/);
      firstName = firstName || parts[0] || '';
      lastName = lastName || parts.slice(1).join(' ');
    }

    // Parseo de fechas
    const membershipStart = api.membershipStart
      ? new Date(api.membershipStart)
      : null;
    const membershipEnd = api.membershipEnd
      ? new Date(api.membershipEnd)
      : null;

    // 🔥 Regla extra en el front:
    // - Si hay fecha de término y HOY > end_date → expired,
    //   aunque membershipStatus venga como 'active'.
    let normalizedStatus = api.membershipStatus;
    if (membershipEnd) {
      const today = new Date();
      const end = new Date(
        membershipEnd.getFullYear(),
        membershipEnd.getMonth(),
        membershipEnd.getDate(),
        23,
        59,
        59,
        999,
      );
      if (today.getTime() > end.getTime()) {
        normalizedStatus = 'expired';
      }
    }

    // Label de membresía que usas en el template como "membership"
    const membershipLabel =
      api.membershipName ||
      api.membershipType ||
      (normalizedStatus === 'expired' ? 'Membresía vencida' : 'Sin membresía');

    return {
      id: api.id,
      rut: api.rut,
      fullName: api.fullName,
      email: api.email,
      phone: api.phone,

      firstName,
      middleName: api.middleName ?? null,
      lastName,
      secondLastName: api.secondLastName ?? null,

      membershipType: api.membershipType,
      membershipName: api.membershipName,
      membership: membershipLabel,

      membershipStatus: normalizedStatus,
      membershipScope: api.membershipScope ?? null,
      membershipBranchId: api.membershipBranchId,
      membershipBranchName: api.membershipBranchName,
      membershipStart,
      membershipEnd,

      lastEnrollment: api.lastEnrollment ? new Date(api.lastEnrollment) : null,

      enrollmentStatus: api.enrollmentStatus,
      enrollmentLocked: api.enrollmentLocked,
    };
  }

    /**
   * Busca el perfil del miembro por RUT, usando la branch del admin logueado.
   * GET /api/members/profile-by-rut?rut=20.059.049-K&branchId=branch-scl-centro
   */
  getProfileByRut(rut: string): Observable<MemberUiModel> {
    const branch = this.auth.currentBranch;
    if (!branch) {
      return throwError(
        () =>
          new Error(
            'No hay sucursal seleccionada en el contexto del administrador',
          ),
      );
    }

    const url = `${this.apiBaseUrl}/members/profile-by-rut`;

    const params = new HttpParams()
      .set('rut', rut)
      .set('branchId', branch.id);

    let headers = new HttpHeaders();
    const token = this.auth.token;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http
      .get<MemberApiResponse>(url, { params, headers })
      .pipe(map((api) => this.mapApiToUiModel(api)));
  }
}
