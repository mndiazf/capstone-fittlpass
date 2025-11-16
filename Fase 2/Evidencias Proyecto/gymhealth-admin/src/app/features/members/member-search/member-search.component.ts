import { Component, signal, computed, inject, OnInit, HostBinding, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RutService } from '../../../core/services/rut.service';
import { MemberManagementService } from '../../../core/services/member-management.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Member, AccessHistory, MembershipStatus } from '../../../shared/models/member.models';

@Component({
  selector: 'app-member-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './member-search.component.html',
  styleUrl: './member-search.component.scss'
})
export class MemberSearchComponent implements OnInit {
  // 🎨 HOST BINDING REACTIVO
  @HostBinding('attr.data-theme') 
  get dataTheme() {
    return this.themeService.theme();
  }

  private fb = inject(FormBuilder);
  private rutService = inject(RutService);
  private memberService = inject(MemberManagementService);
  private snackBar = inject(MatSnackBar);
  private themeService = inject(ThemeService);
  
  // Controles de búsqueda
  searchControl = new FormControl('', [Validators.required, Validators.minLength(3)]);
  
  // Estados
  isSearching = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  selectedMember = signal<Member | null>(null);
  accessHistory = signal<AccessHistory[]>([]);
  
  // Formulario de edición
  contactForm!: FormGroup;
  
  // Computed signals para estados
  hasDebt = computed(() => {
    const member = this.selectedMember();
    return member ? member.deudaPendiente > 0 : false;
  });
  
  isBlocked = computed(() => {
    const member = this.selectedMember();
    return member ? member.bloqueosActivos > 0 : false;
  });
  
  needsDataUpdate = computed(() => {
    const member = this.selectedMember();
    if (!member) return false;
    
    const monthsSinceUpdate = this.getMonthsDifference(
      member.fechaUltimaActualizacion,
      new Date()
    );
    return monthsSinceUpdate >= 6;
  });

  constructor() {
    this.initContactForm();
  }

  ngOnInit(): void {
    // El HostBinding getter se actualiza automáticamente cuando cambia themeService.theme()
  }

  // ... resto del código sin cambios
  
  private initContactForm(): void {
    this.contactForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern(/^\+56 9 \d{4} \d{4}$/)]],
      tieneContactoEmergencia: [false],
      contactoEmergenciaNombre: [''],
      contactoEmergenciaTelefono: ['']
    });

    this.contactForm.disable();

    this.contactForm.get('tieneContactoEmergencia')?.valueChanges.subscribe(value => {
      const nombreControl = this.contactForm.get('contactoEmergenciaNombre');
      const telefonoControl = this.contactForm.get('contactoEmergenciaTelefono');

      if (value) {
        nombreControl?.setValidators([Validators.required]);
        telefonoControl?.setValidators([
          Validators.required,
          Validators.pattern(/^\+56 9 \d{4} \d{4}$/)
        ]);
      } else {
        nombreControl?.clearValidators();
        nombreControl?.setValue('');
        telefonoControl?.clearValidators();
        telefonoControl?.setValue('');
      }

      nombreControl?.updateValueAndValidity();
      telefonoControl?.updateValueAndValidity();
    });
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
        this.snackBar.open('❌ RUT inválido. Por favor verifica el dígito verificador.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isSearching.set(false);
        return;
      }
      searchQuery = cleanedQuery;
    }
    
    this.memberService.searchMembers({ query: searchQuery, limit: 1 }).subscribe({
      next: (response) => {
        if (response.members && response.members.length > 0) {
          const member = response.members[0];
          this.selectedMember.set(member);
          this.loadMemberDataToForm(member);
          this.loadAccessHistory(member.id);
          
          this.snackBar.open('✅ Miembro encontrado', 'Cerrar', {
            duration: 2000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        } else {
          this.selectedMember.set(null);
          this.snackBar.open('No se encontró ningún miembro con esa información', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['warning-snackbar']
          });
        }
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Error al buscar miembro:', error);
        this.snackBar.open('❌ Error al buscar el miembro. Intenta nuevamente.', 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isSearching.set(false);
      }
    });
  }

  private loadAccessHistory(memberId: number): void {
    this.memberService.getMemberAccessHistory(memberId, 10).subscribe({
      next: (history) => {
        this.accessHistory.set(history);
      },
      error: (error) => {
        console.error('Error al cargar historial:', error);
        this.accessHistory.set([]);
      }
    });
  }

  private loadMemberDataToForm(member: Member): void {
    this.contactForm.patchValue({
      email: member.email,
      telefono: member.telefono,
      tieneContactoEmergencia: member.tieneContactoEmergencia,
      contactoEmergenciaNombre: member.contactoEmergenciaNombre || '',
      contactoEmergenciaTelefono: member.contactoEmergenciaTelefono || ''
    });
    this.contactForm.disable();
  }

  clearSearch(): void {
    this.searchControl.reset();
    this.selectedMember.set(null);
    this.accessHistory.set([]);
    this.contactForm.reset();
    this.contactForm.disable();
    this.isEditing.set(false);
  }

  enableEdit(): void {
    this.isEditing.set(true);
    this.contactForm.enable();
  }

  cancelEdit(): void {
    const member = this.selectedMember();
    if (member) {
      this.loadMemberDataToForm(member);
    }
    this.isEditing.set(false);
  }

  saveChanges(): void {
    if (this.contactForm.invalid) {
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
      return;
    }

    const member = this.selectedMember();
    if (!member) return;

    this.isSaving.set(true);
    const formValue = this.contactForm.value;
    
    setTimeout(() => {
      const updatedMember: Member = {
        ...member,
        email: formValue.email,
        telefono: formValue.telefono,
        tieneContactoEmergencia: formValue.tieneContactoEmergencia,
        contactoEmergenciaNombre: formValue.tieneContactoEmergencia ? formValue.contactoEmergenciaNombre : undefined,
        contactoEmergenciaTelefono: formValue.tieneContactoEmergencia ? formValue.contactoEmergenciaTelefono : undefined,
        fechaUltimaActualizacion: new Date()
      };

      this.selectedMember.set(updatedMember);
      this.contactForm.disable();
      this.isEditing.set(false);
      this.isSaving.set(false);

      this.snackBar.open('✅ Datos actualizados correctamente', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });
    }, 1000);
  }

  formatPhoneNumber(event: any, controlName: string): void {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.startsWith('569')) {
      value = value.substring(2);
    } else if (value.startsWith('56')) {
      value = value.substring(2);
    } else if (value.startsWith('9')) {
      // Ya está bien
    } else if (value.length > 0) {
      value = '9' + value;
    }

    if (value.length > 9) {
      value = value.substring(0, 9);
    }

    const formatted = value.length >= 5
      ? `+56 9 ${value.substring(1, 5)} ${value.substring(5)}`
      : value.length >= 1
      ? `+56 9 ${value.substring(1)}`
      : '+56 9 ';

    this.contactForm.get(controlName)?.setValue(formatted, { emitEvent: false });
  }

  requestDataUpdate(): void {
    const member = this.selectedMember();
    if (!member) return;
    
    this.memberService.requestDataUpdate(member.id).subscribe({
      next: () => {
        this.snackBar.open(`✅ Solicitud enviada a ${member.email}`, 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error:', error);
        this.snackBar.open('❌ Error al enviar la solicitud', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  viewPaymentHistory(): void {
    const member = this.selectedMember();
    if (!member) return;
    
    console.log('Viendo historial de pagos de:', member.rut);
    this.snackBar.open('💳 Funcionalidad en desarrollo', 'Cerrar', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVA': return 'success';
      case 'VENCIDA': return 'warn';
      case 'CONGELADA': return 'info';
      case 'SUSPENDIDA': return 'error';
      default: return 'default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ACTIVA': return 'check_circle';
      case 'VENCIDA': return 'warning';
      case 'CONGELADA': return 'ac_unit';
      case 'SUSPENDIDA': return 'block';
      default: return 'help';
    }
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
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }

  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  getMonthsDifference(date1: Date, date2: Date): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  }

  getMonthsSinceUpdate(): number {
    const member = this.selectedMember();
    if (!member) return 0;
    return this.getMonthsDifference(member.fechaUltimaActualizacion, new Date());
  }

  getDaysUntilExpiration(): number {
    const member = this.selectedMember();
    if (!member) return 0;
    
    const today = new Date();
    const expiration = new Date(member.fechaVencimiento);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}