import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, delay } from 'rxjs/operators';

export interface StaffMember {
  id: string;
  firstName: string;
  secondName?: string;
  paternalLastName: string;
  maternalLastName: string;
  rut: string;
  email: string;
  profileId: string;
  profileName: string;
  branchId: string;
  branchName: string;
  isActive: boolean;
  hasEnrollment: boolean;
  enrollmentLocked: boolean;
  lastEnrollment?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  // Si no tienes backend, comenta esta línea:
  // private apiUrl = `${environment.apiUrl}/staff`;

  constructor(private http: HttpClient) {}

  // Buscar por RUT
  getByRut(rut: string): Observable<StaffMember> {
    // MOCK para desarrollo - eliminar cuando tengas backend
    const mockStaff = this.getMockStaff();
    const found = mockStaff.find(s => s.rut === rut);
    
    if (found) {
      return of(found).pipe(delay(500)); // Simular delay de red
    }
    
    return throwError(() => new Error('Colaborador no encontrado'));

    // REAL con backend (descomentar cuando tengas API):
    // return this.http.get<StaffMember>(`${this.apiUrl}/rut/${rut}`).pipe(
    //   catchError(this.handleError)
    // );
  }

  // Crear o actualizar
  save(staff: Partial<StaffMember>): Observable<StaffMember> {
    if (staff.id) {
      // Actualizar
      const updated = { ...staff, id: staff.id } as StaffMember;
      return of(updated).pipe(delay(300));
      
      // REAL: return this.http.put<StaffMember>(`${this.apiUrl}/${staff.id}`, staff);
    } else {
      // Crear
      const newStaff: StaffMember = {
        id: Date.now().toString(),
        createdAt: new Date(),
        hasEnrollment: false,
        enrollmentLocked: false,
        isActive: true,
        ...staff
      } as StaffMember;
      return of(newStaff).pipe(delay(300));
      
      // REAL: return this.http.post<StaffMember>(this.apiUrl, staff);
    }
  }

  // Enrolar facial
  enrollFace(staffId: string, imageBlob: Blob): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('image', imageBlob, 'face.jpg');
    formData.append('staffId', staffId);

    // MOCK
    return of({ success: true, message: 'Enrollment exitoso' }).pipe(delay(1500));

    // REAL con backend:
    // return this.http.post<any>(`${this.apiUrl}/${staffId}/enroll`, formData).pipe(
    //   catchError(this.handleError)
    // );
  }

  // Convertir DataURL a Blob
  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // MOCK DATA para pruebas
  // MOCK DATA para pruebas - RUTS VÁLIDOS
private getMockStaff(): StaffMember[] {
  return [
    {
      id: '1',
      firstName: 'Juan',
      secondName: 'Carlos',
      paternalLastName: 'Pérez',
      maternalLastName: 'González',
      rut: '11.111.111-1', // 
      email: 'juan.perez@gymhealth.com',
      profileId: '1',
      profileName: 'Administrador',
      branchId: '1',
      branchName: 'Sucursal Centro',
      isActive: true,
      hasEnrollment: false,
      enrollmentLocked: false,
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      firstName: 'María',
      secondName: 'Isabel',
      paternalLastName: 'López',
      maternalLastName: 'Silva',
      rut: '22.222.222-2', // 
      email: 'maria.lopez@gymhealth.com',
      profileId: '3',
      profileName: 'Recepcionista',
      branchId: '2',
      branchName: 'Sucursal Norte',
      isActive: true,
      hasEnrollment: true,
      enrollmentLocked: false,
      lastEnrollment: '15/01/2025',
      createdAt: new Date('2024-02-20')
    },
    {
      id: '3',
      firstName: 'Pedro',
      secondName: 'Antonio',
      paternalLastName: 'Ramírez',
      maternalLastName: 'Fernández',
      rut: '33.333.333-3', 
      email: 'pedro.ramirez@gymhealth.com',
      profileId: '2',
      profileName: 'Entrenador',
      branchId: '1',
      branchName: 'Sucursal Centro',
      isActive: true,
      hasEnrollment: false,
      enrollmentLocked: false,
      createdAt: new Date('2024-03-10')
    }
  ];
}

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.message || `Error ${error.status}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}