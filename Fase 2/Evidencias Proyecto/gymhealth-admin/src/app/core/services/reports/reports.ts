// src/app/core/services/reports/reports.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Auth } from '../auth/auth';

export type PersonTypeFilter = 'all' | 'member' | 'staff';
export type ResultFilter = 'ALL' | 'GRANTED' | 'DENIED';

export interface AccessLogReportItem {
  id: string;
  date: string; // "16-11-2025"
  time: string; // "14:30"
  fullName: string;
  rut: string;
  personType: 'MEMBER' | 'STAFF' | 'UNKNOWN';
  accessType: 'ENTRY';
  branchId: string;
  branchName: string;
  result: 'GRANTED' | 'DENIED';
  resultLabel: 'Exitoso' | 'Rechazado';
  source: string;
  reason: string | null;
}

export interface AccessLogReportPage {
  content: AccessLogReportItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface RecentAccessLogsResponse {
  items: AccessLogReportItem[];
  total: number;
}

export interface AccessReportFilters {
  branchId?: string;
  personType?: PersonTypeFilter;
  from?: Date | string | null;
  to?: Date | string | null;
  result?: ResultFilter;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root',
})
export class Reports {
  /**
   * Ajusta esta base si cambias el host/puerto del backend.
   * El backend expone:
   *  - GET /api/reports/access-logs
   *  - GET /api/reports/access-logs/recent
   *  - GET /api/reports/access-logs/export
   */
  private readonly apiBaseUrl = 'http://localhost:3000/api/reports';

  constructor(
    private http: HttpClient,
    private auth: Auth,
  ) {}

  // ============================================
  // Helpers internos
  // ============================================
  private createAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = this.auth.token;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private getCurrentBranchId(explicitBranchId?: string): string {
    if (explicitBranchId) return explicitBranchId;

    const branch = this.auth.currentBranch;
    if (!branch) {
      throw new Error(
        'No hay sucursal seleccionada en el contexto del administrador',
      );
    }
    return branch.id;
  }

  private formatDateParam(date?: Date | string | null): string | undefined {
    if (!date) return undefined;

    if (typeof date === 'string') {
      // Asumimos que ya viene como YYYY-MM-DD
      return date;
    }

    // Lo formateamos a YYYY-MM-DD para el backend
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ============================================
  // Accesos paginados (pantalla de Reporte)
  // ============================================
  /**
   * Consume GET /api/reports/access-logs
   * Devuelve la página para la grilla principal.
   */
  getAccessLogs(
    filters: AccessReportFilters,
  ): Observable<AccessLogReportPage> {
    let branchId: string;
    try {
      branchId = this.getCurrentBranchId(filters.branchId);
    } catch (err) {
      return throwError(() => err);
    }

    let params = new HttpParams().set('branchId', branchId);

    if (filters.personType) {
      params = params.set('personType', filters.personType);
    }

    const fromStr = this.formatDateParam(filters.from);
    if (fromStr) {
      params = params.set('from', fromStr);
    }

    const toStr = this.formatDateParam(filters.to);
    if (toStr) {
      params = params.set('to', toStr);
    }

    if (filters.result) {
      params = params.set('result', filters.result);
    }

    if (typeof filters.page === 'number') {
      params = params.set('page', String(filters.page));
    }

    if (typeof filters.size === 'number') {
      params = params.set('size', String(filters.size));
    }

    const headers = this.createAuthHeaders();
    const url = `${this.apiBaseUrl}/access-logs`;

    return this.http.get<AccessLogReportPage>(url, {
      headers,
      params,
    });
  }

  // ============================================
  // Últimos N accesos (card "Últimos 20 accesos")
  // ============================================
  /**
   * Consume GET /api/reports/access-logs/recent
   * Usado para la tabla de "Últimos 20 accesos".
   */
  getRecentAccessLogs(
    limit = 20,
    branchId?: string,
  ): Observable<RecentAccessLogsResponse> {
    let effectiveBranchId: string;
    try {
      effectiveBranchId = this.getCurrentBranchId(branchId);
    } catch (err) {
      return throwError(() => err);
    }

    let params = new HttpParams()
      .set('branchId', effectiveBranchId)
      .set('limit', String(limit));

    const headers = this.createAuthHeaders();
    const url = `${this.apiBaseUrl}/access-logs/recent`;

    return this.http.get<RecentAccessLogsResponse>(url, {
      headers,
      params,
    });
  }

  // ============================================
  // Exportar a CSV / Excel
  // ============================================
  /**
   * Consume GET /api/reports/access-logs/export
   * Devuelve un Blob CSV para descargar (abrible en Excel).
   *
   * En el componente:
   *  this.reports.exportAccessLogs(filters).subscribe(blob => {
   *    const url = URL.createObjectURL(blob);
   *    const a = document.createElement('a');
   *    a.href = url;
   *    a.download = 'reporte-accesos.csv';
   *    a.click();
   *    URL.revokeObjectURL(url);
   *  });
   */
  exportAccessLogs(
    filters: AccessReportFilters,
  ): Observable<Blob> {
    let branchId: string;
    try {
      branchId = this.getCurrentBranchId(filters.branchId);
    } catch (err) {
      return throwError(() => err);
    }

    let params = new HttpParams().set('branchId', branchId);

    if (filters.personType) {
      params = params.set('personType', filters.personType);
    }

    const fromStr = this.formatDateParam(filters.from);
    if (fromStr) {
      params = params.set('from', fromStr);
    }

    const toStr = this.formatDateParam(filters.to);
    if (toStr) {
      params = params.set('to', toStr);
    }

    if (filters.result) {
      params = params.set('result', filters.result);
    }

    const headers = this.createAuthHeaders();
    const url = `${this.apiBaseUrl}/access-logs/export`;

    return this.http.get(url, {
      headers,
      params,
      responseType: 'blob',
    });
  }
}
