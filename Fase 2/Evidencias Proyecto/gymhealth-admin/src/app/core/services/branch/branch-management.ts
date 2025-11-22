// src/app/core/services/branch-schedule.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  OpeningHourDto,
  SaveOpeningHourInput,
  BranchStatus,
  BranchStatusDto,
} from '../../models/branch-schedule.interface';

@Injectable({
  providedIn: 'root',
})
export class BranchManagement {
  // Ajusta si tu backend está colgado en otro prefix (apiUrl, etc.)
  private readonly apiUrl = 'http://localhost:3000/api/admin';

  constructor(private http: HttpClient) {}

  // === Horarios de apertura ===

  getOpeningHours(branchId: string): Observable<OpeningHourDto[]> {
    return this.http.get<OpeningHourDto[]>(
      `${this.apiUrl}/branches/${branchId}/opening-hours`
    );
  }

  saveOpeningHours(
    branchId: string,
    items: SaveOpeningHourInput[]
  ): Observable<OpeningHourDto[]> {
    return this.http.put<OpeningHourDto[]>(
      `${this.apiUrl}/branches/${branchId}/opening-hours`,
      items
    );
  }

  // === Estado de la sucursal ===

  getBranchStatus(branchId: string): Observable<BranchStatus> {
    return this.http
      .get<BranchStatusDto>(`${this.apiUrl}/branches/${branchId}/status`)
      .pipe(map((dto) => this.mapStatus(dto)));
  }

  openBranch(branchId: string): Observable<BranchStatus> {
    return this.http
      .post<BranchStatusDto>(`${this.apiUrl}/branches/${branchId}/open`, {})
      .pipe(map((dto) => this.mapStatus(dto)));
  }

  closeBranch(branchId: string, reason?: string): Observable<BranchStatus> {
    return this.http
      .post<BranchStatusDto>(
        `${this.apiUrl}/branches/${branchId}/close`,
        { reason }
      )
      .pipe(map((dto) => this.mapStatus(dto)));
  }

  // === Mapper interno: DTO backend -> modelo UI ===

  private mapStatus(dto: BranchStatusDto): BranchStatus {
    return {
      ...dto,
      isOpen: dto.status === 'OPEN',
    };
  }
}
