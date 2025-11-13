// src/app/core/services/membership-catalog.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MembershipApi {
  code: string;
  name: string;
  description: string;
  price: number;
  durationMonths: number;
  scope: 'MULTICLUB' | 'ONECLUB' | string;
  isUsageLimited: boolean;
  maxDaysPerPeriod: number | null;
  periodUnit: 'WEEK' | 'MONTH' | null;
  periodLength: number | null;
}

export interface BranchApi {
  id: string;
  code: string;
  name: string;
  address: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MembershipCatalog {
  private readonly baseUrl = 'http://localhost:3000/api/catalog';

  constructor(private http: HttpClient) {}

  getMemberships(): Observable<MembershipApi[]> {
    return this.http.get<MembershipApi[]>(`${this.baseUrl}/memberships`);
  }

  getBranches(): Observable<BranchApi[]> {
    return this.http.get<BranchApi[]>(`${this.baseUrl}/branches`);
  }
}
