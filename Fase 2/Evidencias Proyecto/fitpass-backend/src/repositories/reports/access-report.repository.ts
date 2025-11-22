// src/repositories/reports/access-report.repository.ts
import { query } from '../../config/db';

export type PersonTypeFilter = 'all' | 'member' | 'staff';
export type ResultFilter = 'ALL' | 'GRANTED' | 'DENIED';

export interface AccessLogReportRow {
  id: string;
  created_at: Date;
  full_name: string;
  rut: string;
  person_type: 'MEMBER' | 'STAFF' | 'UNKNOWN';
  branch_id: string;
  branch_name: string;
  result: 'GRANTED' | 'DENIED';
  source: string;
  reason: string | null;
  total_rows?: number; // viene del COUNT(*) OVER()
}

export interface AccessLogReportFilters {
  branchId: string;
  from?: Date;
  to?: Date;
  personType?: PersonTypeFilter;
  result?: ResultFilter;
  page?: number;
  size?: number;
  limit?: number;  // para "recent"
  offset?: number; // para "recent"
}

export class PgAccessReportRepository {
  /**
   * Busca accesos con filtros + paginación.
   * Devuelve filas con COUNT(*) OVER() para saber el total.
   */
  public async findForReport(
    filters: AccessLogReportFilters,
  ): Promise<{ items: AccessLogReportRow[]; total: number }> {
    const {
      branchId,
      from,
      to,
      personType = 'all',
      result = 'ALL',
      page = 0,
      size = 20,
    } = filters;

    const conditions: string[] = ['al.branch_id = $1'];
    const params: unknown[] = [branchId];
    let idx = 2;

    if (from) {
      conditions.push(`al.created_at >= $${idx}`);
      params.push(from);
      idx++;
    }

    if (to) {
      conditions.push(`al.created_at <= $${idx}`);
      params.push(to);
      idx++;
    }

    if (result && result !== 'ALL') {
      conditions.push(`al.result = $${idx}`);
      params.push(result);
      idx++;
    }

    // Filtro por tipo de persona
    if (personType === 'member') {
      conditions.push(`um.id IS NOT NULL`);
    } else if (personType === 'staff') {
      conditions.push(`um.id IS NULL AND aup.id IS NOT NULL`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limitIndex = idx;
    const offsetIndex = idx + 1;
    params.push(size);
    params.push(page * size);

    const sql = `
      SELECT
        al.id,
        al.created_at,
        (
          u.first_name ||
          CASE
            WHEN u.middle_name IS NOT NULL AND u.middle_name <> ''
              THEN ' ' || u.middle_name
            ELSE ''
          END ||
          ' ' || u.last_name ||
          CASE
            WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> ''
              THEN ' ' || u.second_last_name
            ELSE ''
          END
        ) AS full_name,
        u.rut,
        CASE
          WHEN um.id IS NOT NULL THEN 'MEMBER'
          WHEN aup.id IS NOT NULL THEN 'STAFF'
          ELSE 'UNKNOWN'
        END AS person_type,
        b.id AS branch_id,
        b.name AS branch_name,
        al.result,
        al.source,
        al.reason,
        COUNT(*) OVER() AS total_rows
      FROM public.access_log al
      JOIN public.app_user u ON u.id = al.user_id
      JOIN public.branch b ON b.id = al.branch_id
      LEFT JOIN public.user_membership um
        ON um.user_id = u.id
       AND um.status = 'ACTIVE'
       AND um.start_date <= al.created_at::date
       AND um.end_date   >= al.created_at::date
      LEFT JOIN public.app_user_profile aup
        ON aup.user_id  = u.id
       AND aup.branch_id = al.branch_id
       AND aup.active = true
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const resultQuery = await query<AccessLogReportRow>(sql, params);
    const rows = resultQuery.rows;

    const total = rows.length > 0 ? Number(rows[0].total_rows ?? 0) : 0;

    return {
      items: rows,
      total,
    };
  }

  /**
   * Versión sin paginación (para exportar o "recent").
   * Si llega limit, se aplica LIMIT.
   */
  public async findForReportAll(
    filters: AccessLogReportFilters,
  ): Promise<AccessLogReportRow[]> {
    const {
      branchId,
      from,
      to,
      personType = 'all',
      result = 'ALL',
      limit,
      offset = 0,
    } = filters;

    const conditions: string[] = ['al.branch_id = $1'];
    const params: unknown[] = [branchId];
    let idx = 2;

    if (from) {
      conditions.push(`al.created_at >= $${idx}`);
      params.push(from);
      idx++;
    }

    if (to) {
      conditions.push(`al.created_at <= $${idx}`);
      params.push(to);
      idx++;
    }

    if (result && result !== 'ALL') {
      conditions.push(`al.result = $${idx}`);
      params.push(result);
      idx++;
    }

    if (personType === 'member') {
      conditions.push(`um.id IS NOT NULL`);
    } else if (personType === 'staff') {
      conditions.push(`um.id IS NULL AND aup.id IS NOT NULL`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let limitClause = '';
    if (typeof limit === 'number' && limit > 0) {
      const limitIndex = idx;
      const offsetIndex = idx + 1;
      params.push(limit);
      params.push(offset);
      limitClause = `LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
    }

    const sql = `
      SELECT
        al.id,
        al.created_at,
        (
          u.first_name ||
          CASE
            WHEN u.middle_name IS NOT NULL AND u.middle_name <> ''
              THEN ' ' || u.middle_name
            ELSE ''
          END ||
          ' ' || u.last_name ||
          CASE
            WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> ''
              THEN ' ' || u.second_last_name
            ELSE ''
          END
        ) AS full_name,
        u.rut,
        CASE
          WHEN um.id IS NOT NULL THEN 'MEMBER'
          WHEN aup.id IS NOT NULL THEN 'STAFF'
          ELSE 'UNKNOWN'
        END AS person_type,
        b.id AS branch_id,
        b.name AS branch_name,
        al.result,
        al.source,
        al.reason
      FROM public.access_log al
      JOIN public.app_user u ON u.id = al.user_id
      JOIN public.branch b ON b.id = al.branch_id
      LEFT JOIN public.user_membership um
        ON um.user_id = u.id
       AND um.status = 'ACTIVE'
       AND um.start_date <= al.created_at::date
       AND um.end_date   >= al.created_at::date
      LEFT JOIN public.app_user_profile aup
        ON aup.user_id  = u.id
       AND aup.branch_id = al.branch_id
       AND aup.active = true
      ${where}
      ORDER BY al.created_at DESC
      ${limitClause};
    `;

    const resultQuery = await query<AccessLogReportRow>(sql, params);
    return resultQuery.rows;
  }
}
