// src/repositories/branch.repository.ts

import { query } from "../../config/db";

export interface BranchRow {
  id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
}

export const BranchRepository = {
  async findAll(): Promise<BranchRow[]> {
    const { rows } = await query<BranchRow>(
      `
      SELECT
        id,
        code,
        "name" AS name,
        address,
        active
      FROM public.branch
      ORDER BY "name" ASC
      `
    );

    return rows;
  },
};
