// src/app/core/services/members/member-management.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { Auth } from '../auth/auth';

// ===== Modelos que usará el front =====

export type MembershipState = 'ACTIVA' | 'VENCIDA' | 'SIN_MEMBRESIA';
export type AccessStatus = 'NO_ENROLADO' | 'ACTIVO' | 'BLOQUEADO';
export type AccessResult = 'GRANTED' | 'DENIED';

export interface Member {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rut: string;
  telefono: string | null;

  // Membresía
  estadoMembresia: MembershipState;
  tipoMembresia: string | null;
  fechaVencimiento: Date | null;
  ultimoPago: Date | null;
  deudaPendiente: number;
  fechaUltimaActualizacion: Date;

  // Accesos
  ultimoAcceso: Date | null;
  totalAccesosUltimoMes: number;
  bloqueosActivos: number;

  // Bloqueo
  accessStatus: AccessStatus;
  estaBloqueado: boolean;
  motivoBloqueo: string | null;

  // Plan limitado por días
  esPlanLimitado: boolean;
  diasOcupados: number | null;
  diasDisponibles: number | null;
  sinDiasDisponibles: boolean;

  // Opcionales para tu UI (contacto de emergencia, etc.)
  tieneContactoEmergencia?: boolean;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}

export interface AccessHistory {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  sucursal: string;
  fecha: Date;
  hora: string;
  resultado: AccessResult; // 👈 GRANTED / DENIED
}

export interface MemberSearchResponse {
  members: Member[];
  total: number;
}

export interface AccessStatusDto {
  id: string;
  accessStatus: AccessStatus;
  bloqueado: boolean;
  motivoBloqueo: string | null;
}

// ===== DTOs tal como vienen del backend (fechas en string) =====

interface MemberApiDto {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rut: string;
  telefono: string | null;

  estadoMembresia: MembershipState;
  tipoMembresia: string | null;
  fechaVencimiento: string | null;
  ultimoPago: string | null;
  deudaPendiente: number;
  fechaUltimaActualizacion: string;

  ultimoAcceso: string | null;
  totalAccesosUltimoMes: number;
  bloqueosActivos: number;

  accessStatus: AccessStatus;
  estaBloqueado: boolean;
  motivoBloqueo: string | null;

  // Plan limitado
  esPlanLimitado: boolean;
  diasOcupados: number | null;
  diasDisponibles: number | null;
  sinDiasDisponibles: boolean;
}

interface MemberSearchApiResponse {
  members: MemberApiDto[];
  total: number;
}

interface AccessHistoryApiDto {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  sucursal: string;
  fecha: string;
  hora: string;
  resultado: AccessResult; // 👈 viene del backend
}

@Injectable({
  providedIn: 'root',
})
export class MemberManagement {
  // 👇 Base del backend de admin (ajusta si usas proxy/env)
  // Endpoint final: GET {apiBase}/members/search
  private readonly apiBase = 'http://localhost:3000/api/admin';

  constructor(
    private http: HttpClient,
    private auth: Auth,
  ) {}

  /**
   * Busca miembros por RUT / nombre / email / teléfono
   * GET /api/admin/members/search?query=...&limit=...&branchId=...
   *
   * branchId se obtiene desde la sesión del admin (currentBranch.id)
   * y se manda como query param para aplicar la lógica ONECLUB / MULTICLUB.
   */
  searchMembers(params: {
    query: string;
    limit?: number;
  }): Observable<MemberSearchResponse> {
    const trimmed = params.query.trim();

    // 👇 Match con lo que hicimos en el backend: no buscar con menos de 2 caracteres
    if (!trimmed || trimmed.length < 2) {
      return of({ total: 0, members: [] });
    }

    const branch = this.auth.currentBranch;
    const branchId = branch?.id ?? null;

    let httpParams = new HttpParams()
      .set('query', trimmed)
      .set('limit', (params.limit ?? 10).toString());

    if (branchId) {
      httpParams = httpParams.set('branchId', branchId);
    }

    return this.http
      .get<MemberSearchApiResponse>(`${this.apiBase}/members/search`, {
        params: httpParams,
      })
      .pipe(
        map((response) => ({
          total: response.total,
          members: response.members.map((m) => this.mapMemberApiToMember(m)),
        })),
      );
  }

  /**
   * Historial de accesos del miembro
   * GET /api/admin/members/:id/access-history?limit=10
   */
  getMemberAccessHistory(
    userId: string,
    limit = 10,
  ): Observable<AccessHistory[]> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http
      .get<AccessHistoryApiDto[]>(
        `${this.apiBase}/members/${userId}/access-history`,
        { params },
      )
      .pipe(map((rows) => rows.map((r) => this.mapAccessHistoryApi(r))));
  }

  /**
   * Bloquear usuario (impedir ingreso)
   * POST /api/admin/members/:id/block
   */
  blockMember(userId: string): Observable<AccessStatusDto> {
    return this.http.post<AccessStatusDto>(
      `${this.apiBase}/members/${userId}/block`,
      {},
    );
  }

  /**
   * Desbloquear usuario (permitir ingreso)
   * POST /api/admin/members/:id/unblock
   */
  unblockMember(userId: string): Observable<AccessStatusDto> {
    return this.http.post<AccessStatusDto>(
      `${this.apiBase}/members/${userId}/unblock`,
      {},
    );
  }

  /**
   * Stub para "solicitar actualización de datos"
   * (tu componente ya lo usa, pero aún no hay endpoint real)
   */
  requestDataUpdate(_userId: string): Observable<void> {
    // De momento no hace nada, solo mantiene la firma que espera tu componente
    return of(void 0);
  }

  // ========= Helpers de mapeo =========

  private mapMemberApiToMember(api: MemberApiDto): Member {
    const fechaVencimientoDate = api.fechaVencimiento
      ? new Date(api.fechaVencimiento)
      : null;

    let estadoMembresia: MembershipState = api.estadoMembresia;

    // 🔴 Seguridad extra en el front:
    // si la fecha de vencimiento ya pasó, lo marcamos como VENCIDA
    if (fechaVencimientoDate) {
      const hoy = new Date();
      const hoyMidnight = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
        0,
        0,
        0,
        0,
      );
      if (fechaVencimientoDate.getTime() < hoyMidnight.getTime()) {
        estadoMembresia = 'VENCIDA';
      }
    }

    return {
      ...api,
      estadoMembresia,
      fechaVencimiento: fechaVencimientoDate,
      ultimoPago: api.ultimoPago ? new Date(api.ultimoPago) : null,
      fechaUltimaActualizacion: new Date(api.fechaUltimaActualizacion),
      ultimoAcceso: api.ultimoAcceso ? new Date(api.ultimoAcceso) : null,
      // Plan limitado (ya vienen calculados del backend)
      esPlanLimitado: api.esPlanLimitado,
      diasOcupados: api.diasOcupados,
      diasDisponibles: api.diasDisponibles,
      sinDiasDisponibles: api.sinDiasDisponibles,
      // estos vienen del backend tal cual:
      accessStatus: api.accessStatus,
      estaBloqueado: api.estaBloqueado,
      motivoBloqueo: api.motivoBloqueo,
    };
  }

  private mapAccessHistoryApi(api: AccessHistoryApiDto): AccessHistory {
    return {
      ...api,
      fecha: new Date(api.fecha),
      resultado: api.resultado, // 👈 GRANTED / DENIED
    };
  }
}
