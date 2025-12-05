import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable, throwError, timer } from 'rxjs';
import { takeUntil, tap, switchMap, delay, map } from 'rxjs/operators';

import { RutService } from '../../../core/services/rut.service';
import {
  MembershipCatalog,
  MembershipApi,
} from '../../../core/services/membership/membership-catalog';
import {
  AdminCheckoutMembershipInput,
  AdminCheckoutPaymentDTO,
  Checkout,
} from '../../../core/services/checkout/checkout';

// 👇 Importamos Member + MemberManagement
import {
  Member,
  MemberManagement,
} from '../../../core/services/members/member-management';

// ============================================
// TIPOS PARA POS
// ============================================
interface POSTransactionRequest {
  amount: number;
  paymentMethod: 'debit' | 'credit';
  currency: 'CLP';
}

interface POSTransactionResponse {
  success: boolean;
  transactionId: string;
  authorizationCode: string;
  lastFourDigits: string;
  cardType: 'visa' | 'mastercard' | 'amex';
  cardBrand: string;
  amount: number;
  timestamp: string;
  receiptNumber: string;
  terminalId: string;
}

type POSSimulationState =
  | 'idle'
  | 'connecting'
  | 'waiting-card'
  | 'reading-card'
  | 'processing'
  | 'success'
  | 'failed';

interface POSSimulationProgress {
  state: POSSimulationState;
  message: string;
  progress: number;
  icon?: string;
}

// ============================================
// TIPOS DE VENTA / UI
// ============================================

type Step =
  | 'welcome'
  | 'new-client'
  | 'membership'
  | 'summary'
  | 'payment'
  | 'success';

interface Client {
  fullName: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  rut: string;
  email: string;
  phone: string;
}

interface PaymentMethod {
  id: 'debit' | 'credit' | 'free'; // sin efectivo, 'free' sólo para trial
  name: string;
  icon: string;
  requiresChange?: boolean;
  requiresReference?: boolean;
}

/** Membership extendida sólo para la UI */
type MembershipWithUI = MembershipApi & {
  id: string;
  badge?: string;
  badgeClass?: 'badge-popular' | 'badge-best' | 'badge-free' | string;
  pricePerDay?: boolean;
  requiresDays?: boolean;
  features: string[];
};

interface SaleMembershipData {
  type: MembershipWithUI;
  branchId: string | null;
  startDate: string;
  endDate: string;
  price: number;
}

interface SalePaymentData {
  method: PaymentMethod;
  total: number;
  amountReceived?: number;
  change?: number;
  referenceNumber?: string;
  lastDigits?: string;
  authorizationCode?: string;
  cardBrand?: string;
}

interface SaleData {
  client: Client | null;
  membership: SaleMembershipData | null;
  payment: SalePaymentData | null;
}

@Component({
  selector: 'app-presential-sale',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './presential-sale.component.html',
  styleUrls: ['./presential-sale.component.scss'],
})
export class PresentialSaleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 🔁 El flujo parte en CLIENTE
  currentStep: Step = 'new-client';

  // Catálogo
  memberships: MembershipWithUI[] = [];
  selectedMembership: MembershipWithUI | null = null;

  // Info de miembro existente (si se encuentra por RUT)
  existingMember: Member | null = null;

  // Sucursal activa desde JWT en localStorage (venta presencial SIEMPRE en esta sucursal)
  private activeBranchId: string | null = null;

  // Fechas
  today = '';
  startDate = '';
  minStartDate = '';
  maxStartDate = '';
  daysCount = 1;

  // Formulario de cliente NUEVO (único flujo)
  clientForm: FormGroup;
  isSubmitting = false;

  // Flags para membresía gratuita (front)
  showFreeWarning = false;
  canUseFree = true;

  // Métodos de pago (SIN EFECTIVO)
  paymentMethods: PaymentMethod[] = [
    {
      id: 'debit',
      name: 'Tarjeta Débito',
      icon: '💳',
      requiresReference: true,
    },
    {
      id: 'credit',
      name: 'Tarjeta Crédito',
      icon: '💳',
      requiresReference: true,
    },
  ];
  selectedPaymentMethod: PaymentMethod | null = null;
  amountReceived = 0;
  referenceNumber = '';
  lastDigits = '';
  isProcessing = false;

  // Datos de la venta
  saleData: SaleData = {
    client: null,
    membership: null,
    payment: null,
  };

  membershipCode = '';

  // POS SIMULADO
  private posProgressSubject = new Subject<POSSimulationProgress>();
  public posProgress$ = this.posProgressSubject.asObservable();

  posProgress: POSSimulationProgress | null = null;
  posTransactionResponse: POSTransactionResponse | null = null;
  showPOSModal = false;
  posError: string | null = null;

  private posConfig = {
    connectionDelay: 1500,
    cardReadingDelay: 2000,
    processingDelay: 2500,
    successRate: 100, // ya no se usa, pero lo dejamos en 100%
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private rutService: RutService,
    private membershipCatalog: MembershipCatalog,
    private checkoutService: Checkout,
    private memberService: MemberManagement // 👈 nuevo servicio
  ) {
    // SOLO campos que usa el backend presencial
    this.clientForm = this.fb.group({
      firstName: ['', Validators.required],
      secondName: [''],
      lastName: ['', Validators.required],
      secondLastName: [''],
      rut: ['', [Validators.required, this.rutValidator.bind(this)]],
      email: ['', [Validators.required, this.validateEmail]],
      phone: ['', [Validators.required, this.validatePhone]],
    });
  }

  ngOnInit(): void {
    const today = new Date();
    const isoToday = today.toISOString().split('T')[0];
    this.today = isoToday;

    // Rango inicial: hoy → hoy + 30 días
    this.updateStartDateRangeFrom(isoToday);

    this.posProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe((progress) => (this.posProgress = progress));

    this.loadActiveBranchFromSession();
    this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================
  // SESIÓN: sucursal desde localStorage
  // ==========================
  private loadActiveBranchFromSession(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem('fitpass_admin_payload');
      if (!raw) return;

      const payload = JSON.parse(raw);
      if (Array.isArray(payload.branches) && payload.branches.length > 0) {
        this.activeBranchId = payload.branches[0].id ?? null;
      }
    } catch (err) {
      console.error('Error leyendo fitpass_admin_payload', err);
    }
  }

  // ==========================
  // CARGA DE CATÁLOGO
  // ==========================
  private loadCatalog(): void {
    this.membershipCatalog
      .getMemberships()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.memberships = plans.map((m) => {
            const features: string[] = [
              `Duración: ${this.getDurationLabel(m.durationMonths)}`,
              `Alcance: ${this.getScopeLabel(m.scope)}`,
              this.getUsageLabel(
                m.isUsageLimited,
                m.maxDaysPerPeriod,
                m.periodUnit
              ),
            ];

            let badge: string | undefined;
            let badgeClass: MembershipWithUI['badgeClass'] | undefined;

            if (m.code === 'TRIAL_3D_WEEK') {
              badge = 'Prueba';
              badgeClass = 'badge-free';
            } else if (m.scope === 'MULTICLUB') {
              badge = 'Popular';
              badgeClass = 'badge-popular';
            }

            return {
              ...m,
              id: m.code,
              features,
              badge,
              badgeClass,
            };
          });
        },
        error: (err) => {
          console.error('Error cargando catálogo de membresías', err);
        },
      });
  }

  // ==========================
  // HELPERS CATALOGO
  // ==========================
  getDurationLabel(months: number): string {
    if (months === 0) return 'Periodo de prueba';
    if (months === 1) return '1 mes';
    return `${months} meses`;
  }

  getScopeLabel(scope: string): string {
    if (scope === 'MULTICLUB') return 'Multiclub (todas las sedes)';
    if (scope === 'ONECLUB') return 'One Club (una sede)';
    return scope;
  }

  getUsageLabel(
    isUsageLimited: boolean,
    maxDaysPerPeriod: number | null,
    periodUnit: 'WEEK' | 'MONTH' | null
  ): string {
    if (!isUsageLimited) {
      return 'Acceso ilimitado durante la vigencia del plan';
    }
    if (maxDaysPerPeriod && periodUnit === 'WEEK') {
      return `Hasta ${maxDaysPerPeriod} asistencias por semana`;
    }
    if (maxDaysPerPeriod && periodUnit) {
      return `Hasta ${maxDaysPerPeriod} asistencias por período`;
    }
    return 'Uso limitado según condiciones del plan';
  }

  calculateEndDate(): string {
    if (!this.selectedMembership || !this.startDate) return '';
    const start = new Date(this.startDate);

    if (this.selectedMembership.durationMonths > 0) {
      start.setMonth(start.getMonth() + this.selectedMembership.durationMonths);
    } else {
      // Ej: TRIAL corto → 7 días
      start.setDate(start.getDate() + 7);
    }

    return start.toISOString().split('T')[0];
  }

  private getEndDateForSelected(): string {
    return this.calculateEndDate();
  }

  // Actualiza startDate + min/max (hasta 30 días hacia adelante)
  private updateStartDateRangeFrom(baseISO: string): void {
    this.minStartDate = baseISO;
    const baseDate = new Date(baseISO);
    const max = new Date(baseDate);
    max.setDate(max.getDate() + 30);
    this.maxStartDate = max.toISOString().split('T')[0];
    this.startDate = baseISO;
  }

  // ==========================
  // STEP INDICATOR
  // ==========================
  getStepNumber(): number {
    switch (this.currentStep) {
      case 'new-client':
        return 1; // Cliente
      case 'membership':
        return 2; // Producto
      case 'summary':
        return 3; // Resumen
      case 'payment':
      case 'success':
        return 4; // Pago
      default:
        return 1;
    }
  }

  // ==========================
  // NAVEGACIÓN
  // ==========================
  startNewSale(): void {
    this.resetSaleData();
    this.currentStep = 'new-client';
  }

  cancelSale(): void {
    if (
      confirm(
        '¿Estás seguro de cancelar esta venta? Se perderán todos los datos ingresados.'
      )
    ) {
      this.resetSaleData();
      this.currentStep = 'new-client';
      this.router.navigate(['/dashboard']);
    }
  }

  goBack(): void {
    switch (this.currentStep) {
      case 'new-client':
        this.router.navigate(['/dashboard']);
        break;

      case 'membership':
        this.currentStep = 'new-client';
        break;

      case 'summary':
        this.currentStep = 'membership';
        break;

      case 'payment':
        this.currentStep = 'summary';
        break;

      case 'success':
        this.router.navigate(['/dashboard']);
        break;
    }
  }

  private resetSaleData(): void {
    this.saleData = {
      client: null,
      membership: null,
      payment: null,
    };
    this.clientForm.reset();
    this.selectedMembership = null;
    this.selectedPaymentMethod = null;
    this.amountReceived = 0;
    this.referenceNumber = '';
    this.lastDigits = '';
    this.posProgress = null;
    this.posTransactionResponse = null;
    this.posError = null;
    this.membershipCode = '';
    this.daysCount = 1;
    this.existingMember = null;

    // reestablecer rango de fechas desde hoy
    this.updateStartDateRangeFrom(this.today);
  }

  // ==========================
  // SELECCIÓN DE PRODUCTO
  // ==========================
  selectMembership(m: MembershipWithUI): void {
    this.selectedMembership = m;

    if (m.code === 'TRIAL_3D_WEEK') {
      this.showFreeWarning = !this.canUseFree;
    } else {
      this.showFreeWarning = false;
    }
  }

  // ==========================
  // FORMULARIO CLIENTE NUEVO + AUTOCOMPLETE POR RUT
  // ==========================
  onRutInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;
    const oldValue = input.value;

    const formatted = this.rutService.formatRut(oldValue);
    this.clientForm.patchValue({ rut: formatted }, { emitEvent: false });

    const diff = formatted.length - oldValue.length;
    const newPosition = cursorPosition + diff;

    setTimeout(() => {
      input.setSelectionRange(newPosition, newPosition);
    });
  }

  // Cuando termina de escribir el RUT (blur) → buscar miembro y autocompletar
  onRutBlur(): void {
    const control = this.clientForm.get('rut');
    if (!control?.value) return;

    const rutValue = control.value;
    if (!this.rutService.validateRut(rutValue)) {
      return;
    }

    const cleaned = this.rutService.cleanRut
      ? this.rutService.cleanRut(rutValue)
      : rutValue;

    this.memberService
      .searchMembers({ query: cleaned, limit: 1 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp.members && resp.members.length > 0) {
            const member = resp.members[0] as Member;
            this.existingMember = member;
            this.patchFormWithMember(member);
            this.updateStartDateFromMember(member);
          }
        },
        error: (err) => {
          console.error('Error buscando miembro por RUT', err);
        },
      });
  }

  private patchFormWithMember(member: Member): void {
    this.clientForm.patchValue(
      {
        firstName: (member as any).nombre ?? '',
        secondName: (member as any).segundoNombre ?? '',
        lastName: (member as any).apellido ?? '',
        secondLastName: (member as any).segundoApellido ?? '',
        rut: (member as any).rut ?? '',
        email: (member as any).email ?? '',
        phone: (member as any).telefono ?? '',
      },
      { emitEvent: false }
    );
  }

private updateStartDateFromMember(member: Member): void {
  const expiration = (member as any).fechaVencimiento;

  if (expiration) {
    const expirationDate = new Date(expiration);
    const todayDate = new Date(this.today);

    // Normalizamos a medianoche para comparar solo por fecha
    expirationDate.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);

    let baseDate: Date;

    if (expirationDate < todayDate) {
      // 🔴 Membresía vencida → puede partir desde hoy
      baseDate = todayDate;
    } else {
      // 🟢 Membresía vigente → parte el día siguiente al vencimiento
      baseDate = new Date(expirationDate);
      baseDate.setDate(baseDate.getDate() + 1);
    }

    const baseISO = baseDate.toISOString().split('T')[0];
    this.updateStartDateRangeFrom(baseISO);
  } else {
    // Sin fecha de vencimiento → usamos hoy
    this.updateStartDateRangeFrom(this.today);
  }
}


  private rutValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const isValid = this.rutService.validateRut(control.value);
    return isValid ? null : { invalidRUT: true };
  }

  validateEmail(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const pattern =
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!pattern.test(control.value)) return { invalidEmail: true };
    return null;
  }

  validatePhone(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const phone = control.value.replace(/[\s\-()]/g, '');
    const mobilePattern = /^(\+?56)?9\d{8}$/;
    const landlinePattern =
      /^(\+?56)?(2|32|33|34|35|41|42|43|45|51|52|53|55|57|58|61|63|64|65|67|71|72|73|75)\d{7}$/;
    if (!mobilePattern.test(phone) && !landlinePattern.test(phone)) {
      return { invalidPhone: true };
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.clientForm.get(fieldName);
    if (fieldName === 'rut' && field?.value) {
      const rutError = this.rutService.getErrorMessage(field.value);
      if (rutError) return rutError;
    }

    if (field?.hasError('required')) return 'Este campo es requerido';
    if (field?.hasError('invalidEmail')) return 'Formato de email inválido';
    if (field?.hasError('invalidRUT')) return 'RUT inválido';
    if (field?.hasError('invalidPhone')) {
      return 'Formato de teléfono inválido';
    }
    return '';
  }

  private buildFullNameFromForm(): string {
    const v = this.clientForm.value;
    const parts = [
      v.firstName || '',
      v.secondName || '',
      v.lastName || '',
      v.secondLastName || '',
    ].filter((p: string) => p.trim());
    return parts.join(' ');
  }

  submitClientForm(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const v = this.clientForm.value;
    this.saleData.client = {
      fullName: this.buildFullNameFromForm(),
      firstName: v.firstName,
      middleName: v.secondName || null,
      lastName: v.lastName,
      secondLastName: v.secondLastName || null,
      rut: v.rut,
      email: v.email,
      phone: v.phone,
    };

    this.isSubmitting = false;
    // 👇 Luego de cliente, pasamos a selección de producto
    this.currentStep = 'membership';
  }

  // ==========================
  // TOTAL (sin descuentos)
  // ==========================
  calculateMembershipPrice(): number {
    if (!this.selectedMembership) return 0;

    let base = this.selectedMembership.price;

    if (this.selectedMembership.requiresDays) {
      const days = Math.max(1, Math.min(30, this.daysCount || 1));
      base = this.selectedMembership.price * days;
    }

    return base;
  }

  calculateTotal(): number {
    return this.saleData.membership?.price || 0;
  }

  // ==========================
  // MEMBRESÍA → RESUMEN
  // ==========================
  confirmMembership(): void {
    if (!this.selectedMembership) {
      alert('Selecciona un producto (membresía)');
      return;
    }

    if (!this.activeBranchId) {
      alert('No se encontró la sucursal de la sesión (fitpass_admin_payload)');
      return;
    }

    const membershipBranchId =
      this.selectedMembership.scope === 'ONECLUB'
        ? this.activeBranchId
        : null;

    const price = this.calculateMembershipPrice();

    this.saleData.membership = {
      type: this.selectedMembership,
      branchId: membershipBranchId,
      startDate: this.startDate,
      endDate: this.getEndDateForSelected(),
      price,
    };

    this.currentStep = 'summary';
  }

  // ==========================
  // RESUMEN → (PAGO o FREE DIRECTO)
  // ==========================
  proceedToPayment(): void {
    const total = this.calculateTotal();

    if (total === 0 && this.saleData.membership?.type.code === 'TRIAL_3D_WEEK') {
      this.confirmFreeMembership();
      return;
    }

    this.currentStep = 'payment';
  }

  // ==========================
  // PAGO + POS SIMULADO
  // ==========================
  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.amountReceived = 0;
    this.referenceNumber = '';
    this.lastDigits = '';
    this.posProgress = null;
    this.posError = null;
    this.posTransactionResponse = null;

    if (method.id === 'debit' || method.id === 'credit') {
      this.initiatePOSTransaction(method.id);
    }
  }

  calculateChange(): number {
    if (!this.selectedPaymentMethod?.requiresChange) return 0;
    const total = this.calculateTotal();
    return Math.max(0, this.amountReceived - total);
  }

  // 🔥 Enviar datos al backend para registrar membresía + pago (ENDPOINT PRESENCIAL)
  confirmPayment(): void {
    if (!this.selectedPaymentMethod) return;
    if (!this.saleData.client || !this.saleData.membership) {
      alert('Falta información del cliente o de la membresía');
      return;
    }

    if (this.selectedPaymentMethod.requiresChange) {
      if (this.amountReceived < this.calculateTotal()) {
        alert('El monto recibido es menor al total');
        return;
      }
    }

    if (
      (this.selectedPaymentMethod.id === 'debit' ||
        this.selectedPaymentMethod.id === 'credit') &&
      !this.posTransactionResponse
    ) {
      alert('Debe completar la transacción con el POS');
      return;
    }

    if (!this.activeBranchId) {
      alert('No se encontró la sucursal de la sesión (fitpass_admin_payload)');
      return;
    }

    const total = this.calculateTotal();
    const cardLast4 =
      this.posTransactionResponse?.lastFourDigits ||
      this.lastDigits ||
      '0000';

    const membership = this.saleData.membership.type;
    const client = this.saleData.client;

    const paymentDTO: AdminCheckoutPaymentDTO = {
      amount: total,
      currency: 'CLP',
      cardLast4,
    };

    const payload: AdminCheckoutMembershipInput = {
      planCode: membership.code,
      branchId: this.activeBranchId,
      user: {
        rut: client.rut,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        secondLastName: client.secondLastName ?? null,
        middleName: client.middleName ?? null,
        phone: client.phone,
      },
      payment: paymentDTO,
    };

    this.isProcessing = true;

    this.checkoutService
      .checkoutMembershipPresential(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saleData.payment = {
            method: this.selectedPaymentMethod!,
            total,
            amountReceived: this.amountReceived || undefined,
            change: this.calculateChange() || undefined,
            referenceNumber: this.referenceNumber || undefined,
            lastDigits:
              this.posTransactionResponse?.lastFourDigits ||
              this.lastDigits ||
              undefined,
            authorizationCode:
              this.posTransactionResponse?.authorizationCode || undefined,
            cardBrand: this.posTransactionResponse?.cardBrand || undefined,
          };

          this.membershipCode =
            this.saleData.membership?.type.code ?? '';

          this.isProcessing = false;
          this.currentStep = 'success';
        },
        error: (err) => {
          console.error(
            'Error al registrar checkout PRESENCIAL en backend',
            err
          );
          this.isProcessing = false;

          const msg =
            err?.error?.message ||
            err?.message ||
            'Error al procesar la venta en el servidor';
          alert(`❌ ${msg}`);
        },
      });
  }

  // ==========================
  // FLUJO ESPECIAL: MEMBRESÍA GRATUITA (TRIAL_3D_WEEK)
  // ==========================
  private confirmFreeMembership(): void {
    if (!this.saleData.client || !this.saleData.membership) {
      alert('Falta información del cliente o de la membresía');
      return;
    }

    if (!this.activeBranchId) {
      alert('No se encontró la sucursal de la sesión (fitpass_admin_payload)');
      return;
    }

    const total = this.calculateTotal(); // debería ser 0
    const membership = this.saleData.membership.type;
    const client = this.saleData.client;

    const paymentDTO: AdminCheckoutPaymentDTO = {
      amount: total,
      currency: 'CLP',
      cardLast4: 'FREE',
    };

    const payload: AdminCheckoutMembershipInput = {
      planCode: membership.code,
      branchId: this.activeBranchId,
      user: {
        rut: client.rut,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        secondLastName: client.secondLastName ?? null,
        middleName: client.middleName ?? null,
        phone: client.phone,
      },
      payment: paymentDTO,
    };

    this.isProcessing = true;

    this.checkoutService
      .checkoutMembershipPresential(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const freeMethod: PaymentMethod = {
            id: 'free',
            name: 'Trial Gratuito',
            icon: '🎫',
            requiresChange: false,
            requiresReference: false,
          };

          this.saleData.payment = {
            method: freeMethod,
            total,
          };

          this.membershipCode =
            this.saleData.membership?.type.code ?? '';

          this.isProcessing = false;
          this.currentStep = 'success';
        },
        error: (err) => {
          console.error(
            'Error al registrar checkout PRESENCIAL FREE en backend',
            err
          );
          this.isProcessing = false;

          const msg =
            err?.error?.message ||
            err?.message ||
            'Error al procesar la venta en el servidor';
          alert(`❌ ${msg}`);
        },
      });
  }

  // ==========================
  // POS SIMULADO (SIEMPRE ÉXITO)
  // ==========================
  private processTransaction(
    request: POSTransactionRequest
  ): Observable<POSTransactionResponse> {
    return this.simulateConnectionPhase().pipe(
      switchMap(() => this.simulateCardReadingPhase()),
      switchMap(() => this.simulateProcessingPhase(request)),
      map(() => this.generateSuccessResponse(request))
    );
  }

  private simulateConnectionPhase(): Observable<void> {
    this.emitProgress('connecting', 'Conectando con terminal POS...', 10, '🔄');
    return timer(this.posConfig.connectionDelay).pipe(
      tap(() => {
        this.emitProgress('connecting', 'Terminal POS conectado', 30, '✅');
      }),
      map(() => void 0)
    );
  }

  private simulateCardReadingPhase(): Observable<void> {
    this.emitProgress(
      'waiting-card',
      'Esperando inserción de tarjeta...',
      35,
      '💳'
    );

    return timer(800).pipe(
      tap(() => {
        this.emitProgress(
          'reading-card',
          'Leyendo información de la tarjeta...',
          50,
          '📖'
        );
      }),
      delay(this.posConfig.cardReadingDelay),
      tap(() => {
        this.emitProgress(
          'reading-card',
          'Tarjeta leída correctamente',
          65,
          '✅'
        );
      }),
      map(() => void 0)
    );
  }

  // 👇 SIEMPRE ÉXITO (sin random fail)
  private simulateProcessingPhase(
    request: POSTransactionRequest
  ): Observable<void> {
    this.emitProgress(
      'processing',
      'Contactando con el banco emisor...',
      70,
      '🏦'
    );

    return timer(this.posConfig.processingDelay / 2).pipe(
      tap(() => {
        this.emitProgress('processing', 'Verificando fondos...', 80, '💰');
      }),
      delay(this.posConfig.processingDelay / 2),
      tap(() => {
        this.emitProgress('processing', 'Autorizando transacción...', 90, '🔐');
      }),
      delay(500),
      tap(() => {
        this.emitProgress('success', 'Pago aprobado exitosamente', 100, '✅');
      }),
      map(() => void 0)
    );
  }

  private generateSuccessResponse(
    request: POSTransactionRequest
  ): POSTransactionResponse {
    const cardTypes: Array<'visa' | 'mastercard' | 'amex'> = [
      'visa',
      'mastercard',
      'amex',
    ];
    const cardType =
      cardTypes[Math.floor(Math.random() * cardTypes.length)];

    return {
      success: true,
      transactionId: this.generateTransactionId(),
      authorizationCode: this.generateAuthCode(),
      lastFourDigits: this.generateLastFourDigits(),
      cardType,
      cardBrand: this.getCardBrandName(cardType),
      amount: request.amount,
      timestamp: new Date().toISOString(),
      receiptNumber: this.generateReceiptNumber(),
      terminalId: this.generateTerminalId(),
    };
  }

  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `TXN${timestamp}${random}`;
  }

  private generateAuthCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateLastFourDigits(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private generateReceiptNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(10000 + Math.random() * 90000).toString();
    return `${dateStr}${random}`;
  }

  private generateTerminalId(): string {
    const prefix = 'POS';
    const number = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${number}`;
  }

  private getCardBrandName(cardType: string): string {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
    };
    return brands[cardType] || 'Desconocida';
  }

  private emitProgress(
    state: POSSimulationState,
    message: string,
    progress: number,
    icon?: string
  ): void {
    this.posProgressSubject.next({ state, message, progress, icon });
  }

  initiatePOSTransaction(paymentType: 'debit' | 'credit'): void {
    const request: POSTransactionRequest = {
      amount: this.calculateTotal(),
      paymentMethod: paymentType,
      currency: 'CLP',
    };

    this.showPOSModal = true;
    this.isProcessing = true;
    this.posError = null;

    this.processTransaction(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.posTransactionResponse = response;
          this.referenceNumber = response.receiptNumber;
          this.lastDigits = response.lastFourDigits;
          this.isProcessing = false;
          setTimeout(() => {
            this.showPOSModal = false;
          }, 2000);
        },
        error: (error) => {
          // En teoría no debería ocurrir con la simulación siempre exitosa,
          // pero dejamos el manejo por si acaso.
          this.posError =
            error.message || 'Error desconocido en la transacción';
          this.isProcessing = false;
          setTimeout(() => {
            this.showPOSModal = false;
            this.posError = null;
          }, 4000);
        },
      });
  }

  cancelPOSTransaction(): void {
    this.showPOSModal = false;
    this.isProcessing = false;
    this.posProgress = null;
    this.selectedPaymentMethod = null;
    this.emitProgress('idle', '', 0);
  }

  retryPOSTransaction(): void {
    if (this.selectedPaymentMethod) {
      this.initiatePOSTransaction(
        this.selectedPaymentMethod.id as 'debit' | 'credit'
      );
    }
  }

  // ==========================
  // PANTALLA FINAL
  // ==========================
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
