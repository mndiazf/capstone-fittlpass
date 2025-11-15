// member-block.component.ts - ARCHIVO COMPLETO

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { RutService } from '../../../core/services/rut.service';
import { MemberManagementService } from '../../../core/services/member-management.service';
import { 
  Member, 
  CreateInfractionRequest, 
  CreateBlockRequest,
  InfractionType,
  BlockType
} from '../../../shared/models/member.models';

// Interfaz para las tarjetas de infracción en la UI
interface InfractionCardUI {
  code: string;
  name: string;
  description: string;
  blockType: 'PERMANENTE' | 'TEMPORAL';
  severity: 'CRITICA' | 'GRAVE';
  icon: string;
  defaultDays?: number;
  minDays?: number;
  maxDays?: number;
  requiresPoliceReport?: boolean;
  requiresPayment?: boolean;
  color: string;
}

@Component({
  selector: 'app-member-block',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSliderModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './member-block.component.html',
  styleUrl: './member-block.component.scss'
})
export class MemberBlockComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rutService = inject(RutService);
  private snackBar = inject(MatSnackBar);
  private memberService = inject(MemberManagementService);

  // Form Controls
  searchControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
  blockForm!: FormGroup;
  
  // Estados
  isSearching = signal(false);
  selectedMember = signal<Member | null>(null);
  isSubmitting = signal(false);
  showSuccessMessage = signal(false);
  selectedInfractionCode = signal<string | null>(null);
  
  // Fecha máxima (hoy) para el datepicker
  today = new Date();
  
  // Tipos de infracciones graves
  infractionTypes: InfractionCardUI[] = [
    {
      code: 'AGRESION',
      name: 'Agresión Física o Verbal',
      description: 'Agresión a staff o miembros del gimnasio',
      blockType: 'PERMANENTE',
      severity: 'CRITICA',
      icon: 'dangerous',
      requiresPoliceReport: true,
      color: '#ef4444'
    },
    {
      code: 'SUSTANCIAS',
      name: 'Consumo de Sustancias Prohibidas',
      description: 'Consumo de drogas, alcohol u otras sustancias',
      blockType: 'PERMANENTE',
      severity: 'CRITICA',
      icon: 'smoke_free',
      requiresPoliceReport: true,
      color: '#ef4444'
    },
    {
      code: 'ROBO',
      name: 'Robo',
      description: 'Robo de pertenencias o equipamiento',
      blockType: 'PERMANENTE',
      severity: 'CRITICA',
      icon: 'report',
      requiresPoliceReport: true,
      color: '#ef4444'
    },
    {
      code: 'DANO_EQUIPAMIENTO',
      name: 'Daño Intencional a Equipamiento',
      description: 'Daño deliberado a máquinas o instalaciones',
      blockType: 'TEMPORAL',
      severity: 'GRAVE',
      icon: 'construction',
      defaultDays: 60,
      minDays: 30,
      maxDays: 90,
      requiresPayment: true,
      color: '#f59e0b'
    },
    {
      code: 'GRABACION_SIN_CONSENTIMIENTO',
      name: 'Grabación sin Consentimiento',
      description: 'Grabar o fotografiar sin autorización',
      blockType: 'TEMPORAL',
      severity: 'GRAVE',
      icon: 'videocam_off',
      defaultDays: 60,
      minDays: 60,
      maxDays: 60,
      color: '#f59e0b'
    }
  ];
  
  // Computed signals
  selectedInfraction = computed(() => {
    const code = this.selectedInfractionCode();
    return this.infractionTypes.find(type => type.code === code) || null;
  });
  
  requiresPoliceReport = computed(() => {
    return this.selectedInfraction()?.requiresPoliceReport || false;
  });
  
  requiresPayment = computed(() => {
    return this.selectedInfraction()?.requiresPayment || false;
  });
  
  isPermanentBlock = computed(() => {
    const isSecondOffense = this.blockForm?.get('isSecondOffense')?.value;
    const infractionCode = this.selectedInfractionCode();
    
    // Segunda ofensa de grabación = permanente
    if (isSecondOffense && infractionCode === 'GRABACION_SIN_CONSENTIMIENTO') {
      return true;
    }
    
    return this.selectedInfraction()?.blockType === 'PERMANENTE';
  });

  ngOnInit(): void {
    this.initBlockForm();
  }

  private initBlockForm(): void {
    this.blockForm = this.fb.group({
      infractionType: ['', Validators.required],
      incidentDate: [new Date(), Validators.required],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      observations: ['', Validators.maxLength(500)],
      blockDays: [60],
      policeReportNumber: [''],
      damageAmount: [0],
      evidenceUrl: ['', Validators.pattern('https?://.+')],
      notifyMember: [true],
      isSecondOffense: [false]
    });
    
    // Actualizar signal cuando cambia el valor
    this.blockForm.get('infractionType')?.valueChanges.subscribe((value) => {
      this.selectedInfractionCode.set(value);
      this.updateValidations();
    });
  }

  selectInfraction(code: string): void {
    this.blockForm.patchValue({ infractionType: code });
    this.selectedInfractionCode.set(code);
  }

  updateValidations(): void {
    const infraction = this.selectedInfraction();
    if (!infraction) return;
    
    // Validación de denuncia policial
    const policeControl = this.blockForm.get('policeReportNumber');
    if (infraction.requiresPoliceReport) {
      policeControl?.setValidators([Validators.required, Validators.minLength(5)]);
    } else {
      policeControl?.clearValidators();
      policeControl?.setValue('');
    }
    policeControl?.updateValueAndValidity();
    
    // Validación de monto de daño
    const damageControl = this.blockForm.get('damageAmount');
    if (infraction.requiresPayment) {
      damageControl?.setValidators([Validators.required, Validators.min(1000)]);
    } else {
      damageControl?.clearValidators();
      damageControl?.setValue(0);
    }
    damageControl?.updateValueAndValidity();
    
    // Establecer días por defecto
    if (infraction.blockType === 'TEMPORAL' && infraction.defaultDays) {
      this.blockForm.patchValue({ blockDays: infraction.defaultDays });
    }
    
    // Reset segunda ofensa si cambia tipo
    if (infraction.code !== 'GRABACION_SIN_CONSENTIMIENTO') {
      this.blockForm.patchValue({ isSecondOffense: false });
    }
  }

  onRutInput(event: any): void {
    const input = event.target;
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    const oldLength = oldValue.length;
    
    const formatted = this.rutService.formatRut(oldValue);
    this.searchControl.setValue(formatted, { emitEvent: false });
    
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    const newPosition = cursorPosition + diff;
    
    setTimeout(() => {
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  }

  searchMember(query: string): void {
    if (!query || query.trim().length < 3) {
      this.snackBar.open('Debes ingresar al menos 3 caracteres', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top'
      });
      return;
    }

    this.isSearching.set(true);
    
    let searchQuery = query.trim();
    const cleanedQuery = this.rutService.cleanRut(query);
    
    if (/^[0-9kK]+$/.test(cleanedQuery)) {
      if (!this.rutService.validateRut(query)) {
        this.snackBar.open('❌ RUT inválido', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isSearching.set(false);
        return;
      }
      searchQuery = cleanedQuery;
    }
    
    this.memberService.searchMembers({ query: searchQuery, limit: 10 }).subscribe({
      next: (response) => {
        if (response.members && response.members.length > 0) {
          this.selectedMember.set(response.members[0]);
          
          this.snackBar.open('✅ Miembro encontrado', 'Cerrar', {
            duration: 2000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        } else {
          this.snackBar.open('No se encontró ningún miembro con ese criterio', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['warning-snackbar']
          });
        }
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Error buscando miembro:', error);
        this.snackBar.open('❌ Error al buscar miembro', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isSearching.set(false);
      }
    });
  }

  clearMemberSelection(): void {
    this.selectedMember.set(null);
    this.searchControl.reset();
  }

  handleSecondOffenseChange(checked: boolean): void {
    if (checked && this.blockForm.get('infractionType')?.value === 'GRABACION_SIN_CONSENTIMIENTO') {
      this.snackBar.open('⚠️ Segunda ofensa resultará en bloqueo PERMANENTE', 'Entendido', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  getBlockEndDate(): Date | null {
    if (this.isPermanentBlock()) return null;
    
    const infraction = this.selectedInfraction();
    const days = this.blockForm.get('blockDays')?.value || infraction?.defaultDays || 60;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate;
  }

  submitBlock(): void {
    if (this.blockForm.invalid || !this.selectedMember()) {
      Object.keys(this.blockForm.controls).forEach(key => {
        this.blockForm.get(key)?.markAsTouched();
      });
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
      return;
    }
    
    this.isSubmitting.set(true);
    
    const infractionCode = this.blockForm.get('infractionType')?.value as string;
    
    const infraction: CreateInfractionRequest = {
      miembroId: this.selectedMember()!.id,
      tipoInfraccion: InfractionType[infractionCode as keyof typeof InfractionType],
      descripcion: this.blockForm.get('description')?.value,
      fechaSuceso: this.blockForm.get('incidentDate')?.value,
      observaciones: this.blockForm.get('observations')?.value || undefined,
      evidenciaUrl: this.blockForm.get('evidenceUrl')?.value || undefined,
      numeroDenuncia: this.blockForm.get('policeReportNumber')?.value || undefined,
      montoReparacion: this.blockForm.get('damageAmount')?.value || undefined,
      esSegundaOfensa: this.blockForm.get('isSecondOffense')?.value || false,
      notificarMiembro: this.blockForm.get('notifyMember')?.value
    };

    const block: CreateBlockRequest = {
      miembroId: this.selectedMember()!.id,
      tipoBloqueo: this.isPermanentBlock() ? BlockType.PERMANENTE : BlockType.TEMPORAL,
      motivo: infractionCode,
      diasSuspension: this.isPermanentBlock() ? undefined : this.blockForm.get('blockDays')?.value,
      notas: this.blockForm.get('description')?.value,
      notificarMiembro: this.blockForm.get('notifyMember')?.value
    };
    
    this.memberService.createInfractionWithBlock(infraction, block).subscribe({
      next: (response) => {
        console.log('Infracción y bloqueo creados:', response);
        this.isSubmitting.set(false);
        this.showSuccessMessage.set(true);
        
        this.snackBar.open('✅ Bloqueo aplicado exitosamente - Acceso facial bloqueado', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        
        setTimeout(() => {
          this.resetForm();
        }, 4000);
      },
      error: (error) => {
        console.error('Error creando bloqueo:', error);
        this.isSubmitting.set(false);
        
        this.snackBar.open('❌ Error al aplicar el bloqueo', 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  resetForm(): void {
    this.blockForm.reset({
      incidentDate: new Date(),
      blockDays: 60,
      notifyMember: true,
      isSecondOffense: false,
      damageAmount: 0
    });
    this.searchControl.reset();
    this.selectedMember.set(null);
    this.selectedInfractionCode.set(null);
    this.showSuccessMessage.set(false);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  getBlockSummary(): string {
    if (this.isPermanentBlock()) {
      return 'Bloqueo PERMANENTE - El miembro no podrá acceder nunca más';
    }
    
    const infraction = this.selectedInfraction();
    const days = this.blockForm.get('blockDays')?.value || infraction?.defaultDays || 60;
    const endDate = this.getBlockEndDate();
    return `Suspensión de ${days} días - Hasta el ${endDate ? this.formatDate(endDate) : 'N/A'}`;
  }
}