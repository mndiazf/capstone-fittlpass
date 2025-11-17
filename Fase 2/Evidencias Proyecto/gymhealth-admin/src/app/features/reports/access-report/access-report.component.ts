// src/app/features/reports/access-report/access-report.component.ts

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../core/services/auth.service';

export interface AccessRecord {
  id: number;
  date: Date;
  time: string;
  personName: string;
  personRut: string;
  personType: 'Miembro' | 'Colaborador';
  accessType: 'Entrada' | 'Salida';
  branchId: number;
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
    MatChipsModule
  ],
  templateUrl: './access-report.component.html',
  styleUrls: ['./access-report.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme'
  }
})
export class AccessReportComponent implements OnInit {
  private authService = inject(AuthService);
  
  currentTheme: string = 'dark';
  
  // Contexto de sucursal
  currentUserBranchId: number | null = null;
  isSuperAdmin: boolean = false;
  availableBranches: { id: number; name: string }[] = [
    { id: 1, name: 'Sucursal Centro' },
    { id: 2, name: 'Sucursal Norte' },
    { id: 3, name: 'Sucursal Providencia' }
  ];

  // Columnas de la tabla
  displayedColumns: string[] = [
    'date',
    'time',
    'personName',
    'personRut',
    'personType',
    'accessType',
    'branchName',
    'status'
  ];

  // Filtros como FormGroup (para el HTML)
  filterForm = new FormGroup({
    branchId: new FormControl<number | null>(null),
    personType: new FormControl<string>('all'),
    searchText: new FormControl<string>(''),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null)
  });

  // 🆕 Filtros como SIGNALS (para reactividad en computed)
  private filterBranchId = signal<number | null>(null);
  private filterPersonType = signal<string>('all');
  private filterSearchText = signal<string>('');
  private filterStartDate = signal<Date | null>(null);
  private filterEndDate = signal<Date | null>(null);

  // Datos
  private allAccessRecords = signal<AccessRecord[]>([]);
  
  /**
   * 📊 VISTA EN TABLA: Últimos 20 registros con filtros aplicados
   * Ahora SÍ es reactivo gracias a los signals
   */
  filteredRecords = computed(() => {
    const records = this.allAccessRecords();
    const personType = this.filterPersonType();  // ✅ Ahora lee del signal
    const searchText = this.filterSearchText();  // ✅ Ahora lee del signal
    const startDate = this.filterStartDate();    // ✅ Ahora lee del signal
    const endDate = this.filterEndDate();        // ✅ Ahora lee del signal
    const selectedBranchId = this.filterBranchId(); // ✅ Ahora lee del signal

    console.log('🔄 Recalculando filteredRecords con:', {
      personType,
      searchText,
      selectedBranchId,
      startDate,
      endDate,
      totalRecords: records.length
    });

    const filtered = records.filter(record => {
      // 🔒 FILTRO 1: Sucursal (según permisos)
      if (this.isSuperAdmin) {
        if (selectedBranchId !== null && record.branchId !== selectedBranchId) {
          return false;
        }
      } else {
        if (this.currentUserBranchId !== null && record.branchId !== this.currentUserBranchId) {
          return false;
        }
      }

      // 👥 FILTRO 2: Tipo de persona (Miembro/Colaborador/Todos)
      if (personType !== 'all' && record.personType !== personType) {
        console.log(`❌ Vista: Excluido ${record.personName} (${record.personType}) - Filtro: ${personType}`);
        return false;
      }

      // 🔍 FILTRO 3: Búsqueda por nombre o RUT
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesName = record.personName.toLowerCase().includes(searchLower);
        const matchesRut = record.personRut.includes(searchText);
        if (!matchesName && !matchesRut) {
          return false;
        }
      }

      // 📅 FILTRO 4: Rango de fechas
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

      console.log(`✅ Vista: Incluido ${record.personName} (${record.personType})`);
      return true;
    });

    console.log(`📊 Vista - Registros filtrados: ${filtered.length}`);
    
    // 📊 Limitar a 20 registros para la vista
    return filtered.slice(0, 20);
  });

  ngOnInit() {
    this.currentUserBranchId = this.authService.getCurrentUserBranchId();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    
    if (this.isSuperAdmin) {
      this.filterForm.patchValue({ branchId: null });
      this.filterBranchId.set(null);
    } else {
      this.filterBranchId.set(this.currentUserBranchId);
    }
    
    this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    this.observeThemeChanges();
    
    this.loadAccessData();
    
    // 🆕 CRÍTICO: Sincronizar FormGroup con Signals
    this.filterForm.valueChanges.subscribe(values => {
      console.log('📝 Filtros cambiados:', values);
      
      this.filterBranchId.set(values.branchId ?? null);
      this.filterPersonType.set(values.personType ?? 'all');
      this.filterSearchText.set(values.searchText ?? '');
      this.filterStartDate.set(values.startDate ?? null);
      this.filterEndDate.set(values.endDate ?? null);
    });
  }

  private observeThemeChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  private loadAccessData() {
    // TODO: Reemplazar con llamada real al backend
    const mockData: AccessRecord[] = [
      {
        id: 1,
        date: new Date(2025, 10, 16, 14, 30),
        time: '14:30',
        personName: 'Juan Pérez González',
        personRut: '12.345.678-9',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 1,
        branchName: 'Sucursal Centro',
        status: 'Exitoso'
      },
      {
        id: 2,
        date: new Date(2025, 10, 16, 14, 25),
        time: '14:25',
        personName: 'María González Silva',
        personRut: '23.456.789-0',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 1,
        branchName: 'Sucursal Centro',
        status: 'Exitoso'
      },
      {
        id: 3,
        date: new Date(2025, 10, 16, 14, 20),
        time: '14:20',
        personName: 'Carlos Rodríguez',
        personRut: '15.678.901-2',
        personType: 'Colaborador',
        accessType: 'Entrada',
        branchId: 1,
        branchName: 'Sucursal Centro',
        status: 'Exitoso'
      },
      {
        id: 4,
        date: new Date(2025, 10, 16, 14, 15),
        time: '14:15',
        personName: 'Ana Martínez López',
        personRut: '19.876.543-K',
        personType: 'Miembro',
        accessType: 'Salida',
        branchId: 2,
        branchName: 'Sucursal Norte',
        status: 'Exitoso'
      },
      {
        id: 5,
        date: new Date(2025, 10, 16, 14, 10),
        time: '14:10',
        personName: 'Pedro Sánchez',
        personRut: '16.543.210-9',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 2,
        branchName: 'Sucursal Norte',
        status: 'Rechazado'
      },
      {
        id: 6,
        date: new Date(2025, 10, 16, 13, 45),
        time: '13:45',
        personName: 'Laura Fernández',
        personRut: '18.234.567-8',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 3,
        branchName: 'Sucursal Providencia',
        status: 'Exitoso'
      },
      {
        id: 7,
        date: new Date(2025, 10, 16, 13, 30),
        time: '13:30',
        personName: 'Diego Torres Muñoz',
        personRut: '17.654.321-0',
        personType: 'Colaborador',
        accessType: 'Entrada',
        branchId: 1,
        branchName: 'Sucursal Centro',
        status: 'Exitoso'
      },
      {
        id: 8,
        date: new Date(2025, 10, 16, 13, 15),
        time: '13:15',
        personName: 'Sofía Vargas',
        personRut: '20.111.222-3',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 2,
        branchName: 'Sucursal Norte',
        status: 'Exitoso'
      },
      {
        id: 9,
        date: new Date(2025, 10, 16, 13, 0),
        time: '13:00',
        personName: 'Roberto Díaz',
        personRut: '14.333.444-5',
        personType: 'Miembro',
        accessType: 'Salida',
        branchId: 1,
        branchName: 'Sucursal Centro',
        status: 'Exitoso'
      },
      {
        id: 10,
        date: new Date(2025, 10, 16, 12, 45),
        time: '12:45',
        personName: 'Valentina Ruiz',
        personRut: '21.555.666-7',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 3,
        branchName: 'Sucursal Providencia',
        status: 'Exitoso'
      },
      {
        id: 11,
        date: new Date(2025, 10, 16, 12, 30),
        time: '12:30',
        personName: 'Andrés Morales',
        personRut: '22.666.777-8',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 1,
        branchName: 'Sucursal Centro',
        status: 'Exitoso'
      },
      {
        id: 12,
        date: new Date(2025, 10, 16, 12, 15),
        time: '12:15',
        personName: 'Carolina Vega',
        personRut: '13.888.999-K',
        personType: 'Colaborador',
        accessType: 'Entrada',
        branchId: 2,
        branchName: 'Sucursal Norte',
        status: 'Exitoso'
      },
      {
        id: 13,
        date: new Date(2025, 10, 16, 12, 0),
        time: '12:00',
        personName: 'Tomás Silva',
        personRut: '24.123.456-7',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 3,
        branchName: 'Sucursal Providencia',
        status: 'Rechazado'
      },
      {
        id: 14,
        date: new Date(2025, 10, 16, 11, 45),
        time: '11:45',
        personName: 'Francisca Rojas',
        personRut: '25.234.567-8',
        personType: 'Miembro',
        accessType: 'Salida',
        branchId: 1,
        branchName: 'Sucursal Centro',
        status: 'Exitoso'
      },
      {
        id: 15,
        date: new Date(2025, 10, 16, 11, 30),
        time: '11:30',
        personName: 'Ignacio Castro',
        personRut: '26.345.678-9',
        personType: 'Miembro',
        accessType: 'Entrada',
        branchId: 2,
        branchName: 'Sucursal Norte',
        status: 'Exitoso'
      }
    ];

    this.allAccessRecords.set(mockData);
  }

  clearFilters() {
    this.filterForm.reset({
      branchId: this.isSuperAdmin ? null : this.currentUserBranchId,
      personType: 'all',
      searchText: '',
      startDate: null,
      endDate: null
    });
    
    // 🆕 También resetear los signals
    this.filterBranchId.set(this.isSuperAdmin ? null : this.currentUserBranchId);
    this.filterPersonType.set('all');
    this.filterSearchText.set('');
    this.filterStartDate.set(null);
    this.filterEndDate.set(null);
  }

  refreshData() {
    this.loadAccessData();
  }

  /**
   * 📥 EXPORTAR A EXCEL: Exporta TODOS los registros que cumplan los filtros
   * NO limita a 20 registros, exporta el conjunto completo
   */
  exportToExcel() {
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();

    if (!startDate || !endDate) {
      alert('Por favor, selecciona un rango de fechas para exportar.');
      return;
    }

    // Obtener filtros activos
    const personType = this.filterPersonType();
    const searchText = this.filterSearchText();
    const selectedBranchId = this.filterBranchId();

    console.log('📊 Iniciando exportación con filtros:', {
      personType,
      searchText,
      selectedBranchId,
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    });

    // 🔍 FILTRAR DATOS - APLICAR TODOS LOS FILTROS (sin límite de 20)
    const dataToExport = this.allAccessRecords().filter(record => {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // FILTRO 1: Rango de fechas (OBLIGATORIO)
      const inDateRange = record.date >= startDate && record.date <= endOfDay;
      if (!inDateRange) {
        return false;
      }
      
      // FILTRO 2: Sucursal (según permisos)
      if (this.isSuperAdmin) {
        if (selectedBranchId !== null && record.branchId !== selectedBranchId) {
          return false;
        }
      } else {
        if (this.currentUserBranchId !== null && record.branchId !== this.currentUserBranchId) {
          return false;
        }
      }
      
      // FILTRO 3: Tipo de persona (Miembro/Colaborador/Todos)
      if (personType && personType !== 'all' && record.personType !== personType) {
        console.log(`❌ Excluido: ${record.personName} es ${record.personType}, filtro: ${personType}`);
        return false;
      }

      // FILTRO 4: Búsqueda por nombre o RUT
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesName = record.personName.toLowerCase().includes(searchLower);
        const matchesRut = record.personRut.includes(searchText);
        if (!matchesName && !matchesRut) {
          return false;
        }
      }
      
      console.log(`✅ Incluido: ${record.personName} (${record.personType})`);
      return true;
    });

    console.log(`📊 Total registros a exportar: ${dataToExport.length}`);

    if (dataToExport.length === 0) {
      alert('No hay datos para exportar con los filtros aplicados.');
      return;
    }

    // Preparar datos para Excel
    const excelData = dataToExport.map(record => ({
      'Fecha': this.formatDate(record.date),
      'Hora': record.time,
      'Nombre': record.personName,
      'RUT': record.personRut,
      'Tipo': record.personType,
      'Acceso': record.accessType,
      'Sucursal': record.branchName,
      'Estado': record.status
    }));

    // Crear workbook
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Accesos');

    // Ajustar ancho de columnas
    const wscols = [
      { wch: 12 }, // Fecha
      { wch: 8 },  // Hora
      { wch: 30 }, // Nombre
      { wch: 15 }, // RUT
      { wch: 12 }, // Tipo
      { wch: 10 }, // Acceso
      { wch: 20 }, // Sucursal
      { wch: 10 }  // Estado
    ];
    ws['!cols'] = wscols;

    // Generar nombre de archivo con información de filtros
    let filenameParts: string[] = ['Accesos'];
    
    // Agregar sucursal al nombre
    if (this.isSuperAdmin && selectedBranchId === null) {
      filenameParts.push('TodasSucursales');
    } else {
      const branchName = this.getBranchName(selectedBranchId || this.currentUserBranchId);
      filenameParts.push(branchName.replace(/\s+/g, ''));
    }
    
    // Agregar tipo de persona si está filtrado
    if (personType && personType !== 'all') {
      filenameParts.push(personType + 's');
    }
    
    // Agregar fechas
    filenameParts.push(this.formatDate(startDate));
    filenameParts.push(this.formatDate(endDate));
    
    const fileName = `${filenameParts.join('_')}.xlsx`;

    console.log(`💾 Descargando archivo: ${fileName}`);

    // Descargar archivo
    XLSX.writeFile(wb, fileName);
  }

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  getStatusClass(status: string): string {
    return status === 'Exitoso' ? 'status-success' : 'status-error';
  }

  getAccessTypeIcon(accessType: string): string {
    return accessType === 'Entrada' ? 'login' : 'logout';
  }

  getPersonTypeColor(personType: string): string {
    return personType === 'Miembro' ? 'primary' : 'accent';
  }

  getBranchName(branchId: number | null): string {
    if (branchId === null) return 'Todas las Sucursales';
    const branch = this.availableBranches.find(b => b.id === branchId);
    return branch ? branch.name : 'Sucursal Desconocida';
  }

  getCurrentUserBranchName(): string {
    if (this.currentUserBranchId === null) return 'Sin Sucursal';
    return this.getBranchName(this.currentUserBranchId);
  }
}