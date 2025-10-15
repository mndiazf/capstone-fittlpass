// src/app/features/checkout/checkout.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function samePassword(group: AbstractControl): ValidationErrors | null {
  const p1 = group.get('password')?.value;
  const p2 = group.get('confirm')?.value;
  return p1 && p2 && p1 !== p2 ? { mismatch: true } : null;
}

interface Membership {
  id: 'anual-multiclub' | 'anual-oneclub' | 'mensual-cargo';
  name: string;
  price: string;
  monthlyPrice: string;
  discount: string;
  features: string[];
}

@Component({
  standalone: true,
  selector: 'app-checkout',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  f: FormGroup;
  paymentForm: FormGroup;
  selectedMembership: Membership | null = null;

  // ⚠️ incluye 'payment' porque el template lo usa
  step: 'register' | 'payment' | 'processing' | 'success' = 'register';
  errorMsg: string | null = null;

  memberships: Record<Membership['id'], Membership> = {
    'anual-multiclub': {
      id: 'anual-multiclub',
      name: 'Plan Anual MultiClub',
      price: '$176.000',
      monthlyPrice: '$14.667',
      discount: '60% OFF',
      features: [
        '1 sesión con Personal Trainer',
        '1 evaluación y programa de entrenamiento',
        'Acceso a todas las sucursales'
      ]
    },
    'anual-oneclub': {
      id: 'anual-oneclub',
      name: 'Plan Anual OneClub',
      price: '$168.000',
      monthlyPrice: '$14.000',
      discount: '60% OFF',
      features: [
        '1 sesión con Personal Trainer',
        '1 evaluación y programa de entrenamiento',
        'Acceso exclusivo a la sucursal donde se contrató'
      ]
    },
    'mensual-cargo': {
      id: 'mensual-cargo',
      name: 'Plan Mensual Cargo Automático',
      price: '$21.000',
      monthlyPrice: '$21.000',
      discount: '40% OFF',
      features: [
        'Congelamiento* (pausar membresía en caso necesario)',
        '1 sesión con Personal Trainer',
        '1 evaluación y programa de entrenamiento',
        'Acceso a todas las sucursales'
      ]
    }
  };

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {
    // Form de registro
    this.f = this.fb.group({
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      secondLastName: [''],
      rut: ['', [Validators.required, Validators.pattern(/^(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?56\s?9(\s?\d){8}$/)]],
      passwordGroup: this.fb.group({
        password: ['', [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/)
        ]],
        confirm: ['', [Validators.required]]
      }, { validators: samePassword })
    });

    // Form de pago (lo usa el template)
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.minLength(16)]],
      cardName: ['', [Validators.required, Validators.minLength(3)]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
    });
  }

  ngOnInit() {
    const membershipId = this.route.snapshot.queryParams['plan'] as Membership['id'];
    if (membershipId && this.memberships[membershipId]) {
      this.selectedMembership = this.memberships[membershipId];
    } else {
      this.router.navigate(['/']);
    }

    // Formato RUT on-type
    this.f.get('rut')?.valueChanges.subscribe(value => {
      if (value) {
        const formatted = this.formatRut(value);
        if (formatted !== value) {
          this.f.get('rut')?.setValue(formatted, { emitEvent: false });
        }
      }
    });

    // Formatos de pago on-type
    this.paymentForm.get('cardNumber')?.valueChanges.subscribe(value => {
      if (value) {
        const formatted = this.formatCardNumber(value);
        if (formatted !== value) {
          this.paymentForm.get('cardNumber')?.setValue(formatted, { emitEvent: false });
        }
      }
    });

    this.paymentForm.get('expiryDate')?.valueChanges.subscribe(value => {
      if (value) {
        const formatted = this.formatExpiryDate(value);
        if (formatted !== value) {
          this.paymentForm.get('expiryDate')?.setValue(formatted, { emitEvent: false });
        }
      }
    });
  }

  // ===== Getters de registro =====
  get firstName() { return this.f.get('firstName'); }
  get lastName() { return this.f.get('lastName'); }
  get rut() { return this.f.get('rut'); }
  get email() { return this.f.get('email'); }
  get phone() { return this.f.get('phone'); }
  get passGroup() { return this.f.get('passwordGroup'); }
  get password() { return this.f.get('passwordGroup.password'); }

  // ===== Getters de pago (los usa el HTML) =====
  get cardNumber() { return this.paymentForm.get('cardNumber'); }
  get cardName() { return this.paymentForm.get('cardName'); }
  get expiryDate() { return this.paymentForm.get('expiryDate'); }
  get cvv() { return this.paymentForm.get('cvv'); }

  /** Mapea id del plan UI al enum del backend */
  private mapMembershipType(id: Membership['id']):
    'MULTICLUB_ANUAL' | 'ONECLUB_ANUAL' | 'ONECLUB_MENSUAL' {
    switch (id) {
      case 'anual-multiclub': return 'MULTICLUB_ANUAL';
      case 'anual-oneclub':   return 'ONECLUB_ANUAL';
      case 'mensual-cargo':   return 'ONECLUB_MENSUAL';
    }
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

  /** Enviar registro -> si OK pasamos a 'payment' (el template lo espera) */
  submit() {
    if (this.f.invalid || !this.selectedMembership) {
      this.f.markAllAsTouched();
      return;
    }
    this.errorMsg = null;

    const payload = {
      firstName: this.firstName?.value,
      middleName: this.f.get('middleName')?.value || null,
      lastName: this.lastName?.value,
      secondLastName: this.f.get('secondLastName')?.value || null,
      email: this.email?.value,
      phone: this.phone?.value,
      rut: (this.rut?.value || '').toString().trim(),
      password: this.password?.value,
      membershipType: this.mapMembershipType(this.selectedMembership.id),
      status: 'active' as const
    };

    this.auth.register(payload).subscribe({
      next: () => {
        // Registro OK: backend devolvió profile+session; pasamos a pago
        this.step = 'payment';
      },
      error: (err) => {
        this.step = 'register';
        this.errorMsg = (err?.error?.message || err?.message || 'Error al registrar').toString();
      }
    });
  }

  /** Enviar pago (simulado) -> processing -> success */
  submitPayment() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.step = 'processing';
    setTimeout(() => {
      this.step = 'success';
      setTimeout(() => this.router.navigate(['/dashboard']), 1200);
    }, 1200);
  }

  /** Botón atrás en el template cuando step === 'payment' */
  goBackToRegister() {
    this.step = 'register';
  }

  /** Compat con (click)="finishCheckout()" del template */
  finishCheckout() {
    if (this.step === 'payment') {
      this.submitPayment();
    } else {
      this.submit();
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
