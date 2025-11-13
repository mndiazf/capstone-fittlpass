import { query } from "../../config/db";


export interface CreateUserInput {
  email: string;
  rut: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  middleName?: string | null;
  phone?: string | null;
  passwordHash: string;
}

export interface UserRow {
  id: string;
  email: string;
  rut: string;
  first_name: string;
  last_name: string;
  second_last_name: string | null;
  middle_name: string | null;
  phone: string | null;
  access_status: string;
  status: string | null;
  password_hash: string;      // 👈 NECESARIO PARA LOGIN
  created_at: Date;
  updated_at: Date;
}

export class PgUserRepository {
  public async findByEmailOrRut(email: string, rut: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      `
      SELECT *
      FROM public.app_user
      WHERE email = $1
         OR rut   = $2
      LIMIT 1
      `,
      [email, rut]
    );

    return result.rows[0] ?? null;
  }

  public async create(input: CreateUserInput): Promise<UserRow> {
    const now = new Date();
    const result = await query<UserRow>(
      `
      INSERT INTO public.app_user (
        id,
        access_status,
        created_at,
        email,
        first_name,
        last_name,
        middle_name,
        password_hash,
        phone,
        rut,
        second_last_name,
        status,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        'NO_ENROLADO',
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        'ACTIVO',
        $10
      )
      RETURNING *
      `,
      [
        now,
        input.email,
        input.firstName,
        input.lastName,
        input.middleName ?? null,
        input.passwordHash,
        input.phone ?? null,
        input.rut,
        input.secondLastName ?? null,
        now,
      ]
    );

    return result.rows[0];
  }
}
