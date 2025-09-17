import { z } from 'zod';
import { BadRequest } from './httpErrors.js';

export const personaSchema = z.object({
  tipo: z.enum(['SOCIO', 'TRABAJADOR']),
  rut: z.string().trim().min(1).optional().nullable(),
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  email: z.string().email().optional().nullable(),
  telefono: z.string().trim().optional().nullable()
});

export const consentimientoSchema = z.object({
  versionPolitica: z.string().trim().min(1),
  aceptado: z.boolean().refine(v => v === true, 'consentimiento debe ser true'),
  ipOrigen: z.string().trim().optional().nullable()
});

export const enrolRequestSchema = z.object({
  persona: personaSchema,
  consentimiento: consentimientoSchema,
  fuente: z.enum(['KIOSKO', 'TABLET', 'OPERADOR', 'OTRO']),
  sucursalId: z.number().int().positive().optional(),
  deviceId: z.string().trim().optional(),
  embedding: z.object({
    dims: z.number().int().positive(),
    values: z.array(z.number())
  }).optional(),
  livenessScore: z.number().min(0).max(1).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  requestId: z.string().uuid().optional()
});

export function parseOrThrow(schema, payload) {
  const r = schema.safeParse(payload);
  if (!r.success) throw BadRequest('Payload inválido', r.error.format());
  return r.data;
}
