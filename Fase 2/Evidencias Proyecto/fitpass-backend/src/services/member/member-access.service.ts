// src/services/member/member-access.service.ts
import {
  AccessLogRow,
  PgAccessLogRepository,
} from '../../repositories/access/access-log.repository';

export class MemberAccessService {
  constructor(
    private readonly accessLogRepo: PgAccessLogRepository,
  ) {}

  /**
   * Devuelve los accesos del usuario en la última semana (7 días).
   */
  public async getLastWeekAccessesForUser(
    userId: string,
  ): Promise<AccessLogRow[]> {
    const DAYS = 7;
    return this.accessLogRepo.findLastDaysByUserId(userId, DAYS);
  }
}
