import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  HostBinding,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { RutService } from '../../../core/services/rut.service';
import { ThemeService } from '../../../core/services/theme.service';
import {
  AccessHistory,
  Member,
  MemberManagement,
  AccessStatusDto,
} from '../../../core/services/members/member-management';

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
    MatSnackBarModule,
  ],
  templateUrl: './member-search.component.html',
  styleUrl: './member-search.component.scss',
})
export class MemberSearchComponent implements OnInit {
  @HostBinding('attr.data-theme')
  get dataTheme() {
    return this.themeService.theme();
  }

  private rutService = inject(RutService);
  private memberService = inject(MemberManagement);
  private snackBar = inject(MatSnackBar);
  private themeService = inject(ThemeService);

  // Control de búsqueda (mínimo 2 caracteres)
  searchControl = new FormControl('', [
    Validators.required,
    Validators.minLength(2),
  ]);

  // Estados
  isSearching = signal(false);
  isSaving = signal(false);
  selectedMember = signal<Member | null>(null);
  accessHistory = signal<AccessHistory[]>([]);
  searchResults = signal<Member[]>([]);

  // timeout para debounce manual
  private searchTimeout: any;

  // Computed
  hasDebt = computed(() => {
    const member = this.selectedMember();
    return member ? member.deudaPendiente > 0 : false;
  });

  isBlocked = computed(() => {
    const member = this.selectedMember();
    return member ? !!member.estaBloqueado : false;
  });

  ngOnInit(): void {
    // nada extra
  }

  // ====== Helpers de plan limitado ======

  hasLimitedPlan(): boolean {
    const member = this.selectedMember();
    return !!member && !!member.esPlanLimitado;
  }

  getUsedDays(): number {
    const member = this.selectedMember();
    return member?.diasOcupados ?? 0;
  }

  getAvailableDays(): number {
    const member = this.selectedMember();
    return member?.diasDisponibles ?? 0;
  }

  isWithoutDays(): boolean {
    const member = this.selectedMember();
    return !!member?.sinDiasDisponibles;
  }

  // ====== Búsqueda por RUT / texto (autocomplete) ======
  onSearchInput(event: any): void {
    const input = event.target as HTMLInputElement;
    const oldValue = input.value;
    const cursorPosition = input.selectionStart ?? oldValue.length;
    const oldLength = oldValue.length;

    const rutCharsRegex = /^[0-9.\-kK]*$/;

    if (rutCharsRegex.test(oldValue)) {
      // Es "tipo RUT": formateamos
      const formatted = this.rutService.formatRut(oldValue);
      this.searchControl.setValue(formatted, { emitEvent: false });

      const newLength = formatted.length;
      const diff = newLength - oldLength;
      const newPosition = cursorPosition + diff;

      setTimeout(() => {
        input.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      // No es RUT: dejamos el valor tal cual en el formControl
      this.searchControl.setValue(oldValue, { emitEvent: false });
    }

    const value = this.searchControl.value ?? '';
    const trimmed = value.trim();

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (trimmed.length < 2) {
      this.isSearching.set(false);
      this.searchResults.set([]);
      // no tocamos selectedMember aquí
      this.accessHistory.set([]);
      return;
    }

    this.isSearching.set(true);
    this.searchTimeout = setTimeout(() => {
      this.performSearch(trimmed);
    }, 300);
  }

  private performSearch(term: string): void {
    let searchQuery = term;
    const cleanedQuery = this.rutService.cleanRut(term);

    if (/^[0-9kK]+$/.test(cleanedQuery)) {
      searchQuery = cleanedQuery;
    }

    this.memberService
      .searchMembers({ query: searchQuery, limit: 10 })
      .subscribe({
        next: (response) => {
          this.searchResults.set(response.members);
          this.isSearching.set(false);
        },
        error: (error) => {
          console.error('Error al buscar miembro:', error);
          this.searchResults.set([]);
          this.isSearching.set(false);
          this.snackBar.open(
            '❌ Error al buscar el miembro. Intenta nuevamente.',
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'end',
              verticalPosition: 'top',
              panelClass: ['error-snackbar'],
            },
          );
        },
      });
  }

  onEnter(): void {
    const results = this.searchResults();
    if (results.length > 0) {
      this.selectMember(results[0]);
    }
  }

  /**
   * Seleccionar un miembro de la lista de resultados
   * 👉 aquí seteamos selectedMember y limpiamos resultados;
   *    el input desaparecerá por el @if del template.
   */
  selectMember(member: Member): void {
    this.selectedMember.set(member);
    this.searchResults.set([]);
    this.isSearching.set(false);

    this.loadAccessHistory(member.id);

    this.snackBar.open('✅ Miembro seleccionado', 'Cerrar', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private loadAccessHistory(memberId: string): void {
    this.memberService.getMemberAccessHistory(memberId, 10).subscribe({
      next: (history) => {
        this.accessHistory.set(history);
      },
      error: (error) => {
        console.error('Error al cargar historial:', error);
        this.accessHistory.set([]);
      },
    });
  }

  // ====== Acciones de UI ======
  clearSearch(): void {
    this.searchControl.reset();
    this.searchResults.set([]);
    this.selectedMember.set(null);   // 👈 hace reaparecer el input
    this.accessHistory.set([]);
    this.isSearching.set(false);
  }

  blockMember(): void {
    const member = this.selectedMember();
    if (!member) return;

    this.isSaving.set(true);

    this.memberService.blockMember(member.id).subscribe({
      next: (res: AccessStatusDto) => {
        const updated: Member = {
          ...member,
          accessStatus: res.accessStatus,
          estaBloqueado: res.bloqueado,
          motivoBloqueo: res.motivoBloqueo,
          bloqueosActivos: res.bloqueado
            ? member.bloqueosActivos + 1
            : member.bloqueosActivos,
        };

        this.selectedMember.set(updated);
        this.isSaving.set(false);

        this.snackBar.open('🚫 Usuario bloqueado', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['warning-snackbar'],
        });
      },
      error: (error) => {
        console.error('Error al bloquear:', error);
        this.isSaving.set(false);
        this.snackBar.open('❌ Error al bloquear el usuario', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  unblockMember(): void {
    const member = this.selectedMember();
    if (!member) return;

    this.isSaving.set(true);

    this.memberService.unblockMember(member.id).subscribe({
      next: (res: AccessStatusDto) => {
        const updated: Member = {
          ...member,
          accessStatus: res.accessStatus,
          estaBloqueado: res.bloqueado,
          motivoBloqueo: res.motivoBloqueo,
          bloqueosActivos: res.bloqueado ? member.bloqueosActivos : 0,
        };

        this.selectedMember.set(updated);
        this.isSaving.set(false);

        this.snackBar.open('✅ Usuario desbloqueado', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });
      },
      error: (error) => {
        console.error('Error al desbloquear:', error);
        this.isSaving.set(false);
        this.snackBar.open('❌ Error al desbloquear el usuario', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  viewPaymentHistory(): void {
    const member = this.selectedMember();
    if (!member) return;

    console.log('Viendo historial de pagos de:', member.rut);
    this.snackBar.open('💳 Funcionalidad en desarrollo', 'Cerrar', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVA':
        return 'success';
      case 'VENCIDA':
        return 'warn';
      case 'CONGELADA':
        return 'info';
      case 'SUSPENDIDA':
        return 'error';
      default:
        return 'default';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  }

  formatDateTime(date: Date | null): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  getDaysUntilExpiration(): number {
    const member = this.selectedMember();
    if (!member || !member.fechaVencimiento) return 0;

    const today = new Date();
    const expiration = new Date(member.fechaVencimiento);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
