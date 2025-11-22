// src/app/core/services/checkout.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** ============================
 * CONFIG
 * ============================ */
const API_CHECKOUT = 'http://localhost:3000/api/checkout';

/** ============================
 * TIPOS DEL CHECKOUT (ADMIN PRESENCIAL)
 * ============================ */

/**
 * Datos que el ADMIN ingresa en la venta presencial.
 * 👇 OJO: aquí **no** va la contraseña, se genera en el backend.
 */
export interface AdminCheckoutUserInput {
  rut: string;
  email: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  middleName?: string | null;
  phone: string;
}

/**
 * Pago que viaja al backend:
 * - amount: total a pagar
 * - currency: 'CLP'
 * - cardLast4: últimos 4 dígitos o 'CASH'
 */
export interface AdminCheckoutPaymentDTO {
  amount: number;
  currency: string;
  cardLast4: string;
}

/**
 * Payload que viaja al endpoint PRESENCIAL.
 * branchId: SIEMPRE la sucursal donde se está haciendo la venta.
 */
export interface AdminCheckoutMembershipInput {
  planCode: string;        // ej: "MULTICLUB_ANUAL" o "ONECLUB_ANUAL"
  branchId: string;        // sucursal de la venta presencial (obtenida del JWT/admin)
  user: AdminCheckoutUserInput;
  payment: AdminCheckoutPaymentDTO;
}

/** Respuesta del backend en venta presencial:
 *  POST /api/checkout/memberships/presencial
 */
export interface PresentialCheckoutResponse {
  message: string;
  userId: string;
  membershipId: string;
  paymentId: string;
}

/** (Si quieres seguir usando el token online en otra parte, lo dejamos) */
export interface CheckoutResponse {
  token: string;
  tokenType: string;
}

/** ============================
 * SERVICIO CHECKOUT (ADMIN PRESENCIAL)
 * ============================ */
@Injectable({
  providedIn: 'root',
})
export class Checkout {
  private http = inject(HttpClient);

  /**
   * Venta PRESENCIAL de membresía:
   * - El componente le pasa los datos SIN contraseña.
   * - El backend genera la contraseña temporal, crea usuario/membresía/pago
   *   y envía el correo de bienvenida + contraseña de forma asíncrona.
   */
  checkoutMembershipPresential(
    input: AdminCheckoutMembershipInput
  ): Observable<PresentialCheckoutResponse> {
    return this.http.post<PresentialCheckoutResponse>(
      `${API_CHECKOUT}/memberships/presencial`,
      input
    );
  }

}
