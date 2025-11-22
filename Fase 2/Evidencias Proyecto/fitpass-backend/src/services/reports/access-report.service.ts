// src/services/reports/access-report.service.ts
import {
  PgAccessReportRepository,
  AccessLogReportFilters,
  AccessLogReportRow,
  PersonTypeFilter,
  ResultFilter,
} from '../../repositories/reports/access-report.repository';

export interface AccessLogReportItem {
  id: string;
  date: string; // "16-11-2025"
  time: string; // "14:30"
  fullName: string;
  rut: string;
  personType: 'MEMBER' | 'STAFF' | 'UNKNOWN';
  accessType: 'ENTRY';
  branchId: string;
  branchName: string;
  result: 'GRANTED' | 'DENIED';
  resultLabel: 'Exitoso' | 'Rechazado';
  source: string;
  reason: string | null;
}

export interface AccessLogReportPage {
  content: AccessLogReportItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export class AccessReportService {
  constructor(
    private readonly reportRepo: PgAccessReportRepository,
  ) {}

  public async getAccessLogsPaged(
    filters: AccessLogReportFilters,
  ): Promise<AccessLogReportPage> {
    const page = filters.page ?? 0;
    const size = filters.size ?? 20;

    const { items, total } = await this.reportRepo.findForReport(filters);
    const mapped = items.map((row) => this.mapRowToItem(row));

    const totalPages = size > 0 ? Math.ceil(total / size) : 1;

    return {
      content: mapped,
      page,
      size,
      totalElements: total,
      totalPages,
    };
  }

  public async getRecentAccessLogs(
    branchId: string,
    limit: number,
  ): Promise<{ items: AccessLogReportItem[]; total: number }> {
    const rows = await this.reportRepo.findForReportAll({
      branchId,
      limit,
    });

    const mapped = rows.map((row) => this.mapRowToItem(row));
    return {
      items: mapped,
      total: mapped.length,
    };
  }

  /**
   * Devuelve un CSV para exportar (abre en Excel).
   */
  public async getAccessLogsCsv(
    filters: AccessLogReportFilters,
  ): Promise<string> {
    const rows = await this.reportRepo.findForReportAll(filters);
    const mapped = rows.map((row) => this.mapRowToItem(row));

    const header = [
      'Fecha',
      'Hora',
      'Nombre',
      'RUT',
      'TipoPersona',
      'Acceso',
      'Sucursal',
      'Estado',
      'Motivo',
      'Fuente',
    ].join(';');

    const lines = mapped.map((item) =>
      [
        item.date,
        item.time,
        item.fullName,
        item.rut,
        item.personType,
        item.accessType,
        item.branchName,
        item.resultLabel,
        item.reason ?? '',
        item.source,
      ]
        .map((v) => v.replace(/;/g, ',')) // por si acaso
        .join(';'),
    );

    return [header, ...lines].join('\n');
  }

  private mapRowToItem(row: AccessLogReportRow): AccessLogReportItem {
    const d = row.created_at instanceof Date
      ? row.created_at
      : new Date(row.created_at);

    const date = d.toLocaleDateString('es-CL'); // 16-11-2025
    const time = d.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const resultLabel: 'Exitoso' | 'Rechazado' =
      row.result === 'GRANTED' ? 'Exitoso' : 'Rechazado';

    return {
      id: row.id,
      date,
      time,
      fullName: row.full_name,
      rut: row.rut,
      personType: row.person_type,
      accessType: 'ENTRY',
      branchId: row.branch_id,
      branchName: row.branch_name,
      result: row.result,
      resultLabel,
      source: row.source,
      reason: row.reason,
    };
  }
}
