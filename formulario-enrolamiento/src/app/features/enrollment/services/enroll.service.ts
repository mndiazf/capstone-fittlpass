import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

export interface OneShotRequest {
  persona: {
    tipo: 'SOCIO' | 'TRABAJADOR';
    rut?: string | null;
    nombre: string;
    apellido: string;
    email?: string | null;
    telefono?: string | null;
  };
  consentimiento: {
    versionPolitica: string;
    aceptado: true;
    ipOrigen?: string | null;
  };
  fuente: 'KIOSKO' | 'TABLET' | 'OPERADOR' | 'OTRO';
  sucursalId?: number;
  deviceId?: string;
  embedding: {
    dims: number;
    values: number[];
  };
  livenessScore?: number;
  qualityScore?: number;
  requestId?: string;
}

export interface OneShotResponse {
  personaId: number;
  consentId: number | null;
  enrolamientoId: number;
  estado: 'VIGENTE' | 'REEMPLAZADO' | 'REVOCADO';
  thresholds: { sim: number; liveness: number; quality: number };
}

@Injectable({ providedIn: 'root' })
export class EnrollService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  enrollOneShot(payload: OneShotRequest): Observable<OneShotResponse> {
    return this.http.post<OneShotResponse>(
      `${this.baseUrl}/api/enrolamientos/one-shot`,
      payload
    );
  }
}
