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
import { AuthService, UserProfile } from '../../../core/services/auth.service';

function samePassword(group: AbstractControl): ValidationErrors | null {
  const p1 = group.get('password')?.value;
  const p2 = group.get('confirm')?.value;
  return p1 && p2 && p1 !== p2 ? { mismatch: true } : null;
}

interface Membership {
  id: string;
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
  step: 'register' | 'payment' | 'processing' | 'success' = 'register';
  registrationData: any = null;

  memberships: { [key: string]: Membership } = {
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
    this.f = this.fb.group({
      firstName: ['', [Validators.required]],
      middleName: [''],
      lastName: ['', [Validators.required]],
      secondLastName: [''],
      rut: ['', [
        Validators.required,
        Validators.pattern(/^(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^\+?56\s?9(\s?\d){8}$/)
      ]],
      passwordGroup: this.fb.group({
        password: ['', [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]+$/)
        ]],
        confirm: ['', [Validators.required]]
      }, { validators: samePassword })
    });

    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.minLength(16)]],
      cardName: ['', [Validators.required, Validators.minLength(3)]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
    });
  }

  ngOnInit() {
    const membershipId = this.route.snapshot.queryParams['plan'];
    if (membershipId && this.memberships[membershipId]) {
      this.selectedMembership = this.memberships[membershipId];
    } else {
      this.router.navigate(['/']);
    }

    this.f.get('rut')?.valueChanges.subscribe(value => {
      if (value) {
        const formatted = this.formatRut(value);
        if (formatted !== value) {
          this.f.get('rut')?.setValue(formatted, { emitEvent: false });
        }
      }
    });

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

  get firstName() { return this.f.get('firstName'); }
  get lastName() { return this.f.get('lastName'); }
  get rut() { return this.f.get('rut'); }
  get email() { return this.f.get('email'); }
  get phone() { return this.f.get('phone'); }
  get password() { return this.f.get('passwordGroup.password'); }
  get confirm() { return this.f.get('passwordGroup.confirm'); }
  get passGroup() { return this.f.get('passwordGroup'); }

  get cardNumber() { return this.paymentForm.get('cardNumber'); }
  get cardName() { return this.paymentForm.get('cardName'); }
  get expiryDate() { return this.paymentForm.get('expiryDate'); }
  get cvv() { return this.paymentForm.get('cvv'); }

  formatRut(value: string): string {
    const clean = value.replace(/[^0-9kK]/g, '');
    if (clean.length === 0) return '';
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();
    if (body.length === 0) return dv;
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
  }

  formatCardNumber(value: string): string {
    const clean = value.replace(/\D/g, '').slice(0, 16);
    const groups = clean.match(/.{1,4}/g);
    return groups ? groups.join(' ') : clean;
  }

  formatExpiryDate(value: string): string {
    const clean = value.replace(/\D/g, '');
    if (clean.length >= 2) {
      return clean.slice(0, 2) + '/' + clean.slice(2, 4);
    }
    return clean;
  }

  submit() {
    if (this.f.invalid) {
      this.f.markAllAsTouched();
      return;
    }
    this.registrationData = {
      ...this.f.value,
      membership: this.selectedMembership
    };
    this.step = 'payment';
  }

  submitPayment() {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.step = 'processing';
    setTimeout(() => {
      this.step = 'success';
    }, 3000);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  goBackToRegister() {
    this.step = 'register';
  }

  private computeNextPaymentISO(from: Date = new Date()): string {
    const next = new Date(from);
    next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  }

  finishCheckout() {
    // Perfil completo desde el formulario + plan seleccionado
    const reg = this.registrationData || {};
    const plan = this.selectedMembership;

    const profile: UserProfile = {
      firstName: reg.firstName,
      middleName: reg.middleName || '',
      lastName: reg.lastName,
      secondLastName: reg.secondLastName || '',
      email: reg.email,
      phone: reg.phone,
      rut: reg.rut,
      membershipId: plan?.id,
      membership: plan?.name,
      membershipPrice: plan?.monthlyPrice,
      membershipDiscount: plan?.discount,
      membershipFeatures: plan?.features || [],
      joinDate: new Date().toISOString(),
      nextPayment: this.computeNextPaymentISO(),
      status: 'active'
    };

    // ✅ Persistir perfil + crear sesión con TTL/idle timeout
    this.auth.loginWithProfile(profile);

    // ⚠️ Guardar contraseña SIN hash (para tu flujo de demo/login local)
    //    Ten en cuenta que esto NO es seguro para producción.
    const plainPassword: string | undefined = reg?.passwordGroup?.password;
    if (typeof plainPassword === 'string') {
      localStorage.setItem('userPassword', plainPassword);
    }

    // (opcional) guarda también el email normalizado para cualquier uso posterior en login
    const emailNorm = (reg.email || '').toString().trim().toLowerCase();
    localStorage.setItem('loginEmail', emailNorm);

    // Para el modal de bienvenida en Dashboard (opcional)
    localStorage.setItem('userFirstLogin', 'true');

    // Compatibilidad con código existente (opcional)
    localStorage.setItem('userName', `${profile.firstName} ${profile.lastName}`);
    localStorage.setItem('userMembership', profile.membership || '');

    this.router.navigate(['/dashboard']);
  }
}
