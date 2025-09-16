import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface EnrollPayload {
  nombre: string;
  rut: string;
  email?: string;
  telefono?: string;
  acepta: boolean;
  fotoBase64: string;
  fuente?: 'web';
  sucursal_id?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  enroll(p: EnrollPayload) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.base}/enrollment`, p, { headers });
  }
}
