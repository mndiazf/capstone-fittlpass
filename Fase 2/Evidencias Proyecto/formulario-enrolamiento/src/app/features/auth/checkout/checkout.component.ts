// src/app/features/auth/checkout/checkout.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AuthService,
  CheckoutMembershipPayload,
} from '../../../core/services/auth.service';
import {
  MembershipApi,
  MembershipCatalog,
  BranchApi,
} from '../../../core/services/membership-catalog';

function samePassword(group: AbstractControl): ValidationErrors | null {
  const p1 = group.get('password')?.value;
  const p2 = group.get('confirm')?.value;
  return p1 && p2 && p1 !== p2 ? { mismatch: true } : null;
}

interface BranchVM {
  id: string;
  code: string;
  name: string;
  address: string;
}

interface MembershipVM {
  code: string; // ej: "MULTICLUB_ANUAL"
  name: string;
  description: string;
  price: string; // formateado CLP
  rawPrice: number; // monto numérico para el payload
  durationLabel: string; // "6 meses", "Periodo de prueba"
  scopeLabel: string; // "Multiclub (todas las sedes)"
  usageLabel: string; // "Hasta 5 asistencias por semana..."
  scope: string; // "MULTICLUB" | "ONECLUB" | ...
  features: string[]; // lista para el resumen
}

@Component({
  standalone: true,
  selector: 'app-checkout',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  f: FormGroup;
  paymentForm: FormGroup;
  selectedMembership: MembershipVM | null = null;

  step: 'register' | 'payment' | 'processing' | 'success' = 'register';
  errorMsg: string | null = null;

  branches: BranchVM[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private membershipCatalog: MembershipCatalog,
  ) {
    // Form de registro
    this.f = this.fb.group({
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      secondLastName: [''],
      rut: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^\+?56\s?9(\s?\d){8}$/)],
      ],
      passwordGroup: this.fb.group(
        {
          password: [
            '',
            [
              Validators.required,
              Validators.minLength(8),
              Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/),
            ],
          ],
          confirm: ['', [Validators.required]],
        },
        { validators: samePassword },
      ),
      branchId: new FormControl<string | null>(null),
    });

    // Form de pago
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.minLength(16)]],
      cardName: ['', [Validators.required, Validators.minLength(3)]],
      expiryDate: [
        '',
        [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)],
      ],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    });
  }

  ngOnInit() {
    const membershipCode = this.route.snapshot.queryParams['plan'] as
      | string
      | undefined;

    if (!membershipCode) {
      this.router.navigate(['/']);
      return;
    }

    // Cargar catálogo y buscar el plan por code
    this.membershipCatalog.getMemberships().subscribe({
      next: (data: MembershipApi[]) => {
        const api = data.find((m) => m.code === membershipCode);
        if (!api) {
          this.router.navigate(['/']);
          return;
        }

        this.selectedMembership = this.mapApiToVM(api);
        this.applyBranchValidator();
        this.loadBranches(); // ahora cargamos sucursales desde el endpoint
      },
      error: (err) => {
        console.error('Error cargando membresía seleccionada', err);
        this.router.navigate(['/']);
      },
    });

    // Formato RUT on-type
    this.f
      .get('rut')
      ?.valueChanges.subscribe((value) => {
        if (value) {
          const formatted = this.formatRut(value);
          if (formatted !== value) {
            this.f.get('rut')?.setValue(formatted, { emitEvent: false });
          }
        }
      });

    // Formatos de pago on-type
    this.paymentForm
      .get('cardNumber')
      ?.valueChanges.subscribe((value) => {
        if (value) {
          const formatted = this.formatCardNumber(value);
          if (formatted !== value) {
            this.paymentForm
              .get('cardNumber')
              ?.setValue(formatted, { emitEvent: false });
          }
        }
      });

    this.paymentForm
      .get('expiryDate')
      ?.valueChanges.subscribe((value) => {
        if (value) {
          const formatted = this.formatExpiryDate(value);
          if (formatted !== value) {
            this.paymentForm
              .get('expiryDate')
              ?.setValue(formatted, { emitEvent: false });
          }
        }
      });
  }

  // ====== Branches desde endpoint ======
  private loadBranches() {
    this.membershipCatalog.getBranches().subscribe({
      next: (data: BranchApi[]) => {
        this.branches = data
          .filter((b) => b.active)
          .map<BranchVM>((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            address: b.address,
          }));
      },
      error: (err) => {
        console.error('Error cargando sucursales', err);
      },
    });
  }

  // ===== Getters de registro =====
  get firstName() {
    return this.f.get('firstName');
  }
  get lastName() {
    return this.f.get('lastName');
  }
  get rut() {
    return this.f.get('rut');
  }
  get email() {
    return this.f.get('email');
  }
  get phone() {
    return this.f.get('phone');
  }
  get passGroup() {
    return this.f.get('passwordGroup');
  }
  get password() {
    return this.f.get('passwordGroup.password');
  }
  get branchId() {
    return this.f.get('branchId');
  }

  // ===== Getters de pago =====
  get cardNumber() {
    return this.paymentForm.get('cardNumber');
  }
  get cardName() {
    return this.paymentForm.get('cardName');
  }
  get expiryDate() {
    return this.paymentForm.get('expiryDate');
  }
  get cvv() {
    return this.paymentForm.get('cvv');
  }

  /** ¿El plan seleccionado es tipo ONECLUB según el scope del backend? */
  get isOneClubSelected(): boolean {
    return !!this.selectedMembership && this.selectedMembership.scope === 'ONECLUB';
  }

  /** Nombre de sucursal por id */
  branchName(id?: string | null): string {
    if (!id) return 'Selecciona una';
    const b = this.branches.find((x) => x.id === id);
    return b ? b.name : '—';
  }

  /** Aplica validación requerida de branchId solo cuando el plan es ONECLUB */
  private applyBranchValidator(): void {
    const ctrl = this.branchId!;
    if (this.isOneClubSelected) {
      ctrl.addValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue(null, { emitEvent: false });
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  /** Mapear DTO del backend a ViewModel para el checkout */
  private mapApiToVM(api: MembershipApi): MembershipVM {
    const durationLabel = this.getDurationLabel(api.durationMonths);
    const scopeLabel = this.getScopeLabel(api.scope);
    const usageLabel = this.getUsageLabel(
      api.isUsageLimited,
      api.maxDaysPerPeriod,
      api.periodUnit,
    );

    const features: string[] = [
      api.description,
      `Duración: ${durationLabel}`,
      `Alcance: ${scopeLabel}`,
      usageLabel,
    ];

    return {
      code: api.code,
      name: api.name,
      description: api.description,
      price: this.formatCLP(api.price),
      rawPrice: api.price,
      durationLabel,
      scopeLabel,
      usageLabel,
      scope: api.scope,
      features,
    };
  }

  private getDurationLabel(months: number): string {
    if (months === 0) return 'Periodo de prueba';
    if (months === 1) return '1 mes';
    return `${months} meses`;
  }

  private getScopeLabel(scope: string): string {
    if (scope === 'MULTICLUB') return 'Multiclub (todas las sedes)';
    if (scope === 'ONECLUB') return 'One Club (una sede)';
    return scope;
  }

  private getUsageLabel(
    isUsageLimited: boolean,
    maxDaysPerPeriod: number | null,
    periodUnit: 'WEEK' | 'MONTH' | null,
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

  private formatCLP(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  /** Normaliza/da formato aa.aaa.aaa-d */
  formatRut(value: string): string {
    const clean = value.replace(/[^0-9kK]/g, '');
    if (!clean) return '';
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedBody}-${dv}`;
  }

  private formatCardNumber(value: string): string {
    const clean = value.replace(/\D/g, '').slice(0, 16);
    const groups = clean.match(/.{1,4}/g);
    return groups ? groups.join(' ') : clean;
  }

  private formatExpiryDate(value: string): string {
    const clean = value.replace(/\D/g, '');
    if (clean.length >= 2) {
      return clean.slice(0, 2) + '/' + clean.slice(2, 4);
    }
    return clean;
  }

  /** STEP 1: Solo valida registro y pasa a 'payment' */
  submit() {
    if (!this.selectedMembership) {
      this.errorMsg = 'Selecciona un plan válido.';
      return;
    }

    // ONECLUB: asegurar sucursal válida
    if (this.isOneClubSelected) {
      const raw = this.branchId?.value;
      const normalized =
        raw && String(raw).trim().length > 0 ? String(raw) : null;
      if (!normalized) {
        this.branchId?.markAsTouched();
        this.errorMsg = 'Debes seleccionar una sucursal para planes ONECLUB.';
        return;
      }
      this.branchId?.setValue(normalized, { emitEvent: false });
    }

    if (this.f.invalid) {
      this.f.markAllAsTouched();
      return;
    }

    this.errorMsg = null;
    this.step = 'payment';
  }

  /** STEP 2: Construye el payload y llama al checkout → JWT + dashboard */
  submitPayment() {
    if (!this.selectedMembership) {
      this.errorMsg = 'Selecciona un plan válido.';
      return;
    }

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    // cardLast4 desde el número de tarjeta
    const cleanCard = (this.cardNumber?.value || '')
      .toString()
      .replace(/\D/g, '');
    const cardLast4 = cleanCard.slice(-4) || '';

    // branchId:
    // - ONECLUB → obligatorio
    // - MULTICLUB → siempre null
    let branchIdVal: string | null = null;
    if (this.isOneClubSelected) {
      const raw = this.branchId?.value;
      const normalized =
        raw && String(raw).trim().length > 0 ? String(raw) : null;
      if (!normalized) {
        this.branchId?.markAsTouched();
        this.errorMsg = 'Debes seleccionar una sucursal para planes ONECLUB.';
        return;
      }
      branchIdVal = normalized;
    } else {
      branchIdVal = null; // MULTICLUB online → sin sucursal asociada
    }

    const membership = this.selectedMembership;

    const payload: CheckoutMembershipPayload = {
      planCode: membership.code,
      branchId: branchIdVal, // 👈 siempre se manda: string o null
      user: {
        rut: (this.rut?.value || '').toString().trim(),
        email: (this.email?.value || '').toString().trim(),
        firstName: (this.firstName?.value || '').toString().trim(),
        lastName: (this.lastName?.value || '').toString().trim(),
        secondLastName: this.f.get('secondLastName')?.value || null,
        middleName: this.f.get('middleName')?.value || null,
        phone: (this.phone?.value || '').toString().trim(),
        password: (this.password?.value || '').toString(),
      },
      payment: {
        amount: membership.rawPrice,
        currency: 'CLP',
        cardLast4,
      },
    };

    this.errorMsg = null;
    this.step = 'processing';

    this.auth.checkoutMembership(payload).subscribe({
      next: () => {
        // AuthService ya guardó token + perfil desde el JWT
        localStorage.setItem('userFirstLogin', 'true');
        this.step = 'success';

        // Redirección automática al dashboard
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: (err) => {
        console.error('Error en checkout de membresía', err);
        this.step = 'payment';
        this.errorMsg = (
          err?.error?.message ||
          err?.message ||
          'Error al procesar el pago'
        ).toString();
      },
    });
  }

  /** Botón atrás cuando step === 'payment' */
  goBackToRegister() {
    this.step = 'register';
  }

  /** Compat con (click)="finishCheckout()" en la vista de éxito */
  finishCheckout() {
    this.router.navigate(['/dashboard']);
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
