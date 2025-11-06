// presential-sale.component.ts - Angular 20.1.0 Standalone Component
// ✨ CON SIMULACIÓN POS AUTOMÁTICA INTEGRADA
// ✅ INCLUYE USUARIOS DE PRUEBA PARA BÚSQUEDA

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Observable, of, throwError, timer } from 'rxjs';
import { takeUntil, delay, switchMap, tap, map } from 'rxjs/operators';
import { RutService } from '../../../core/services/rut.service';

// ============================================
// INTERFACES PARA POS
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

type POSSimulationState = 'idle' | 'connecting' | 'waiting-card' | 'reading-card' | 'processing' | 'success' | 'failed';

interface POSSimulationProgress {
  state: POSSimulationState;
  message: string;
  progress: number;
  icon?: string;
}

// Interfaces existentes
interface Client {
  id?: number;
  fullName: string;
  firstName: string;
  secondName?: string;
  lastName: string;
  secondLastName?: string;
  rut: string;
  email: string;
  phone: string;
  birthDate: string;
  gender?: string;
  address?: string;
  city?: string;
  region?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  membershipStatus?: string;
  membershipType?: string;
}

interface Membership {
  id: string;
  name: string;
  price: number;
  duration: number;
  pricePerDay?: boolean;
  requiresDays?: boolean;
  requiresValidation?: boolean;
  features: string[];
  badge?: string;
  badgeClass?: string;
}

interface Discount {
  id: string;
  name: string;
  value: number;
  description: string;
  selected?: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  requiresChange?: boolean;
  requiresReference?: boolean;
}

interface SaleData {
  client: Client | null;
  membership: {
    type: Membership | null;
    startDate: string;
    endDate: string;
    price: number;
    daysCount?: number;
  } | null;
  payment: {
    method: PaymentMethod | null;
    total: number;
    amountReceived?: number;
    change?: number;
    referenceNumber?: string;
    lastDigits?: string;
    authorizationCode?: string;
    cardBrand?: string;
  } | null;
  discounts: Discount[];
}

@Component({
  selector: 'app-presential-sale',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './presential-sale.component.html',
  styleUrls: ['./presential-sale.component.scss']
})
export class PresentialSaleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private posProgressSubject = new Subject<POSSimulationProgress>();
  public posProgress$ = this.posProgressSubject.asObservable();
  
  // Estado actual del flujo
  currentStep: string = 'client-type';
  
  // Formulario de cliente
  clientForm: FormGroup;
  isSubmitting: boolean = false;
  
  // Búsqueda de cliente
  searchTerm: string = '';
  searchResults: Client[] = [];
  selectedClient: Client | null = null;
  hasSearched: boolean = false;
  isSearching: boolean = false;
  
  // ============================================
  // 👥 USUARIOS DE PRUEBA (Puedes buscar por cualquiera de estos datos)
  // ============================================
  private mockClients: Client[] = [
    {
      id: 1,
      fullName: 'Juan Pérez González',
      firstName: 'Juan',
      lastName: 'Pérez',
      secondLastName: 'González',
      rut: '12.345.678-9',
      email: 'juan.perez@email.com',
      phone: '+56 9 1234 5678',
      birthDate: '1990-05-15',
      gender: 'male',
      address: 'Av. Libertador Bernardo O\'Higgins 1234',
      city: 'Santiago',
      region: 'Metropolitana de Santiago',
      emergencyContact: 'María Pérez',
      emergencyPhone: '+56 9 8765 4321',
      membershipStatus: 'active',
      membershipType: 'Plan Mensual'
    },
    {
      id: 2,
      fullName: 'María González Pérez',
      firstName: 'María',
      lastName: 'González',
      secondLastName: 'Pérez',
      rut: '98.765.432-1',
      email: 'maria.gonzalez@email.com',
      phone: '+56 9 8765 4321',
      birthDate: '1985-08-20',
      gender: 'female',
      address: 'Calle Ahumada 567',
      city: 'Santiago',
      region: 'Metropolitana de Santiago',
      emergencyContact: 'Pedro González',
      emergencyPhone: '+56 9 1111 2222',
      membershipStatus: 'expired',
      membershipType: 'Plan Trimestral'
    },
    {
      id: 3,
      fullName: 'Pedro Ramírez Silva',
      firstName: 'Pedro',
      lastName: 'Ramírez',
      secondLastName: 'Silva',
      rut: '15.678.901-2',
      email: 'pedro.ramirez@gmail.com',
      phone: '+56 9 5555 6666',
      birthDate: '1992-03-10',
      gender: 'male',
      address: 'Paseo Huérfanos 890',
      city: 'Santiago',
      region: 'Metropolitana de Santiago',
      emergencyContact: 'Ana Silva',
      emergencyPhone: '+56 9 7777 8888',
      membershipStatus: 'active',
      membershipType: 'Plan Anual OneClub'
    },
    {
      id: 4,
      fullName: 'Ana Martínez López',
      firstName: 'Ana',
      lastName: 'Martínez',
      secondLastName: 'López',
      rut: '20.111.222-3',
      email: 'ana.martinez@hotmail.com',
      phone: '+56 9 3333 4444',
      birthDate: '1995-11-25',
      gender: 'female',
      address: 'Av. Providencia 2345',
      city: 'Providencia',
      region: 'Metropolitana de Santiago',
      emergencyContact: 'Luis Martínez',
      emergencyPhone: '+56 9 9999 0000',
      membershipStatus: 'active',
      membershipType: '3 Días por Semana'
    },
    {
      id: 5,
      fullName: 'Carlos Fernández Rojas',
      firstName: 'Carlos',
      lastName: 'Fernández',
      secondLastName: 'Rojas',
      rut: '17.888.999-K',
      email: 'carlos.fernandez@outlook.com',
      phone: '+56 9 6666 7777',
      birthDate: '1988-07-14',
      gender: 'male',
      address: 'Calle Bandera 1111',
      city: 'Santiago',
      region: 'Metropolitana de Santiago',
      emergencyContact: 'Sofía Rojas',
      emergencyPhone: '+56 9 4444 5555',
      membershipStatus: 'expired',
      membershipType: 'Membresía Gratuita'
    }
  ];
  
  // Regiones de Chile
  chileanRegions: string[] = [
    'Arica y Parinacota',
    'Tarapacá',
    'Antofagasta',
    'Atacama',
    'Coquimbo',
    'Valparaíso',
    'Metropolitana de Santiago',
    'O\'Higgins',
    'Maule',
    'Ñuble',
    'Biobío',
    'La Araucanía',
    'Los Ríos',
    'Los Lagos',
    'Aysén',
    'Magallanes y la Antártica Chilena'
  ];
  
  // Membresías
  memberships: Membership[] = [
    {
      id: 'free-3days',
      name: 'Membresía Gratuita',
      price: 0,
      duration: 7,
      requiresValidation: true,
      features: [
        '3 días de acceso',
        'Válido por 1 semana',
        'Solo una vez por cliente',
        'Sin costo'
      ],
      badge: 'Prueba Gratis',
      badgeClass: 'badge-free'
    },
    {
      id: '3days-weekly',
      name: '3 Días por Semana',
      price: 60000,
      duration: 180,
      features: [
        '3 días de acceso por semana',
        '30 días habilitados en total',
        'Válido por 6 meses',
        'Flexibilidad de horarios'
      ],
      badge: 'Más Popular',
      badgeClass: 'badge-popular'
    },
    {
      id: 'anual-oneclub',
      name: 'Plan Anual OneClub',
      price: 168000,
      duration: 365,
      features: [
        '1 sesión con Personal Trainer',
        '1 evaluación y programa de entrenamiento',
        'Acceso exclusivo a la sucursal donde se contrató'
      ],
      badge: 'Matrícula GRATIS • 60% OFF',
      badgeClass: 'badge-best'
    }
  ];
  
  selectedMembership: Membership | null = null;
  startDate: string = '';
  today: string = '';
  daysCount: number = 1;
  canUseFree: boolean = true;
  showFreeWarning: boolean = false;
  
  // Descuentos
  availableDiscounts: Discount[] = [
    {
      id: 'referral',
      name: 'Descuento por Referido',
      value: 10,
      description: 'Cliente fue referido por otro miembro'
    },
    {
      id: 'opening',
      name: 'Promoción Apertura',
      value: 15,
      description: 'Promoción especial de apertura'
    },
    {
      id: 'student',
      name: 'Descuento Estudiante',
      value: 20,
      description: 'Descuento para estudiantes'
    },
    {
      id: 'corporate',
      name: 'Convenio Corporativo',
      value: 25,
      description: 'Descuento por convenio con empresa'
    }
  ];
  
  showDiscounts: boolean = false;
  
  // Métodos de pago
  paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Efectivo',
      icon: '💵',
      requiresChange: true
    },
    {
      id: 'debit',
      name: 'Tarjeta Débito',
      icon: '💳',
      requiresReference: true
    },
    {
      id: 'credit',
      name: 'Tarjeta Crédito',
      icon: '💳',
      requiresReference: true
    } 
  ];
  
  selectedPaymentMethod: PaymentMethod | null = null;
  amountReceived: number = 0;
  referenceNumber: string = '';
  lastDigits: string = '';
  isProcessing: boolean = false;
  
  // ============================================
  // PROPIEDADES PARA SIMULACIÓN POS
  // ============================================
  posProgress: POSSimulationProgress | null = null;
  posTransactionResponse: POSTransactionResponse | null = null;
  showPOSModal: boolean = false;
  posError: string | null = null;
  
  // Configuración del simulador
  private posConfig = {
    connectionDelay: 1500,
    cardReadingDelay: 2000,
    processingDelay: 2500,
    successRate: 90
  };
  
  // Datos de la venta
  saleData: SaleData = {
    client: null,
    membership: null,
    payment: null,
    discounts: []
  };
  
  membershipCode: string = '';

constructor(
  private fb: FormBuilder,
  private router: Router,
  private rutService: RutService 
) {
    // Inicializar formulario con campos separados
    this.clientForm = this.fb.group({
      firstName: ['', Validators.required],
      secondName: [''],
      lastName: ['', Validators.required],
      secondLastName: [''],
      rut: ['', [Validators.required, this.rutValidator.bind(this)]],
      email: ['', [Validators.required, Validators.email, this.validateEmail]],
      phone: ['', [Validators.required, this.validatePhone]],
      birthDate: ['', Validators.required],
      gender: [''],
      address: [''],
      city: [''],
      region: [''],
      emergencyContact: [''],
      emergencyPhone: ['', this.validatePhone]
    });
  }

  ngOnInit(): void {
    // Establecer fecha de hoy
    const today = new Date();
    this.today = today.toISOString().split('T')[0];
    this.startDate = this.today;
    
    // Suscribirse al progreso del POS
    this.posProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progress) => {
          this.posProgress = progress;
          console.log('📡 POS Progress:', progress);
        }
      });
    
    // 🎯 Mostrar usuarios disponibles en consola
    console.log('👥 === USUARIOS DE PRUEBA DISPONIBLES ===');
    console.log('Puedes buscar por: RUT, Email, Teléfono o Nombre');
    console.log('');
    this.mockClients.forEach(client => {
      console.log(`✅ ${client.fullName}`);
      console.log(`   RUT: ${client.rut}`);
      console.log(`   Email: ${client.email}`);
      console.log(`   Teléfono: ${client.phone}`);
      console.log(`   Estado: ${client.membershipStatus === 'active' ? '🟢 Activo' : '🔴 Vencido'}`);
      console.log('');
    });
    console.log('========================================');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
 * 🆕 Formatea el RUT mientras el usuario escribe
 * Se llama desde el template con (input)="onRutInput($event)"
 */
/**
 * 🆕 Formatea el RUT en el campo de búsqueda mientras el usuario escribe
 */
/**
 * 🆕 Formatea el RUT mientras el usuario escribe (FORMULARIO)
 * Se llama desde el template con (input)="onRutInput($event)"
 */
onRutInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const cursorPosition = input.selectionStart || 0;
  const oldValue = input.value;
  
  // Formatear el valor
  const formatted = this.rutService.formatRut(oldValue);
  
  // Actualizar el valor del formulario (Reactive Forms)
  this.clientForm.patchValue({ rut: formatted }, { emitEvent: false });
  
  // Calcular nueva posición del cursor
  const diff = formatted.length - oldValue.length;
  const newPosition = cursorPosition + diff;
  
  // Restaurar posición del cursor
  setTimeout(() => {
    input.setSelectionRange(newPosition, newPosition);
  });
}

/**
 * 🆕 Formatea el RUT en el campo de búsqueda mientras el usuario escribe
 */
onSearchRutInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const cursorPosition = input.selectionStart || 0;
  const oldValue = input.value;
  
  const formatted = this.rutService.formatRut(oldValue);
  this.searchTerm = formatted;
  
  const diff = formatted.length - oldValue.length;
  const newPosition = cursorPosition + diff;
  
  setTimeout(() => {
    input.setSelectionRange(newPosition, newPosition);
  });
}

/**
 * 🆕 Validador personalizado usando RutService
 */
private rutValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  const isValid = this.rutService.validateRut(control.value);
  return isValid ? null : { invalidRUT: true };
}

  // ============================================
  // MÉTODOS DE SIMULACIÓN POS
  // ============================================
  
  /**
   * Procesa una transacción con el POS simulado
   */
  private processTransaction(request: POSTransactionRequest): Observable<POSTransactionResponse> {
    return this.simulateConnectionPhase().pipe(
      switchMap(() => this.simulateCardReadingPhase()),
      switchMap(() => this.simulateProcessingPhase(request)),
      map(() => this.generateSuccessResponse(request))
    );
  }

  /**
   * Fase 1: Conexión con terminal POS
   */
  private simulateConnectionPhase(): Observable<void> {
    this.emitProgress('connecting', 'Conectando con terminal POS...', 10, '🔄');
    
    return timer(this.posConfig.connectionDelay).pipe(
      tap(() => {
        this.emitProgress('connecting', 'Terminal POS conectado', 30, '✅');
      }),
      map(() => void 0)
    );
  }

  /**
   * Fase 2: Lectura de tarjeta
   */
  private simulateCardReadingPhase(): Observable<void> {
    this.emitProgress('waiting-card', 'Esperando inserción de tarjeta...', 35, '💳');
    
    return timer(800).pipe(
      tap(() => {
        this.emitProgress('reading-card', 'Leyendo información de la tarjeta...', 50, '📖');
      }),
      delay(this.posConfig.cardReadingDelay),
      tap(() => {
        this.emitProgress('reading-card', 'Tarjeta leída correctamente', 65, '✅');
      }),
      map(() => void 0)
    );
  }

  /**
   * Fase 3: Procesamiento con el banco
   */
  private simulateProcessingPhase(request: POSTransactionRequest): Observable<void> {
    this.emitProgress('processing', 'Contactando con el banco emisor...', 70, '🏦');
    
    const willSucceed = Math.random() * 100 < this.posConfig.successRate;
    
    if (!willSucceed) {
      return timer(this.posConfig.processingDelay / 2).pipe(
        switchMap(() => {
          const errorType = this.getRandomError();
          this.emitProgress('failed', errorType, 100, '❌');
          return throwError(() => ({ error: errorType, message: errorType }));
        })
      );
    }
    
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

  /**
   * Genera respuesta exitosa de transacción
   */
  private generateSuccessResponse(request: POSTransactionRequest): POSTransactionResponse {
    const cardTypes: Array<'visa' | 'mastercard' | 'amex'> = ['visa', 'mastercard', 'amex'];
    const cardType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
    
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
      terminalId: this.generateTerminalId()
    };
  }

  /**
   * Genera ID de transacción único
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN${timestamp}${random}`;
  }

  /**
   * Genera código de autorización del banco
   */
  private generateAuthCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Genera últimos 4 dígitos de tarjeta
   */
  private generateLastFourDigits(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Genera número de comprobante POS
   */
  private generateReceiptNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(10000 + Math.random() * 90000).toString();
    return `${dateStr}${random}`;
  }

  /**
   * Genera ID de terminal POS
   */
  private generateTerminalId(): string {
    const prefix = 'POS';
    const number = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${number}`;
  }

  /**
   * Obtiene nombre de marca de tarjeta
   */
  private getCardBrandName(cardType: string): string {
    const brands: Record<string, string> = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express'
    };
    return brands[cardType] || 'Desconocida';
  }

  /**
   * Selecciona error aleatorio
   */
  private getRandomError(): string {
    const errors = [
      'Tarjeta rechazada por el banco',
      'Fondos insuficientes',
      'Tarjeta inválida o vencida',
      'Tiempo de espera agotado'
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }

  /**
   * Emite progreso de simulación
   */
  private emitProgress(state: POSSimulationState, message: string, progress: number, icon?: string): void {
    this.posProgressSubject.next({ state, message, progress, icon });
  }

  /**
   * Inicia transacción con POS
   */
  initiatePOSTransaction(paymentType: 'debit' | 'credit'): void {
    const request: POSTransactionRequest = {
      amount: this.calculateTotal(),
      paymentMethod: paymentType,
      currency: 'CLP'
    };

    this.showPOSModal = true;
    this.isProcessing = true;
    this.posError = null;

    console.log('🔄 Iniciando transacción POS:', request);

    this.processTransaction(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Transacción exitosa:', response);
          this.posTransactionResponse = response;
          
          // Auto-completar campos
          this.referenceNumber = response.receiptNumber;
          this.lastDigits = response.lastFourDigits;
          
          this.isProcessing = false;
          
          // Cerrar modal después de 2 segundos
          setTimeout(() => {
            this.showPOSModal = false;
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Error en transacción POS:', error);
          this.posError = error.message || 'Error desconocido en la transacción';
          this.isProcessing = false;
          
          // Mostrar error por 4 segundos
          setTimeout(() => {
            this.showPOSModal = false;
            this.posError = null;
          }, 4000);
        }
      });
  }

  /**
   * Cancela transacción POS
   */
  cancelPOSTransaction(): void {
    this.showPOSModal = false;
    this.isProcessing = false;
    this.posProgress = null;
    this.selectedPaymentMethod = null;
    this.emitProgress('idle', '', 0);
  }

  /**
   * Reintenta transacción POS
   */
  retryPOSTransaction(): void {
    if (this.selectedPaymentMethod) {
      this.initiatePOSTransaction(this.selectedPaymentMethod.id as 'debit' | 'credit');
    }
  }

  // Validador personalizado de Email
  validateEmail(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Patrón más estricto para email
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailPattern.test(control.value)) {
      return { invalidEmail: true };
    }
    
    return null;
  }

  // Validador personalizado de Teléfono chileno
  validatePhone(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Eliminar espacios y caracteres especiales
    const phone = control.value.replace(/[\s\-()]/g, '');
    
    // Validar formatos chilenos:
    // +56912345678 (con código país)
    // 56912345678 (sin +)
    // 912345678 (solo número móvil)
    // 221234567 (teléfono fijo Santiago)
    
    const mobilePattern = /^(\+?56)?9\d{8}$/; // Móvil
    const landlinePattern = /^(\+?56)?(2|32|33|34|35|41|42|43|45|51|52|53|55|57|58|61|63|64|65|67|71|72|73|75)\d{7}$/; // Fijo
    
    if (!mobilePattern.test(phone) && !landlinePattern.test(phone)) {
      return { invalidPhone: true };
    }
    
    return null;
  }

  // Validador personalizado de RUT
  validateRUT(control: AbstractControl): ValidationErrors | null {
    const rut = control.value?.replace(/\./g, '').replace(/-/g, '');
    if (!rut) return null;
    
    if (rut.length < 2) return { invalidRUT: true };
    
    const rutNumber = rut.slice(0, -1);
    const verifier = rut.slice(-1).toUpperCase();
    
    if (!/^\d+$/.test(rutNumber)) return { invalidRUT: true };
    
    let sum = 0;
    let multiplier = 2;
    
    for (let i = rutNumber.length - 1; i >= 0; i--) {
      sum += parseInt(rutNumber[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const expectedVerifier = 11 - (sum % 11);
    let calculatedVerifier: string;
    
    if (expectedVerifier === 11) {
      calculatedVerifier = '0';
    } else if (expectedVerifier === 10) {
      calculatedVerifier = 'K';
    } else {
      calculatedVerifier = expectedVerifier.toString();
    }
    
    return verifier === calculatedVerifier ? null : { invalidRUT: true };
  }

  // Métodos de navegación
  getStepNumber(): number {
    switch (this.currentStep) {
      case 'client-type':
      case 'new-client':
      case 'existing-client':
        return 1;
      case 'membership':
        return 2;
      case 'summary':
        return 3;
      case 'payment':
        return 4;
      default:
        return 0;
    }
  }

  startNewSale(): void {
    this.resetSaleData();
    this.currentStep = 'client-type';
  }

  cancelSale(): void {
    if (confirm('¿Estás seguro de cancelar esta venta? Se perderán todos los datos ingresados.')) {
      this.resetSaleData();
      this.router.navigate(['/dashboard']);
    }
  }

  goBack(): void {
    switch (this.currentStep) {
      case 'client-type':
        this.router.navigate(['/dashboard']);
        break;
      case 'new-client':
      case 'existing-client':
        this.currentStep = 'client-type';
        break;
      case 'membership':
        this.currentStep = this.saleData.client?.id ? 'existing-client' : 'new-client';
        break;
      case 'summary':
        this.currentStep = 'membership';
        break;
      case 'payment':
        this.currentStep = 'summary';
        break;
    }
  }

  resetSaleData(): void {
    this.saleData = {
      client: null,
      membership: null,
      payment: null,
      discounts: []
    };
    this.clientForm.reset();
    this.searchTerm = '';
    this.searchResults = [];
    this.selectedClient = null;
    this.hasSearched = false;
    this.selectedMembership = null;
    this.selectedPaymentMethod = null;
    this.availableDiscounts.forEach(d => d.selected = false);
    this.posProgress = null;
    this.posTransactionResponse = null;
    this.posError = null;
  }

  // Métodos de cliente
  selectClientType(type: string): void {
    if (type === 'new') {
      this.currentStep = 'new-client';
    } else {
      this.currentStep = 'existing-client';
    }
  }

  // Construir nombre completo
  buildFullName(): string {
    const firstName = this.clientForm.get('firstName')?.value || '';
    const secondName = this.clientForm.get('secondName')?.value || '';
    const lastName = this.clientForm.get('lastName')?.value || '';
    const secondLastName = this.clientForm.get('secondLastName')?.value || '';
    
    const nameParts = [firstName, secondName, lastName, secondLastName].filter(part => part.trim());
    return nameParts.join(' ');
  }

  submitClientForm(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    // Simular llamada API
    setTimeout(() => {
      const formValue = this.clientForm.value;
      const clientData: Client = {
        id: Date.now(), // ID temporal
        fullName: this.buildFullName(),
        firstName: formValue.firstName,
        secondName: formValue.secondName,
        lastName: formValue.lastName,
        secondLastName: formValue.secondLastName,
        rut: formValue.rut,
        email: formValue.email,
        phone: formValue.phone,
        birthDate: formValue.birthDate,
        gender: formValue.gender,
        address: formValue.address,
        city: formValue.city,
        region: formValue.region,
        emergencyContact: formValue.emergencyContact,
        emergencyPhone: formValue.emergencyPhone
      };

      this.saleData.client = clientData;
      this.isSubmitting = false;
      this.currentStep = 'membership';
    }, 1000);
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

    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field?.hasError('email')) {
      return 'Email inválido';
    }
    if (field?.hasError('invalidEmail')) {
      return 'Formato de email inválido (ejemplo: usuario@correo.com)';
    }
    if (field?.hasError('invalidRUT')) {
      return 'RUT inválido';
    }
    if (field?.hasError('invalidPhone')) {
      return 'Formato de teléfono inválido (ej: +56 9 1234 5678 o 912345678)';
    }
    return '';
  }

  // ============================================
  // 🔍 Búsqueda de cliente MEJORADA
  // ============================================
  searchClient(): void {
    if (!this.searchTerm.trim()) {
      return;
    }

    this.isSearching = true;
    this.hasSearched = true;

    // Simular delay de búsqueda
    setTimeout(() => {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      
      // Buscar en los clientes simulados
      this.searchResults = this.mockClients.filter(client => {
        return (
          client.fullName.toLowerCase().includes(searchTermLower) ||
          client.firstName.toLowerCase().includes(searchTermLower) ||
          client.lastName.toLowerCase().includes(searchTermLower) ||
          client.rut.includes(this.searchTerm.trim()) ||
          client.email.toLowerCase().includes(searchTermLower) ||
          client.phone.includes(this.searchTerm.trim())
        );
      });

      this.isSearching = false;
      
      // Mensaje en consola
      if (this.searchResults.length > 0) {
        console.log(`✅ Se encontraron ${this.searchResults.length} cliente(s) para: "${this.searchTerm}"`);
      } else {
        console.log(`❌ No se encontraron clientes para: "${this.searchTerm}"`);
      }
    }, 800);
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    console.log('👤 Cliente seleccionado:', client.fullName);
  }

  confirmClientSelection(): void {
    if (this.selectedClient) {
      this.saleData.client = this.selectedClient;
      this.currentStep = 'membership';
      console.log('✅ Cliente confirmado, procediendo a selección de membresía');
    }
  }

  // Métodos de membresía
  selectMembership(membership: Membership): void {
    if (membership.id === 'free-3days' && !this.canUseFree) {
      this.showFreeWarning = true;
      setTimeout(() => this.showFreeWarning = false, 3000);
      return;
    }

    this.selectedMembership = membership;
  }

  calculateEndDate(): string {
    if (!this.selectedMembership || !this.startDate) return '';

    const start = new Date(this.startDate);
    let days = this.selectedMembership.duration;

    if (this.selectedMembership.requiresDays) {
      days = this.daysCount;
    }

    const end = new Date(start);
    end.setDate(end.getDate() + days);

    return end.toISOString().split('T')[0];
  }

  calculateMembershipPrice(): number {
    if (!this.selectedMembership) return 0;

    if (this.selectedMembership.pricePerDay) {
      return this.selectedMembership.price * this.daysCount;
    }

    return this.selectedMembership.price;
  }

  confirmMembership(): void {
    if (!this.selectedMembership) return;

    this.saleData.membership = {
      type: this.selectedMembership,
      startDate: this.startDate,
      endDate: this.calculateEndDate(),
      price: this.calculateMembershipPrice(),
      ...(this.selectedMembership.requiresDays && { daysCount: this.daysCount })
    };

    this.currentStep = 'summary';
  }

  // Métodos de descuentos
  toggleDiscounts(): void {
    this.showDiscounts = !this.showDiscounts;
  }

  updateDiscounts(): void {
    this.saleData.discounts = this.availableDiscounts.filter(d => d.selected);
  }

  get selectedDiscounts(): Discount[] {
    return this.availableDiscounts.filter(d => d.selected);
  }

  calculateDiscountAmount(discount: Discount): number {
    const basePrice = this.saleData.membership?.price || 0;
    return (basePrice * discount.value) / 100;
  }

  calculateTotal(): number {
    const basePrice = this.saleData.membership?.price || 0;
    const totalDiscount = this.selectedDiscounts.reduce((sum, discount) => {
      return sum + this.calculateDiscountAmount(discount);
    }, 0);
    return Math.max(0, basePrice - totalDiscount);
  }

  proceedToPayment(): void {
    this.currentStep = 'payment';
  }

  // Métodos de pago
  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.amountReceived = 0;
    this.referenceNumber = '';
    this.lastDigits = '';
    this.posProgress = null;
    this.posError = null;
    this.posTransactionResponse = null;

    // Si es tarjeta, iniciar proceso POS automáticamente
    if (method.id === 'debit' || method.id === 'credit') {
      this.initiatePOSTransaction(method.id as 'debit' | 'credit');
    }
  }

  calculateChange(): number {
    if (!this.selectedPaymentMethod?.requiresChange) return 0;
    const total = this.calculateTotal();
    return Math.max(0, this.amountReceived - total);
  }

  confirmPayment(): void {
    if (!this.selectedPaymentMethod) return;

    // Validaciones
    if (this.selectedPaymentMethod.requiresChange) {
      if (this.amountReceived < this.calculateTotal()) {
        alert('El monto recibido es menor al total');
        return;
      }
    }

    // Para tarjetas, verificar transacción POS exitosa
    if ((this.selectedPaymentMethod.id === 'debit' || this.selectedPaymentMethod.id === 'credit') 
        && !this.posTransactionResponse) {
      alert('Debe completar la transacción con el POS');
      return;
    }

    if (this.selectedPaymentMethod.requiresReference && this.selectedPaymentMethod.id !== 'debit' && this.selectedPaymentMethod.id !== 'credit') {
      if (!this.referenceNumber.trim()) {
        alert('Ingresa el número de comprobante');
        return;
      }
    }

    this.isProcessing = true;

    // Simular procesamiento
    setTimeout(() => {
      this.saleData.payment = {
        method: this.selectedPaymentMethod,
        total: this.calculateTotal(),
        amountReceived: this.amountReceived,
        change: this.calculateChange(),
        referenceNumber: this.referenceNumber || undefined,
        lastDigits: this.lastDigits || undefined,
        authorizationCode: this.posTransactionResponse?.authorizationCode,
        cardBrand: this.posTransactionResponse?.cardBrand
      };

      this.membershipCode = this.generateMembershipCode();
      this.isProcessing = false;
      this.currentStep = 'success';
    }, 1500);
  }

  // Métodos de éxito
  generateMembershipCode(): string {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `MEM-${year}-${randomNum}`;
  }

  sendEmail(): void {
    if (!this.saleData.client?.email) {
      alert('No se encontró email del cliente');
      return;
    }

    // Mostrar indicador de envío
    const emailData = {
      to: this.saleData.client.email,
      subject: 'Confirmación de Compra - OneClub Fitness',
      clientName: this.saleData.client.fullName,
      membershipType: this.saleData.membership?.type?.name,
      membershipCode: this.membershipCode,
      startDate: this.saleData.membership?.startDate,
      endDate: this.saleData.membership?.endDate,
      amount: this.saleData.payment?.total,
      paymentMethod: this.saleData.payment?.method?.name,
      authorizationCode: this.saleData.payment?.authorizationCode,
      cardBrand: this.saleData.payment?.cardBrand,
      lastDigits: this.saleData.payment?.lastDigits
    };

    console.log('📧 Enviando email con datos:', emailData);

    // TODO: Llamar a tu servicio de email
    // this.emailService.sendMembershipConfirmation(emailData).subscribe({
    //   next: () => {
    //     alert(`✅ Email enviado exitosamente a ${this.saleData.client?.email}`);
    //   },
    //   error: (err) => {
    //     console.error('Error al enviar email:', err);
    //     alert('❌ Error al enviar el email. Intente nuevamente.');
    //   }
    // });

    // Simulación temporal
    alert(`📧 Email enviado a ${this.saleData.client?.email}\n\nIncluye:\n- Código de membresía: ${this.membershipCode}\n- Datos de pago\n- Fecha de vigencia`);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}