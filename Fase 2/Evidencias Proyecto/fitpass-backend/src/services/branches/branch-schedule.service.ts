import {
  BranchOpeningHourRow,
  BranchScheduleRepository,
  BranchStatusRow,
  BranchStatusValue,
  WeeklyOpeningHourInput,
} from '../../repositories/branch/branch-schedule.repository';

export interface OpeningHourDto {
  id: string;
  branchId: string;
  dayOfWeek: number;    // 1..7
  openTime: string;     // 'HH:MM' o 'HH:MM:SS'
  closeTime: string;    // idem
}

export interface BranchStatusDto {
  branchId: string;
  status: BranchStatusValue;
  updatedAt: Date;
  reason: string | null;
}

export class BranchScheduleService {
  constructor(private readonly repo: BranchScheduleRepository) {}

  // ========================
  // Horarios de apertura
  // ========================
  async getOpeningHours(branchId: string): Promise<OpeningHourDto[]> {
    const rows: BranchOpeningHourRow[] = await this.repo.getOpeningHours(branchId);

    return rows.map((r) => ({
      id: r.id,
      branchId: r.branch_id,
      dayOfWeek: r.day_of_week,
      openTime: r.open_time,
      closeTime: r.close_time,
    }));
  }

  async saveOpeningHours(
    branchId: string,
    items: OpeningHourDto[]
  ): Promise<OpeningHourDto[]> {
    if (!branchId.trim()) {
      const err: any = new Error('BRANCH_ID_REQUIRED');
      err.status = 400;
      throw err;
    }

    // Validaciones simples de día de semana
    for (const item of items) {
      if (item.dayOfWeek < 1 || item.dayOfWeek > 7) {
        const err: any = new Error('INVALID_DAY_OF_WEEK');
        err.status = 400;
        throw err;
      }
    }

    const input: WeeklyOpeningHourInput[] = items.map((i) => ({
      dayOfWeek: i.dayOfWeek,
      openTime: i.openTime,
      closeTime: i.closeTime,
    }));

    const rows = await this.repo.replaceOpeningHours(branchId, input);

    return rows.map((r) => ({
      id: r.id,
      branchId: r.branch_id,
      dayOfWeek: r.day_of_week,
      openTime: r.open_time,
      closeTime: r.close_time,
    }));
  }

// ========================
// Estado sucursal
// ========================
async getBranchStatus(branchId: string): Promise<BranchStatusDto> {
  // Intentar leer el estado actual
  let row: BranchStatusRow | null = await this.repo.getBranchStatus(branchId);

  // Si no existe, crear uno por defecto (CLOSED)
  if (!row) {
    row = await this.repo.setBranchStatus(branchId, 'CLOSED', null);
  }

  return {
    branchId: row.branch_id,
    status: row.status,
    updatedAt: new Date(row.updated_at),
    reason: row.reason,
  };
}

  async openBranch(branchId: string): Promise<BranchStatusDto> {
    const row = await this.repo.setBranchStatus(branchId, 'OPEN', null);

    return {
      branchId: row.branch_id,
      status: row.status,
      updatedAt: new Date(row.updated_at),
      reason: row.reason,
    };
  }

  async closeBranch(
    branchId: string,
    reason?: string | null
  ): Promise<BranchStatusDto> {
    const row = await this.repo.setBranchStatus(branchId, 'CLOSED', reason ?? null);

    return {
      branchId: row.branch_id,
      status: row.status,
      updatedAt: new Date(row.updated_at),
      reason: row.reason,
    };
  }

  async tempCloseBranch(
    branchId: string,
    reason: string
  ): Promise<BranchStatusDto> {
    if (!reason || !reason.trim()) {
      const err: any = new Error('TEMP_CLOSE_REASON_REQUIRED');
      err.status = 400;
      throw err;
    }

    const row = await this.repo.setBranchStatus(branchId, 'TEMP_CLOSED', reason);

    return {
      branchId: row.branch_id,
      status: row.status,
      updatedAt: new Date(row.updated_at),
      reason: row.reason,
    };
  }
}
