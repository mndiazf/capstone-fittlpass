// ===== MEMBER MODELS =====

export interface Member {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fotoPerfil: string;
  fechaNacimiento: Date;
  direccion: string;
  
  // Membresía
  estadoMembresia: MembershipStatus;
  tipoMembresia: string;
  fechaInicioMembresia: Date;
  fechaVencimiento: Date;
  sucursalAsignada?: string;
  
  // Pagos
  ultimoPago: Date;
  deudaPendiente: number;
  metodoPagoPreferido?: string;
  
  // Actualización de datos
  fechaUltimaActualizacion: Date;
  requiereActualizacion: boolean;
  
  // Control de acceso
  ultimoAcceso?: Date;
  totalAccesosUltimoMes: number;
  bloqueosActivos: number;
  
  // Contacto de emergencia
  tieneContactoEmergencia: boolean;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaRelacion?: string;
  
  // Metadata
  fechaRegistro: Date;
  activo: boolean;
}

export enum MembershipStatus {
  ACTIVA = 'ACTIVA',
  VENCIDA = 'VENCIDA',
  CONGELADA = 'CONGELADA',
  SUSPENDIDA = 'SUSPENDIDA',
  CANCELADA = 'CANCELADA'
}

export interface AccessHistory {
  id: number;
  miembroId: number;
  fecha: Date;
  hora: string;
  sucursal: string;
  tipo: AccessType;
  metodoPago?: string;
}

export enum AccessType {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA'
}

// ===== INFRACTION MODELS =====

export interface Infraction {
  id: number;
  miembroId: number;
  tipoInfraccion: InfractionType;
  descripcion: string;
  categoria: InfractionCategory;
  registradaPor: number; // staff_id
  fechaRegistro: Date;
  evidenciaUrl?: string;
  estado: InfractionStatus;
  
  // Campos específicos según tipo
  numeroDenuncia?: string;
  montoReparacion?: number;
  esSegundaOfensa?: boolean;
}

export enum InfractionType {
  AGRESION = 'AGRESION',
  SUSTANCIAS = 'SUSTANCIAS',
  ROBO = 'ROBO',
  DANO_EQUIPAMIENTO = 'DANO_EQUIPAMIENTO',
  GRABACION_SIN_CONSENTIMIENTO = 'GRABACION_SIN_CONSENTIMIENTO'
}

export enum InfractionCategory {
  GRAVE = 'GRAVE'
}

export enum InfractionStatus {
  ACTIVA = 'ACTIVA',
  APELADA = 'APELADA',
  RESUELTA = 'RESUELTA',
  CANCELADA = 'CANCELADA'
}

// ===== BLOCK MODELS =====

export interface Block {
  id: number;
  miembroId: number;
  infraccionId?: number; // NULL si es por morosidad
  tipoBloqueo: BlockType;
  motivo: string;
  fechaInicio: Date;
  fechaFin?: Date; // NULL si es permanente
  bloqueadoPor: number; // staff_id
  notas?: string;
  estado: BlockStatus;
  
  // Metadata
  notificacionEnviada: boolean;
  fechaNotificacion?: Date;
}

export enum BlockType {
  TEMPORAL = 'TEMPORAL',
  PERMANENTE = 'PERMANENTE',
  MOROSIDAD = 'MOROSIDAD'
}

export enum BlockStatus {
  ACTIVO = 'ACTIVO',
  CUMPLIDO = 'CUMPLIDO',
  LEVANTADO_ANTICIPADO = 'LEVANTADO_ANTICIPADO'
}

// ===== DTOs FOR API =====

export interface MemberSearchRequest {
  query: string;
  limit?: number;
  offset?: number;
}

export interface MemberSearchResponse {
  members: Member[];
  total: number;
}

// member.models.ts - Actualizar CreateInfractionRequest

export interface CreateInfractionRequest {
  miembroId: number;
  tipoInfraccion: InfractionType;
  descripcion: string;
  fechaSuceso: Date;  // ✅ NUEVO: Fecha cuando ocurrió la infracción
  observaciones?: string;  // ✅ NUEVO: Observaciones adicionales del colaborador
  evidenciaUrl?: string;
  numeroDenuncia?: string;
  montoReparacion?: number;
  esSegundaOfensa?: boolean;
  notificarMiembro: boolean;
}

export interface Infraction {
  id: number;
  miembroId: number;
  tipoInfraccion: InfractionType;
  descripcion: string;
  fechaSuceso: Date;  // ✅ NUEVO
  observaciones?: string;  // ✅ NUEVO
  categoria: InfractionCategory;
  registradaPor: number;
  fechaRegistro: Date;
  evidenciaUrl?: string;
  estado: InfractionStatus;
  numeroDenuncia?: string;
  montoReparacion?: number;
  esSegundaOfensa?: boolean;
}

export interface CreateBlockRequest {
  miembroId: number;
  infraccionId?: number;
  tipoBloqueo: BlockType;
  motivo: string;
  diasSuspension?: number;
  notas?: string;
  notificarMiembro: boolean;
}

export interface BlockValidationResponse {
  bloqueado: boolean;
  motivos: string[];
  fechaFinBloqueo?: Date;
  tipoBloqueo?: BlockType;
}


