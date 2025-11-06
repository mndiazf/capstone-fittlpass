// presential-sale.interfaces.ts
// Archivo de interfaces y tipos para el módulo de venta presencial

export interface Client {
  id?: number;
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  birthDate: string;
  gender?: 'male' | 'female' | 'other' | string;
  address?: string;
  city?: string;
  region?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalConditions?: string;
  medications?: string;
  injuries?: string;
  membershipStatus?: 'active' | 'expired' | 'paused';
  membershipType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Membership {
  id: string;
  name: string;
  price: number;
  duration: number; // Días
  pricePerDay?: boolean;
  requiresDays?: boolean;
  requiresValidation?: boolean;
  features: string[];
  badge?: string;
  badgeClass?: string;
  description?: string;
  isActive?: boolean;
}

export interface Discount {
  id: string;
  name: string;
  value: number; // Porcentaje
  type?: 'percentage' | 'fixed';
  description: string;
  selected?: boolean;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface PaymentMethod {
  id: 'cash' | 'debit' | 'credit' | 'transfer' | 'other';
  name: string;
  icon: string;
  requiresChange?: boolean;
  requiresReference?: boolean;
  isActive?: boolean;
}

export interface Payment {
  method: PaymentMethod | null;
  total: number;
  amountReceived?: number;
  change?: number;
  referenceNumber?: string;
  lastDigits?: string;
  timestamp?: string;
}

export interface MembershipData {
  type: Membership | null;
  startDate: string;
  endDate: string;
  price: number;
  daysCount?: number;
}

export interface SaleData {
  client: Client | null;
  membership: MembershipData | null;
  payment: Payment | null;
  discounts: Discount[];
  notes?: string;
  branch?: string;
  seller?: string;
}

export interface SaleResponse {
  saleId: number;
  membershipCode: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  qrCode?: string;
}

export interface SearchClientParams {
  searchTerm: string;
  page?: number;
  limit?: number;
}

export interface SearchClientResponse {
  clients: Client[];
  total: number;
  page: number;
  totalPages: number;
}

export type StepType = 
  | 'welcome'
  | 'client-type'
  | 'new-client'
  | 'existing-client'
  | 'membership'
  | 'summary'
  | 'payment'
  | 'success';

export interface FormErrors {
  [key: string]: string;
}

// Constantes
export const MEMBERSHIP_TYPES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMIANNUAL: 'semiannual',
  ANNUAL: 'annual',
  DAILY: 'daily',
  FREE: 'free'
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  DEBIT: 'debit',
  CREDIT: 'credit',
  TRANSFER: 'transfer',
  OTHER: 'other'
} as const;

export const DISCOUNT_TYPES = {
  REFERRAL: 'referral',
  OPENING: 'opening',
  STUDENT: 'student',
  CORPORATE: 'corporate'
} as const;