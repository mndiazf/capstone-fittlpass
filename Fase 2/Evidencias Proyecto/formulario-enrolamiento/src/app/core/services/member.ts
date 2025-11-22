// src/app/core/services/member.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

const API_MEMBERS = 'http://localhost:3000/api/members';

export interface MemberAccessItem {
  id: string;
  userId: string;
  branchId: string | null;
  branchName: string | null;
  createdAt: string; // ISO
  result: string;    // ej: 'GRANTED' | 'DENIED'
}

interface BackendMemberAccessResponse {
  userId: string;
  range: string; // 'last_7_days'
  items: {
    id: string;
    user_id: string;
    branch_id: string | null;
    branch_name: string | null;
    created_at: string;
    result: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class Member {
  private http = inject(HttpClient);

  /**
   * Obtiene los accesos del usuario en la última semana.
   * GET /api/members/:userId/accesses/last-week
   */
  getLastWeekAccesses(userId: string): Observable<MemberAccessItem[]> {
    return this.http
      .get<BackendMemberAccessResponse>(
        `${API_MEMBERS}/${userId}/accesses/last-week`,
      )
      .pipe(
        map((resp) =>
          resp.items.map((item) => ({
            id: item.id,
            userId: resp.userId,
            branchId: item.branch_id,
            branchName: item.branch_name,
            createdAt: item.created_at,
            result: item.result,
          })),
        ),
      );
  }
}
