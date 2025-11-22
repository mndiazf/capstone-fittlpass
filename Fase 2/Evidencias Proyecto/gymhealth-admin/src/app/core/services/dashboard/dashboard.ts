// src/app/core/services/dashboard/dashboard.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Auth } from '../auth/auth'; // 👈 ajusta el path si es distinto

export type DashboardActivityType = 'ACCESS' | 'SALE';

export interface DashboardActivityItem {
  id: string;
  type: DashboardActivityType;
  timestamp: string; // ISO string
  userFullName: string;
  rut: string;
  branchId: string;
  branchName: string | null;
  result: 'GRANTED' | 'DENIED' | null;
  source: string | null;
  amount: number | null;
  currency: string | null;
  description: string;
}

export interface TodayDashboardSummary {
  date: string; // YYYY-MM-DD
  branchId: string;
  accessCount: number;
  uniquePeopleCount: number;
  salesAmount: number;
  salesCurrency: string;
  activities: DashboardActivityItem[];
}

@Injectable({
  providedIn: 'root',
})
export class Dashboard {
  /**
   * Base del backend para el dashboard.
   * Ajusta el host/puerto si corresponde.
   */
  private readonly apiBaseUrl = 'http://localhost:3000/api/dashboard';

  constructor(
    private http: HttpClient,
    private auth: Auth,
  ) {}

  // ============================================
  // Helpers internos (mismo estilo que Reports)
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

  // ============================================
  // Dashboard de hoy
  // ============================================
  /**
   * Consume GET /api/dashboard/today?branchId=...
   *
   * Si no se pasa branchId, toma la sucursal actual desde Auth.
   */
  getTodaySummary(
    branchId?: string,
  ): Observable<TodayDashboardSummary> {
    let effectiveBranchId: string;
    try {
      effectiveBranchId = this.getCurrentBranchId(branchId);
    } catch (err) {
      return throwError(() => err);
    }

    const headers = this.createAuthHeaders();

    let params = new HttpParams().set('branchId', effectiveBranchId);

    const url = `${this.apiBaseUrl}/today`;

    return this.http.get<TodayDashboardSummary>(url, {
      headers,
      params,
    });
  }
}
