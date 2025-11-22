// src/app/features/reports/access-report/access-report.component.ts

import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  MAT_DATE_LOCALE,
  DateAdapter,
  MAT_DATE_FORMATS,
  NativeDateAdapter,
} from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from '../../../core/services/auth.service';
import {
  Reports,
  AccessLogReportItem,
  AccessReportFilters,
  PersonTypeFilter,
} from '../../../core/services/reports/reports';

/** ===== Adapter y formatos para dd/MM/yyyy ===== */

export class EsClDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    // Permitimos string tipo "dd/MM/yyyy"
    if (typeof value === 'string' && value.trim().length) {
      const parts = value.trim().split('/');
      if (parts.length === 3) {
        const day = Number(parts[0]);
        const month = Number(parts[1]) - 1; // 0-based
        const year = Number(parts[2]);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }

    // Fallback al comportamiento por defecto
    const timestamp =
      typeof value === 'number' ? value : Date.parse(value);
    return isNaN(timestamp) ? null : new Date(timestamp);
  }

  override format(date: Date, displayFormat: Object): string {
    if (!date) return '';
    const day = this._to2digit(date.getDate());
    const month = this._to2digit(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private _to2digit(n: number): string {
    return ('00' + n).slice(-2);
  }
}

export const ES_CL_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    // El adapter ignora el formato y siempre devuelve dd/MM/yyyy,
    // pero dejamos esto por semántica
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

/** ====== Modelo del reporte ====== */

export interface AccessRecord {
  id: string;
  date: Date;
  time: string;
  personName: string;
  personRut: string;
  personType: 'Miembro' | 'Colaborador' | 'Desconocido';
  accessType: 'Entrada';
  branchId: string;
  branchName: string;
  status: 'Exitoso' | 'Rechazado';
}

@Component({
  selector: 'app-access-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
  ],
  templateUrl: './access-report.component.html',
  styleUrls: ['./access-report.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme',
  },
  providers: [
    // Locale en español Chile
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    // Adapter custom que parsea y formatea dd/MM/yyyy
    { provide: DateAdapter, useClass: EsClDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: ES_CL_DATE_FORMATS },
  ],
})
export class AccessReportComponent implements OnInit {
  private authService = inject(AuthService);
  private reports = inject(Reports);

  currentTheme: string = 'dark';

  // Contexto de sucursal (string porque en BD es varchar/uuid)
  currentUserBranchId: string | null = null;
  isSuperAdmin: boolean = false;

  // (A futuro puedes poblar esto desde un catálogo real)
  availableBranches: { id: string; name: string }[] = [];

  // Columnas de la tabla
  displayedColumns: string[] = [
    'date',
    'time',
    'personName',
    'personRut',
    'personType',
    'accessType',
    'branchName',
    'status',
  ];

  // Filtros (usados por el template)
  filterForm = new FormGroup({
    branchId: new FormControl<string | null>(null),
    personType: new FormControl<'all' | 'member' | 'staff'>('all'),
    searchText: new FormControl<string>(''),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
  });

  // Signals internos para que los computed reaccionen
  private filterBranchId = signal<string | null>(null);
  private filterPersonType = signal<'all' | 'member' | 'staff'>('all');
  private filterSearchText = signal<string>('');
  private filterStartDate = signal<Date | null>(null);
  private filterEndDate = signal<Date | null>(null);

  // Datos crudos desde el backend (últimos N accesos)
  private allAccessRecords = signal<AccessRecord[]>([]);
  isLoading = signal(false);

  /**
   * Vista filtrada (máx. 20 registros) para la tabla.
   */
  filteredRecords = computed(() => {
    const records = this.allAccessRecords();
    const personTypeFilter = this.filterPersonType();
    const searchText = this.filterSearchText();
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const selectedBranchId = this.filterBranchId();

    const filtered = records.filter((record) => {
      // 1) Sucursal
      if (this.isSuperAdmin) {
        if (selectedBranchId && record.branchId !== selectedBranchId) {
          return false;
        }
      } else if (this.currentUserBranchId) {
        if (record.branchId !== this.currentUserBranchId) {
          return false;
        }
      }

      // 2) Tipo de persona
      if (personTypeFilter === 'member' && record.personType !== 'Miembro') {
        return false;
      }
      if (personTypeFilter === 'staff' && record.personType !== 'Colaborador') {
        return false;
      }

      // 3) Búsqueda por nombre o RUT
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesName = record.personName.toLowerCase().includes(searchLower);
        const matchesRut = record.personRut.includes(searchText);
        if (!matchesName && !matchesRut) {
          return false;
        }
      }

      // 4) Rango de fechas
      if (startDate && record.date < startDate) {
        return false;
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (record.date > endOfDay) {
          return false;
        }
      }

      return true;
    });

    // La UI solo muestra los últimos 20
    return filtered.slice(0, 20);
  });

  ngOnInit(): void {
    // Normalizamos el branchId que viene del AuthService (number | null) a string | null
    const branchFromAuth = this.authService.getCurrentUserBranchId(); // number | null
    this.currentUserBranchId =
      branchFromAuth !== null && branchFromAuth !== undefined
        ? String(branchFromAuth)
        : null;

    this.isSuperAdmin = this.authService.isSuperAdmin();

    if (this.isSuperAdmin) {
      this.filterForm.patchValue({ branchId: null });
      this.filterBranchId.set(null);
    } else {
      this.filterForm.patchValue({ branchId: this.currentUserBranchId });
      this.filterBranchId.set(this.currentUserBranchId);
    }

    this.currentTheme =
      document.documentElement.getAttribute('data-theme') || 'dark';
    this.observeThemeChanges();

    // Carga inicial de accesos (desde backend)
    this.loadAccessData();

    // Sincroniza FormGroup -> signals
    this.filterForm.valueChanges.subscribe((values) => {
      this.filterBranchId.set(values.branchId ?? null);
      this.filterPersonType.set(values.personType ?? 'all');
      this.filterSearchText.set(values.searchText ?? '');
      this.filterStartDate.set(values.startDate ?? null);
      this.filterEndDate.set(values.endDate ?? null);
    });
  }

  private observeThemeChanges(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          this.currentTheme =
            document.documentElement.getAttribute('data-theme') || 'dark';
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  /**
   * Llama al backend para obtener los últimos accesos
   * de la sucursal actual (el backend ya filtra por branchId).
   */
  private loadAccessData(): void {
    this.isLoading.set(true);

    this.reports.getRecentAccessLogs(20).subscribe({
      next: (response) => {
        const mapped: AccessRecord[] = response.items.map((item) =>
          this.mapApiItemToRecord(item),
        );

        this.allAccessRecords.set(mapped);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando accesos recientes', err);
        this.allAccessRecords.set([]);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * El backend envía date como string "22-11-2025" (dd-MM-yyyy).
   */
  private parseBackendDate(dateStr: string): Date {
    if (!dateStr) {
      return new Date(NaN);
    }

    const parts = dateStr.split('-');

    // dd-MM-yyyy
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      const day = Number(parts[0]);
      const month = Number(parts[1]) - 1; // 0-based
      const year = Number(parts[2]);
      return new Date(year, month, day);
    }

    // yyyy-MM-dd
    if (parts.length === 3 && parts[0].length === 4) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      return new Date(year, month, day);
    }

    return new Date(dateStr);
  }

  private mapApiItemToRecord(item: AccessLogReportItem): AccessRecord {
    const dateObj = this.parseBackendDate(item.date);

    let personType: AccessRecord['personType'] = 'Desconocido';
    if (item.personType === 'MEMBER') {
      personType = 'Miembro';
    } else if (item.personType === 'STAFF') {
      personType = 'Colaborador';
    }

    const status: AccessRecord['status'] =
      item.result === 'GRANTED' ? 'Exitoso' : 'Rechazado';

    return {
      id: item.id,
      date: dateObj,
      time: item.time,
      personName: item.fullName,
      personRut: item.rut,
      personType,
      accessType: 'Entrada', // solo registramos entradas
      branchId: item.branchId,
      branchName: item.branchName,
      status,
    };
  }

  // =======================
  // Acciones de UI
  // =======================
  clearFilters(): void {
    this.filterForm.reset({
      branchId: this.isSuperAdmin ? null : this.currentUserBranchId,
      personType: 'all',
      searchText: '',
      startDate: null,
      endDate: null,
    });

    this.filterBranchId.set(this.isSuperAdmin ? null : this.currentUserBranchId);
    this.filterPersonType.set('all');
    this.filterSearchText.set('');
    this.filterStartDate.set(null);
    this.filterEndDate.set(null);
  }

  refreshData(): void {
    this.loadAccessData();
  }

  /**
   * Exporta a CSV/Excel usando el endpoint del backend:
   * GET /api/reports/access-logs/export
   */
  exportToExcel(): void {
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();

    if (!startDate || !endDate) {
      alert('Por favor, selecciona un rango de fechas para exportar.');
      return;
    }

    const personTypeFilter = this.filterPersonType();

    const filters: AccessReportFilters = {
      from: startDate,
      to: endDate,
      personType: personTypeFilter as PersonTypeFilter,
    };

    // Solo enviamos branchId explícito si el usuario es super admin
    if (this.isSuperAdmin && this.filterBranchId()) {
      filters.branchId = this.filterBranchId()!;
    }

    this.reports.exportAccessLogs(filters).subscribe({
      next: (blob) => {
        if (typeof window === 'undefined') {
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const startStr = this.formatDate(startDate);
        const endStr = this.formatDate(endDate);

        a.download = `Accesos_${startStr}_${endStr}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error exportando reporte de accesos', err);
        alert('Ocurrió un error al exportar el reporte.');
      },
    });
  }

  // =======================
  // Helpers para el template
  // =======================
  formatDate(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  getStatusClass(status: string): string {
    return status === 'Exitoso' ? 'status-success' : 'status-error';
  }

  getAccessTypeIcon(accessType: string): string {
    // Solo usamos Entrada, pero dejamos la lógica completa por si cambia
    return accessType === 'Entrada' ? 'login' : 'logout';
  }

  getBranchName(branchId: string | null): string {
    if (!branchId) return 'Todas las Sucursales';

    const branch = this.availableBranches.find((b) => b.id === branchId);
    return branch ? branch.name : 'Sucursal';
  }

  getCurrentUserBranchName(): string {
    if (!this.currentUserBranchId) {
      return 'Sucursal actual';
    }
    return this.getBranchName(this.currentUserBranchId);
  }
}
