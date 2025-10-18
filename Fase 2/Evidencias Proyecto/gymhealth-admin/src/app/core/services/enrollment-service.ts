// src/app/core/services/enrollment-service.ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

export interface UserProfileDto {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  email: string;
  phone: string | null;
  rut: string;
  status: string | null;

  membershipType: string | null;
  membershipStatus: string | null;
  membershipStart: string | null; // YYYY-MM-DD
  membershipEnd: string | null;

  accessStatus: string | null;
  enrollmentStatus: string | null;

  membershipBranchId: string | null;
  membershipBranchName: string | null;
  membershipBranchCode: string | null;
}

export interface MemberUiModel {
  id: string;
  rut: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  email: string;

  membership: string | null;          // texto para UI
  membershipStatus: 'active' | 'inactive' | 'expired' | 'unknown';
  membershipStart?: string | null;
  membershipEnd?: string | null;

  enrollmentStatus: 'enrolled' | 'locked' | 'not-enrolled';
  enrollmentLocked: boolean;
  lastEnrollment?: string | null;

  branch?: {
    id: string | null;
    name: string | null;
    code: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly apiBase = 'http://localhost:8080';
  private readonly faceBase = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  /** GET /api/users/profile-by-rut/{rut} */
  getProfileByRut(rutInput: string): Observable<MemberUiModel> {
    // ✅ enviar SIEMPRE con formato xx.xxx.xxx-X (DV mayúscula)
    const formatted = this.formatRutWithDots(rutInput);
    const url = `${this.apiBase}/api/users/profile-by-rut/${encodeURIComponent(formatted)}`;

    return this.http.get<UserProfileDto>(url).pipe(
      map(dto => this.mapDtoToUi(dto)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return throwError(() => new Error('No existe la persona para el RUT ingresado.'));
        }
        return throwError(() => new Error('Error al buscar el miembro.'));
      })
    );
  }

  /** POST /api/face/enroll/{user_id}  (multipart/form-data con key "image") */
  enrollFace(userId: string, image: Blob): Observable<any> {
    const form = new FormData();
    form.append('image', image, 'face.jpg');

    const url = `${this.faceBase}/api/face/enroll/${encodeURIComponent(userId)}`;
    return this.http.post(url, form).pipe(
      catchError(() => throwError(() => new Error('No se pudo completar el enrolamiento.')))
    );
  }

  /** Util: DataURL -> Blob (image/jpeg) */
  dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: 'image/jpeg' });
  }

  // ===========================
  // Helpers (RUT formateado)
  // ===========================
  /** Formatea a xx.xxx.xxx-X (DV en mayúscula). Si no puede, devuelve el input en mayúscula. */
  private formatRutWithDots(rutRaw: string): string {
    if (!rutRaw) return '';
    const cleaned = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase(); // solo dígitos y K
    if (cleaned.length < 2) return rutRaw.toUpperCase();

    const dv = cleaned.slice(-1);
    const body = cleaned.slice(0, -1);

    // puntos cada 3 desde la derecha
    const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${bodyWithDots}-${dv}`;
  }

  /** Mapper backend -> UI esperada por tu template */
  private mapDtoToUi(dto: UserProfileDto): MemberUiModel {
    const membershipStatus = (dto.membershipStatus || 'unknown').toUpperCase();
    let uiMembershipStatus: MemberUiModel['membershipStatus'] = 'unknown';
    if (membershipStatus === 'ACTIVE') uiMembershipStatus = 'active';
    else if (membershipStatus === 'EXPIRED') uiMembershipStatus = 'expired';
    else if (membershipStatus === 'INACTIVE') uiMembershipStatus = 'inactive';

    const enrollmentStatus = (dto.enrollmentStatus || '').toUpperCase();
    let uiEnrollmentStatus: MemberUiModel['enrollmentStatus'] = 'not-enrolled';
    if (enrollmentStatus === 'ENROLLED') uiEnrollmentStatus = 'enrolled';
    else if (enrollmentStatus === 'LOCKED') uiEnrollmentStatus = 'locked';

    return {
      id: dto.id,
      rut: dto.rut,
      firstName: dto.firstName,
      middleName: dto.middleName,
      lastName: dto.lastName,
      secondLastName: dto.secondLastName,
      email: dto.email,

      membership: dto.membershipType,
      membershipStatus: uiMembershipStatus,
      membershipStart: dto.membershipStart,
      membershipEnd: dto.membershipEnd,

      enrollmentStatus: uiEnrollmentStatus,
      enrollmentLocked: uiEnrollmentStatus === 'locked',
      lastEnrollment: null,

      branch: {
        id: dto.membershipBranchId,
        name: dto.membershipBranchName,
        code: dto.membershipBranchCode,
      }
    };
  }
}
