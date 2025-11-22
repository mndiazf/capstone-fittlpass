import { randomUUID } from 'crypto';
import { query } from '../../config/db';

export type BranchStatusValue = 'OPEN' | 'CLOSED' | 'TEMP_CLOSED';

export interface BranchOpeningHourRow {
  id: string;
  branch_id: string;
  day_of_week: number;   // 1 = lunes ... 7 = domingo
  open_time: string;     // 'HH:MM:SS'
  close_time: string;    // 'HH:MM:SS'
}

export interface BranchStatusRow {
  branch_id: string;
  status: BranchStatusValue;
  updated_at: string;
  reason: string | null;
}

export interface WeeklyOpeningHourInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface BranchScheduleRepository {
  getOpeningHours(branchId: string): Promise<BranchOpeningHourRow[]>;
  replaceOpeningHours(
    branchId: string,
    items: WeeklyOpeningHourInput[]
  ): Promise<BranchOpeningHourRow[]>;

  getBranchStatus(branchId: string): Promise<BranchStatusRow | null>;
  setBranchStatus(
    branchId: string,
    status: BranchStatusValue,
    reason?: string | null
  ): Promise<BranchStatusRow>;
}

export class PgBranchScheduleRepository implements BranchScheduleRepository {
  async getOpeningHours(branchId: string): Promise<BranchOpeningHourRow[]> {
    const result = await query<BranchOpeningHourRow>(
      `
      SELECT
        id,
        branch_id,
        day_of_week,
        open_time,
        close_time
      FROM public.branch_opening_hours
      WHERE branch_id = $1
      ORDER BY day_of_week ASC;
      `,
      [branchId]
    );

    return result.rows;
  }

  async replaceOpeningHours(
    branchId: string,
    items: WeeklyOpeningHourInput[]
  ): Promise<BranchOpeningHourRow[]> {
    // Borramos todos los horarios actuales de la sucursal
    await query(
      `
      DELETE FROM public.branch_opening_hours
      WHERE branch_id = $1;
      `,
      [branchId]
    );

    if (items.length === 0) {
      return [];
    }

    const values: unknown[] = [];
    const chunks: string[] = [];

    items.forEach((item, index) => {
      const id = randomUUID();
      const base = index * 5; // ✅ 5 columnas

      chunks.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
      );

      values.push(
        id,               // id
        branchId,         // branch_id
        item.dayOfWeek,   // day_of_week
        item.openTime,    // open_time
        item.closeTime    // close_time
      );
    });

    const result = await query<BranchOpeningHourRow>(
      `
      INSERT INTO public.branch_opening_hours (
        id,
        branch_id,
        day_of_week,
        open_time,
        close_time
      )
      VALUES
        ${chunks.join(', ')}
      RETURNING
        id,
        branch_id,
        day_of_week,
        open_time,
        close_time;
      `,
      values
    );

    return result.rows;
  }

  async getBranchStatus(branchId: string): Promise<BranchStatusRow | null> {
    const result = await query<BranchStatusRow>(
      `
      SELECT
        branch_id,
        status,
        updated_at,
        reason
      FROM public.branch_status
      WHERE branch_id = $1;
      `,
      [branchId]
    );

    return result.rows[0] ?? null;
  }

  async setBranchStatus(
    branchId: string,
    status: BranchStatusValue,
    reason?: string | null
  ): Promise<BranchStatusRow> {
    const result = await query<BranchStatusRow>(
      `
      INSERT INTO public.branch_status (
        branch_id,
        status,
        updated_at,
        reason
      )
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (branch_id) DO UPDATE
      SET status     = EXCLUDED.status,
          updated_at = NOW(),
          reason     = EXCLUDED.reason
      RETURNING
        branch_id,
        status,
        updated_at,
        reason;
      `,
      [branchId, status, reason ?? null]
    );

    return result.rows[0];
  }
}
