import {
  AccessHistoryRow,
  AppUserAccessRow,
  MemberManagementRepository,
  MemberSearchRow,
  AccessStatus,
} from '../../repositories/members/member-management.repository';

export interface MemberDto {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rut: string;
  telefono: string | null;

  // Membresía
  estadoMembresia: 'ACTIVA' | 'VENCIDA' | 'SIN_MEMBRESIA';
  tipoMembresia: string | null;
  fechaVencimiento: Date | null;
  ultimoPago: Date | null;
  deudaPendiente: number;
  fechaUltimaActualizacion: Date;

  // Accesos
  ultimoAcceso: Date | null;
  totalAccesosUltimoMes: number;
  bloqueosActivos: number;

  // Estado de acceso / bloqueo
  accessStatus: AccessStatus;    // 'NO_ENROLADO' | 'ACTIVO' | 'BLOQUEADO'
  estaBloqueado: boolean;
  motivoBloqueo: string | null;

  // Info para planes que consumen días
  esPlanLimitado: boolean;
  diasOcupados: number | null;
  diasDisponibles: number | null;
  sinDiasDisponibles: boolean;
}

export interface AccessHistoryDto {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  sucursal: string;
  fecha: Date;
  hora: string;
  resultado: 'GRANTED' | 'DENIED'; // status real del acceso
}

export interface AccessStatusDto {
  id: string;
  accessStatus: AccessStatus;
  bloqueado: boolean;
  motivoBloqueo: string | null;
}

const MOTIVO_BLOQUEO_MANUAL =
  'Bloqueo manual desde panel de administración';

export class MemberManagementService {
  constructor(private readonly repo: MemberManagementRepository) {}

  /**
   * Búsqueda de miembros teniendo en cuenta la membresía y sucursal:
   * - MULTICLUB: visible desde cualquier sucursal.
   * - ONECLUB: solo visible si um.branch_id = branchId.
   * - Sin branchId: comportamiento anterior (sin filtro por sucursal).
   */
  public async searchMembers(
    term: string,
    limit: number,
    branchId: string | null,
  ): Promise<MemberDto[]> {
    const trimmed = term.trim();
    if (!trimmed) {
      return [];
    }

    const rows = await this.repo.searchMembersByQuery(trimmed, limit, branchId);
    return rows.map((row) => this.mapRowToMemberDto(row));
  }

  public async getAccessHistory(
    userId: string,
    limit: number
  ): Promise<AccessHistoryDto[]> {
    const rows = await this.repo.getAccessHistoryForMember(userId, limit);
    return rows.map((row) => this.mapAccessRow(row));
  }

  public async blockMember(userId: string): Promise<AccessStatusDto> {
    const updated: AppUserAccessRow | null =
      await this.repo.updateAccessStatus(userId, 'BLOQUEADO');

    if (!updated) {
      const err: any = new Error('USER_NOT_FOUND');
      err.status = 404;
      throw err;
    }

    return {
      id: updated.id,
      accessStatus: updated.access_status,
      bloqueado: true,
      motivoBloqueo: MOTIVO_BLOQUEO_MANUAL,
    };
  }

  public async unblockMember(userId: string): Promise<AccessStatusDto> {
    const updated: AppUserAccessRow | null =
      await this.repo.updateAccessStatus(userId, 'ACTIVO');

    if (!updated) {
      const err: any = new Error('USER_NOT_FOUND');
      err.status = 404;
      throw err;
    }

    return {
      id: updated.id,
      accessStatus: updated.access_status,
      bloqueado: false,
      motivoBloqueo: null,
    };
  }

  // ====== mapeos internos ======

  private mapRowToMemberDto(row: MemberSearchRow): MemberDto {
    const now = new Date();

    // --- Estado de membresía, forzando VENCIDA si end_date ya pasó ---
    let estadoMembresia: 'ACTIVA' | 'VENCIDA' | 'SIN_MEMBRESIA' = 'SIN_MEMBRESIA';

    if (row.membership_status === 'ACTIVE') {
      estadoMembresia = 'ACTIVA';
    } else if (row.membership_status === 'EXPIRED') {
      estadoMembresia = 'VENCIDA';
    }

    const fechaVencimiento = row.membership_end_date
      ? new Date(row.membership_end_date)
      : null;

    if (fechaVencimiento && fechaVencimiento.getTime() < now.getTime()) {
      estadoMembresia = 'VENCIDA';
    }

    const tipoMembresia =
      row.membership_plan_name || row.membership_plan_code || null;

    const ultimoPago = row.last_payment_at
      ? new Date(row.last_payment_at)
      : null;

    const deudaPendiente = Number(row.outstanding_debt || 0);

    const fechaUltimaActualizacion = new Date(row.updated_at);
    const ultimoAcceso = row.last_access_at
      ? new Date(row.last_access_at)
      : null;

    const bloqueosActivos = row.access_status === 'BLOQUEADO' ? 1 : 0;

    const accessStatus: AccessStatus = row.access_status;
    const estaBloqueado = accessStatus === 'BLOQUEADO';
    const motivoBloqueo = estaBloqueado ? MOTIVO_BLOQUEO_MANUAL : null;

    // --- Lógica de planes que consumen días ---
    const isLimited = !!row.membership_is_usage_limited;
    const maxDias = row.membership_max_days_per_period ?? null;
    const usados = isLimited ? (row.membership_used_days ?? 0) : null;

    let diasDisponibles: number | null = null;
    let sinDiasDisponibles = false;

    if (isLimited && maxDias !== null && usados !== null) {
      const restantes = Math.max(maxDias - usados, 0);
      diasDisponibles = restantes;
      sinDiasDisponibles = restantes <= 0 && usados > 0;
    }

    return {
      id: row.id,
      nombre: row.first_name,
      apellido: row.last_name,
      email: row.email,
      rut: row.rut,
      telefono: row.phone,

      estadoMembresia,
      tipoMembresia,
      fechaVencimiento,
      ultimoPago,
      deudaPendiente,
      fechaUltimaActualizacion,

      ultimoAcceso,
      totalAccesosUltimoMes: row.monthly_access_count,
      bloqueosActivos,

      accessStatus,
      estaBloqueado,
      motivoBloqueo,

      esPlanLimitado: isLimited,
      diasOcupados: usados,
      diasDisponibles,
      sinDiasDisponibles,
    };
  }

  private mapAccessRow(row: AccessHistoryRow): AccessHistoryDto {
    const date = new Date(row.created_at);

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const hora = `${hours}:${minutes}`;

    return {
      id: row.id,
      tipo: 'ENTRADA',           // sigues sin flag de salida → todo ENTRADA
      sucursal: row.branch_name,
      fecha: date,
      hora,
      resultado: row.result,     // GRANTED / DENIED
    };
  }
}
