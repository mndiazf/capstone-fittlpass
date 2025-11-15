// member-management.service.ts - SERVICIO COMPLETO

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { 
  Member, 
  MemberSearchRequest, 
  MemberSearchResponse,
  AccessHistory,
  Infraction,
  Block,
  CreateInfractionRequest,
  CreateBlockRequest,
  BlockValidationResponse,
  MembershipStatus,
  InfractionCategory,
  InfractionStatus,
  BlockStatus,
  BlockType,
  InfractionType,
  AccessType
} from '../../shared/models/member.models';

@Injectable({
  providedIn: 'root'
})
export class MemberManagementService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/v1'; // Ajustar según tu configuración
  private readonly USE_MOCK_DATA = true; // ✅ Cambiar a false cuando conectes al backend

  // ===== DATOS MOCK PARA PRUEBAS =====
  private mockMembers: Member[] = [
    {
      id: 1,
      rut: '20.139.861-4',
      nombre: 'Juan Carlos',
      apellido: 'Pérez González',
      email: 'juan.perez@email.com',
      telefono: '+56 9 1234 5678',
      fotoPerfil: 'https://i.pravatar.cc/300?img=12',
      fechaNacimiento: new Date('1990-05-15'),
      direccion: 'Av. Providencia 1234, Santiago',
      estadoMembresia: MembershipStatus.ACTIVA,
      tipoMembresia: 'Premium',
      fechaInicioMembresia: new Date('2024-01-01'),
      fechaVencimiento: new Date('2025-12-31'),
      sucursalAsignada: 'Santiago Centro',
      ultimoPago: new Date('2025-10-15'),
      deudaPendiente: 0,
      metodoPagoPreferido: 'Tarjeta de Crédito',
      fechaUltimaActualizacion: new Date(),
      requiereActualizacion: false,
      ultimoAcceso: new Date(),
      totalAccesosUltimoMes: 18,
      bloqueosActivos: 0,
      tieneContactoEmergencia: true,
      contactoEmergenciaNombre: 'María Pérez',
      contactoEmergenciaTelefono: '+56 9 8765 4321',
      contactoEmergenciaRelacion: 'Hermana',
      fechaRegistro: new Date('2024-01-01'),
      activo: true
    },
    {
      id: 2,
      rut: '18.765.432-1',
      nombre: 'María José',
      apellido: 'Silva Ramírez',
      email: 'maria.silva@email.com',
      telefono: '+56 9 8765 4321',
      fotoPerfil: 'https://i.pravatar.cc/300?img=45',
      fechaNacimiento: new Date('1985-08-22'),
      direccion: 'Calle Los Leones 456, Providencia',
      estadoMembresia: MembershipStatus.ACTIVA,
      tipoMembresia: 'Básico',
      fechaInicioMembresia: new Date('2023-06-15'),
      fechaVencimiento: new Date('2026-06-14'),
      sucursalAsignada: 'Providencia',
      ultimoPago: new Date('2025-09-20'),
      deudaPendiente: 0,
      metodoPagoPreferido: 'Débito',
      fechaUltimaActualizacion: new Date('2025-10-01'),
      requiereActualizacion: false,
      ultimoAcceso: new Date('2025-11-10'),
      totalAccesosUltimoMes: 22,
      bloqueosActivos: 0,
      tieneContactoEmergencia: true,
      contactoEmergenciaNombre: 'Pedro Silva',
      contactoEmergenciaTelefono: '+56 9 1111 2222',
      contactoEmergenciaRelacion: 'Esposo',
      fechaRegistro: new Date('2023-06-15'),
      activo: true
    },
    {
      id: 3,
      rut: '20.123.456-7',
      nombre: 'Pedro Antonio',
      apellido: 'Morales Castro',
      email: 'pedro.morales@email.com',
      telefono: '+56 9 2345 6789',
      fotoPerfil: 'https://i.pravatar.cc/300?img=33',
      fechaNacimiento: new Date('1995-03-10'),
      direccion: 'Av. Las Condes 789, Las Condes',
      estadoMembresia: MembershipStatus.SUSPENDIDA,
      tipoMembresia: 'Premium',
      fechaInicioMembresia: new Date('2024-03-01'),
      fechaVencimiento: new Date('2025-02-28'),
      sucursalAsignada: 'Las Condes',
      ultimoPago: new Date('2025-07-15'),
      deudaPendiente: 45000,
      metodoPagoPreferido: 'Transferencia',
      fechaUltimaActualizacion: new Date('2025-10-20'),
      requiereActualizacion: true,
      ultimoAcceso: new Date('2025-10-05'),
      totalAccesosUltimoMes: 8,
      bloqueosActivos: 1,
      tieneContactoEmergencia: true,
      contactoEmergenciaNombre: 'Ana Morales',
      contactoEmergenciaTelefono: '+56 9 3333 4444',
      contactoEmergenciaRelacion: 'Madre',
      fechaRegistro: new Date('2024-03-01'),
      activo: false
    },
    {
      id: 4,
      rut: '16.789.012-3',
      nombre: 'Ana Lucía',
      apellido: 'Fernández Torres',
      email: 'ana.fernandez@email.com',
      telefono: '+56 9 3456 7890',
      fotoPerfil: 'https://i.pravatar.cc/300?img=28',
      fechaNacimiento: new Date('1988-11-30'),
      direccion: 'Pasaje El Bosque 321, Ñuñoa',
      estadoMembresia: MembershipStatus.ACTIVA,
      tipoMembresia: 'VIP',
      fechaInicioMembresia: new Date('2022-01-10'),
      fechaVencimiento: new Date('2027-01-09'),
      sucursalAsignada: 'Ñuñoa',
      ultimoPago: new Date('2025-11-01'),
      deudaPendiente: 0,
      metodoPagoPreferido: 'Tarjeta de Crédito',
      fechaUltimaActualizacion: new Date('2025-09-15'),
      requiereActualizacion: false,
      ultimoAcceso: new Date('2025-11-12'),
      totalAccesosUltimoMes: 25,
      bloqueosActivos: 0,
      tieneContactoEmergencia: true,
      contactoEmergenciaNombre: 'Luis Fernández',
      contactoEmergenciaTelefono: '+56 9 5555 6666',
      contactoEmergenciaRelacion: 'Esposo',
      fechaRegistro: new Date('2022-01-10'),
      activo: true
    },
    {
      id: 5,
      rut: '19.456.789-0',
      nombre: 'Roberto Carlos',
      apellido: 'López Vega',
      email: 'roberto.lopez@email.com',
      telefono: '+56 9 4567 8901',
      fotoPerfil: 'https://i.pravatar.cc/300?img=52',
      fechaNacimiento: new Date('1992-07-18'),
      direccion: 'Calle Esperanza 555, Maipú',
      estadoMembresia: MembershipStatus.SUSPENDIDA,
      tipoMembresia: 'Básico',
      fechaInicioMembresia: new Date('2024-05-20'),
      fechaVencimiento: new Date('2025-05-19'),
      sucursalAsignada: 'Maipú',
      ultimoPago: new Date('2025-08-10'),
      deudaPendiente: 89000,
      metodoPagoPreferido: 'Efectivo',
      fechaUltimaActualizacion: new Date('2025-10-25'),
      requiereActualizacion: true,
      ultimoAcceso: new Date('2025-09-30'),
      totalAccesosUltimoMes: 0,
      bloqueosActivos: 2,
      tieneContactoEmergencia: false,
      fechaRegistro: new Date('2024-05-20'),
      activo: false
    },
    {
      id: 6,
      rut: '21.234.567-8',
      nombre: 'Carolina Andrea',
      apellido: 'Muñoz Soto',
      email: 'carolina.munoz@email.com',
      telefono: '+56 9 5678 9012',
      fotoPerfil: 'https://i.pravatar.cc/300?img=20',
      fechaNacimiento: new Date('1997-02-14'),
      direccion: 'Av. Vicuña Mackenna 888, La Florida',
      estadoMembresia: MembershipStatus.ACTIVA,
      tipoMembresia: 'Premium',
      fechaInicioMembresia: new Date('2023-09-01'),
      fechaVencimiento: new Date('2026-08-31'),
      sucursalAsignada: 'La Florida',
      ultimoPago: new Date('2025-10-25'),
      deudaPendiente: 0,
      metodoPagoPreferido: 'Tarjeta de Débito',
      fechaUltimaActualizacion: new Date('2025-08-10'),
      requiereActualizacion: false,
      ultimoAcceso: new Date('2025-11-11'),
      totalAccesosUltimoMes: 20,
      bloqueosActivos: 0,
      tieneContactoEmergencia: true,
      contactoEmergenciaNombre: 'Daniela Muñoz',
      contactoEmergenciaTelefono: '+56 9 7777 8888',
      contactoEmergenciaRelacion: 'Hermana',
      fechaRegistro: new Date('2023-09-01'),
      activo: true
    }
  ];

  // ===== MEMBER SEARCH & RETRIEVAL =====

  /**
   * Busca miembros por RUT, nombre, email o teléfono
   */
  searchMembers(request: MemberSearchRequest): Observable<MemberSearchResponse> {
    if (this.USE_MOCK_DATA) {
      // Simulación con datos mock
      const query = request.query.toLowerCase().replace(/\./g, '').replace(/-/g, '');
      
      const filteredMembers = this.mockMembers.filter(m => {
        const cleanRut = m.rut.replace(/\./g, '').replace(/-/g, '').toLowerCase();
        return cleanRut.includes(query) ||
               m.nombre.toLowerCase().includes(query) ||
               m.apellido.toLowerCase().includes(query) ||
               m.email.toLowerCase().includes(query) ||
               m.telefono.includes(query);
      });

      const limit = request.limit || 10;
      const offset = request.offset || 0;
      const paginatedMembers = filteredMembers.slice(offset, offset + limit);

      const response: MemberSearchResponse = {
        members: paginatedMembers,
        total: filteredMembers.length
      };

      return of(response).pipe(delay(800)); // Simular latencia de red
    }

    // Llamada real al backend
    let params = new HttpParams()
      .set('query', request.query);
    
    if (request.limit) {
      params = params.set('limit', request.limit.toString());
    }
    if (request.offset) {
      params = params.set('offset', request.offset.toString());
    }

    return this.http.get<MemberSearchResponse>(`${this.API_URL}/members/search`, { params });
  }

  /**
   * Obtiene los detalles completos de un miembro
   */
  getMemberDetails(memberId: number): Observable<Member> {
    if (this.USE_MOCK_DATA) {
      const member = this.mockMembers.find(m => m.id === memberId);
      if (!member) {
        throw new Error('Miembro no encontrado');
      }
      return of(member).pipe(delay(500));
    }

    return this.http.get<Member>(`${this.API_URL}/members/${memberId}`);
  }

  /**
   * Obtiene el historial de acceso de un miembro
   */
  getMemberAccessHistory(memberId: number, limit: number = 10): Observable<AccessHistory[]> {
    if (this.USE_MOCK_DATA) {
      // Mock data para historial de acceso
      const mockHistory: AccessHistory[] = [
        {
          id: 1,
          miembroId: memberId,
          fecha: new Date('2025-11-12'),
          hora: '08:30',
          sucursal: 'Santiago Centro',
          tipo: AccessType.ENTRADA,
          metodoPago: 'Membresía'
        },
        {
          id: 2,
          miembroId: memberId,
          fecha: new Date('2025-11-12'),
          hora: '10:15',
          sucursal: 'Santiago Centro',
          tipo: AccessType.SALIDA
        },
        {
          id: 3,
          miembroId: memberId,
          fecha: new Date('2025-11-11'),
          hora: '18:00',
          sucursal: 'Santiago Centro',
          tipo: AccessType.ENTRADA,
          metodoPago: 'Membresía'
        },
        {
          id: 4,
          miembroId: memberId,
          fecha: new Date('2025-11-11'),
          hora: '19:45',
          sucursal: 'Santiago Centro',
          tipo: AccessType.SALIDA
        }
      ];
      
      return of(mockHistory.slice(0, limit)).pipe(delay(500));
    }

    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<AccessHistory[]>(`${this.API_URL}/members/${memberId}/access-history`, { params });
  }

  // ===== MEMBER UPDATES =====

  /**
   * Solicita actualización de datos al miembro
   */
  requestDataUpdate(memberId: number): Observable<void> {
    if (this.USE_MOCK_DATA) {
      console.log('Mock: Solicitud de actualización enviada al miembro', memberId);
      return of(void 0).pipe(delay(500));
    }

    return this.http.post<void>(`${this.API_URL}/members/${memberId}/request-update`, {});
  }

  /**
   * Congela la membresía de un miembro
   */
  freezeMembership(memberId: number, dias: number, motivo: string): Observable<void> {
    if (this.USE_MOCK_DATA) {
      console.log('Mock: Membresía congelada', { memberId, dias, motivo });
      return of(void 0).pipe(delay(500));
    }

    return this.http.post<void>(`${this.API_URL}/members/${memberId}/freeze`, {
      dias,
      motivo
    });
  }

  // ===== INFRACTIONS =====

  /**
   * Registra una nueva infracción
   */
createInfraction(request: CreateInfractionRequest): Observable<Infraction> {
  if (this.USE_MOCK_DATA) {
    const mockInfraction: Infraction = {
      id: Math.floor(Math.random() * 10000),
      miembroId: request.miembroId,
      tipoInfraccion: request.tipoInfraccion,
      descripcion: request.descripcion,
      fechaSuceso: request.fechaSuceso,  // ✅ AGREGADO
      observaciones: request.observaciones,  // ✅ AGREGADO
      categoria: InfractionCategory.GRAVE,
      registradaPor: 1, // Staff ID mock
      fechaRegistro: new Date(),
      evidenciaUrl: request.evidenciaUrl,
      estado: InfractionStatus.ACTIVA,
      numeroDenuncia: request.numeroDenuncia,
      montoReparacion: request.montoReparacion,
      esSegundaOfensa: request.esSegundaOfensa
    };

    console.log('Mock: Infracción creada', mockInfraction);
    return of(mockInfraction).pipe(delay(1000));
  }

  return this.http.post<Infraction>(`${this.API_URL}/infractions`, request);
}

  /**
   * Obtiene todas las infracciones de un miembro
   */
  getMemberInfractions(memberId: number): Observable<Infraction[]> {
    if (this.USE_MOCK_DATA) {
      return of([]).pipe(delay(500));
    }

    return this.http.get<Infraction[]>(`${this.API_URL}/members/${memberId}/infractions`);
  }

  // ===== BLOCKS =====

  /**
   * Crea un nuevo bloqueo
   */
  createBlock(request: CreateBlockRequest): Observable<Block> {
    if (this.USE_MOCK_DATA) {
      const mockBlock: Block = {
        id: Math.floor(Math.random() * 10000),
        miembroId: request.miembroId,
        infraccionId: request.infraccionId,
        tipoBloqueo: request.tipoBloqueo,
        motivo: request.motivo,
        fechaInicio: new Date(),
        fechaFin: request.diasSuspension 
          ? new Date(Date.now() + request.diasSuspension * 24 * 60 * 60 * 1000)
          : undefined,
        bloqueadoPor: 1, // Staff ID mock
        notas: request.notas,
        estado: BlockStatus.ACTIVO,
        notificacionEnviada: request.notificarMiembro,
        fechaNotificacion: request.notificarMiembro ? new Date() : undefined
      };

      console.log('Mock: Bloqueo creado', mockBlock);
      return of(mockBlock).pipe(delay(1000));
    }

    return this.http.post<Block>(`${this.API_URL}/blocks`, request);
  }

  /**
   * Registra infracción y aplica bloqueo en una sola operación
   */
  createInfractionWithBlock(
  infraction: CreateInfractionRequest,
  block: CreateBlockRequest
): Observable<{ infraction: Infraction; block: Block }> {
  if (this.USE_MOCK_DATA) {
    const mockInfraction: Infraction = {
      id: Math.floor(Math.random() * 10000),
      miembroId: infraction.miembroId,
      tipoInfraccion: infraction.tipoInfraccion,
      descripcion: infraction.descripcion,
      fechaSuceso: infraction.fechaSuceso,  // ✅ AGREGADO
      observaciones: infraction.observaciones,  // ✅ AGREGADO
      categoria: InfractionCategory.GRAVE,
      registradaPor: 1, // Staff ID mock
      fechaRegistro: new Date(),
      evidenciaUrl: infraction.evidenciaUrl,
      estado: InfractionStatus.ACTIVA,
      numeroDenuncia: infraction.numeroDenuncia,
      montoReparacion: infraction.montoReparacion,
      esSegundaOfensa: infraction.esSegundaOfensa
    };

    const mockBlock: Block = {
      id: Math.floor(Math.random() * 10000),
      miembroId: block.miembroId,
      infraccionId: mockInfraction.id,
      tipoBloqueo: block.tipoBloqueo,
      motivo: block.motivo,
      fechaInicio: new Date(),
      fechaFin: block.diasSuspension 
        ? new Date(Date.now() + block.diasSuspension * 24 * 60 * 60 * 1000)
        : undefined,
      bloqueadoPor: 1, // Staff ID mock
      notas: block.notas,
      estado: BlockStatus.ACTIVO,
      notificacionEnviada: block.notificarMiembro,
      fechaNotificacion: block.notificarMiembro ? new Date() : undefined
    };

    console.log('Mock: Infracción y bloqueo creados', { mockInfraction, mockBlock });
    console.log('⚠️ ACCESO FACIAL BLOQUEADO PARA MIEMBRO ID:', block.miembroId);
    
    return of({ infraction: mockInfraction, block: mockBlock }).pipe(delay(1500));
  }

  return this.http.post<{ infraction: Infraction; block: Block }>(
    `${this.API_URL}/infractions/with-block`,
    { infraction, block }
  );
}
  /**
   * Obtiene todos los bloqueos activos de un miembro
   */
  getActiveBlocks(memberId: number): Observable<Block[]> {
    if (this.USE_MOCK_DATA) {
      return of([]).pipe(delay(500));
    }

    return this.http.get<Block[]>(`${this.API_URL}/members/${memberId}/blocks/active`);
  }

  // ===== ACCESS VALIDATION =====

  /**
   * Valida si un miembro puede acceder al gimnasio
   * Esta es la función que llamará el ESP32
   */
  validateAccess(memberId: number, sucursalId: number): Observable<BlockValidationResponse> {
    if (this.USE_MOCK_DATA) {
      const member = this.mockMembers.find(m => m.id === memberId);
      
      const bloqueado = member?.estadoMembresia !== MembershipStatus.ACTIVA || 
                        (member?.bloqueosActivos ?? 0) > 0;
      
      const motivos: string[] = [];
      if (member?.estadoMembresia !== MembershipStatus.ACTIVA) {
        motivos.push(`Membresía ${member?.estadoMembresia}`);
      }
      if ((member?.bloqueosActivos ?? 0) > 0) {
        motivos.push('Tiene bloqueos activos');
      }
      if ((member?.deudaPendiente ?? 0) > 0) {
        motivos.push(`Deuda pendiente: $${member?.deudaPendiente.toLocaleString('es-CL')}`);
      }

      const mockResponse: BlockValidationResponse = {
        bloqueado,
        motivos,
        fechaFinBloqueo: bloqueado && member?.bloqueosActivos 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
          : undefined,
        tipoBloqueo: bloqueado ? BlockType.TEMPORAL : undefined
      };

      return of(mockResponse).pipe(delay(300));
    }

    return this.http.post<BlockValidationResponse>(`${this.API_URL}/access/validate`, {
      memberId,
      sucursalId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Registra un acceso exitoso
   */
  registerAccess(memberId: number, sucursalId: number, tipo: 'ENTRADA' | 'SALIDA'): Observable<void> {
    if (this.USE_MOCK_DATA) {
      console.log('Mock: Acceso registrado', { memberId, sucursalId, tipo });
      return of(void 0).pipe(delay(300));
    }

    return this.http.post<void>(`${this.API_URL}/access/register`, {
      memberId,
      sucursalId,
      tipo,
      timestamp: new Date().toISOString()
    });
  }
}