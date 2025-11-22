import {
  Component,
  signal,
  ViewChild,
  ElementRef,
  OnDestroy,
  HostBinding,
  OnInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import {
  CommonModule,
  DOCUMENT,
  isPlatformBrowser,
} from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { RutService } from '../../../core/services/rut.service';
import {
  StaffUserDto,
  StaffUserSearchResult,
  CreateStaffUserPayload,
  UpdateStaffUserPayload,
  StaffManagement,
} from '../../../core/services/staff/staff-management';
// ⬇️ Usamos el servicio Enrollment para el endpoint de embedding

import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  catchError,
} from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import {
  ProfileDto,
  ProfileManagement,
} from '../../../core/services/profiles/profile-management';
import { Enrollment } from '../../../core/services/enrollment/enrollment';

type EnrollmentView = 'form' | 'camera' | 'review' | 'processing' | 'success';

/**
 * ViewModel local para el selector de perfiles.
 */
interface StaffProfileVM {
  id: string;
  name: string;
  description: string | null;
  branchId: string;
  isDefault: boolean;
  requiresPassword: boolean;
}

/** Nombres de perfiles que SÍ usan contraseña (según seed) */
const PASSWORD_PROFILE_NAMES = [
  'Administrador de Sucursal',
  'Recepcionista',
];

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatOptionModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatAutocompleteModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  /** Tema local */
  @HostBinding('attr.data-theme') dataTheme: 'light' | 'dark' | null = null;
  private themeObserver?: MutationObserver;

  userForm: FormGroup;
  searchForm: FormGroup;

  profiles = signal<StaffProfileVM[]>([]);
  searchResults = signal<StaffUserSearchResult[]>([]);

  // Sucursal actual (desde JWT / payload)
  currentBranchId = signal<string | null>(null);
  currentBranchName = signal<string | null>(null);

  editingUser = signal<
    (StaffUserDto & { hasEnrollment?: boolean; lastEnrollment?: string | null }) | null
  >(null);

  isEditMode = signal(false);
  isSearching = signal(false);

  // Enrollment
  enrollmentView = signal<EnrollmentView>('form');
  showEnrollmentModal = signal(false);
  faceDetected = signal(false);
  capturedImage = signal('');
  private stream: MediaStream | null = null;

  private searchSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private rutService: RutService,
    private managementService: StaffManagement,
    private enrollmentService: Enrollment, // <- servicio que llama al endpoint de embedding
    private profileManagement: ProfileManagement, // perfiles
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
    });

    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      secondName: [''],
      paternalLastName: ['', [Validators.required, Validators.minLength(2)]],
      maternalLastName: ['', [Validators.required, Validators.minLength(2)]],
      rut: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email, this.emailValidator]],
      password: [''],
      profileId: ['', Validators.required],
      branchId: [''], // se setea automáticamente
      isActive: [true],
      hasEnrollment: [false],
    });

    // Cambios de perfil => recalcular validación de password
    this.userForm.get('profileId')?.valueChanges.subscribe(() => {
      this.updatePasswordValidation();
    });

    // Autocomplete de buscador (por nombre o RUT)
    const searchControl = this.searchForm.get('searchTerm');
    if (searchControl) {
      this.searchSub = searchControl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((value) => !!value && typeof value === 'string'),
          switchMap((value: string) => {
            const term = value.trim();
            if (term.length < 2) {
              this.searchResults.set([]);
              return of<StaffUserSearchResult[]>([]);
            }

            this.isSearching.set(true);
            const branchId = this.currentBranchId() ?? undefined;

            return this.managementService.searchStaffUsers(term, branchId).pipe(
              catchError((err) => {
                console.error('Error buscando colaboradores:', err);
                this.showMessage('Error buscando colaboradores');
                return of<StaffUserSearchResult[]>([]);
              }),
            );
          }),
        )
        .subscribe((results) => {
          this.searchResults.set(results);
          this.isSearching.set(false);
        });
    }
  }

  // ============================================
  // THEME + INICIALIZACIÓN
  // ============================================
  ngOnInit(): void {
    this.syncThemeFromHtml();
    this.observeGlobalTheme();

    if (isPlatformBrowser(this.platformId)) {
      this.loadCurrentBranchFromToken();
    }
  }

  private syncThemeFromHtml(): void {
    const t = this.document?.documentElement?.getAttribute('data-theme');
    this.dataTheme = t === 'light' || t === 'dark' ? t : null;
  }

  private observeGlobalTheme(): void {
    if (!this.document?.documentElement) return;
    this.themeObserver = new MutationObserver(() => this.syncThemeFromHtml());
    this.themeObserver.observe(this.document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  /**
   * Lee la sucursal actual desde localStorage / JWT y carga perfiles
   */
  private loadCurrentBranchFromToken(): void {
    try {
      let payload: any | null = null;

      const storedPayload =
        localStorage.getItem('fitpass_admin_payload') ||
        localStorage.getItem('fitpass_payload');

      if (storedPayload) {
        payload = JSON.parse(storedPayload);
      } else {
        const token =
          localStorage.getItem('fitpass_admin_token') ||
          localStorage.getItem('fitpass_token');

        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const json = atob(base64);
            payload = JSON.parse(json);
          }
        }
      }

      const branch = payload?.branches?.[0];
      if (branch?.id) {
        this.currentBranchId.set(branch.id);
        this.currentBranchName.set(branch.name || branch.code || 'Sucursal actual');

        this.userForm.patchValue({ branchId: branch.id }, { emitEvent: false });

        this.loadProfilesForBranch(branch.id);
      } else {
        console.warn('No se encontraron branches en el payload JWT');
        this.showMessage('✗ No se pudo obtener la sucursal actual. Verifica tu sesión.');
      }
    } catch (err) {
      console.error('Error leyendo sucursal desde token:', err);
      this.showMessage('✗ Error obteniendo sucursal actual. Verifica tu sesión.');
    }
  }

  // ============================================
  // VALIDADORES
  // ============================================
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      return { invalidEmail: true };
    }
    return null;
  }

  strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const errors: any = {};
    if (value.length < 8) errors.minLength = true;
    if (!/[A-Z]/.test(value)) errors.uppercase = true;
    if (!/[a-z]/.test(value)) errors.lowercase = true;
    if (!/[0-9]/.test(value)) errors.number = true;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) errors.special = true;

    return Object.keys(errors).length > 0 ? errors : null;
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.userForm.get('password');
    if (!passwordControl || !passwordControl.errors) return '';

    const errors = passwordControl.errors;
    const messages: string[] = [];

    if (errors['required']) return 'La contraseña es requerida';
    if (errors['minLength']) messages.push('mínimo 8 caracteres');
    if (errors['uppercase']) messages.push('una mayúscula');
    if (errors['lowercase']) messages.push('una minúscula');
    if (errors['number']) messages.push('un número');
    if (errors['special']) messages.push('un carácter especial');

    return messages.length > 0 ? `Debe contener: ${messages.join(', ')}` : '';
  }

  // ============================================
  // CARGA DE PERFILES (desde ProfileManagement)
  // ============================================
  private loadProfilesForBranch(branchId: string): void {
    this.profileManagement.getAllProfiles(branchId).subscribe({
      next: (profiles: ProfileDto[]) => {
        const mapped: StaffProfileVM[] = profiles.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          branchId: p.branchId,
          isDefault: p.isDefault,
          // Sólo ADMIN y RECEPCIONISTA usan contraseña
          requiresPassword: PASSWORD_PROFILE_NAMES.includes(p.name),
        }));

        this.profiles.set(mapped);
        this.updatePasswordValidation();
      },
      error: (err) => {
        console.error('Error cargando perfiles:', err);
        this.showMessage('Error al cargar perfiles de la sucursal');
        this.profiles.set([]);
        this.updatePasswordValidation();
      },
    });
  }

  // ============================================
  // BUSCADOR
  // ============================================
  displaySearchOption(option: StaffUserSearchResult | string | null): string {
    if (!option) return '';
    if (typeof option === 'string') return option;
    return `${option.fullName} (${option.rut})`;
  }

  clearSearch(): void {
    this.searchForm.patchValue({ searchTerm: '' }, { emitEvent: false });
    this.searchResults.set([]);
  }

  onSearchOptionSelected(option: StaffUserSearchResult): void {
    if (!option?.id) return;
    this.loadUserById(option.id);
  }

  searchUser(): void {
    const controlValue = this.searchForm.get('searchTerm')?.value;

    if (controlValue && typeof controlValue === 'object' && 'id' in controlValue) {
      this.onSearchOptionSelected(controlValue as StaffUserSearchResult);
      return;
    }

    const term = (controlValue ?? '').toString().trim();
    if (!term) {
      this.showMessage('Ingresa nombre o RUT para buscar');
      return;
    }

    this.isSearching.set(true);
    const branchId = this.currentBranchId() ?? undefined;

    this.managementService.searchStaffUsers(term, branchId).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);

        if (results.length === 1) {
          this.loadUserById(results[0].id);
        } else if (results.length === 0) {
          this.showMessage(
            'Sin resultados. Completa el formulario para crear un nuevo colaborador.',
          );
        } else {
          this.showMessage(
            `${results.length} resultados. Selecciona uno desde la lista.`,
          );
        }
      },
      error: (err) => {
        console.error('Error buscando colaboradores:', err);
        this.showMessage('Error buscando colaboradores');
        this.isSearching.set(false);
      },
    });
  }

  private loadUserById(userId: string): void {
    this.managementService.getStaffUserById(userId).subscribe({
      next: (user) => {
        this.loadUserData(user as any);

        // Limpia el input y los resultados después de seleccionar
        this.searchForm.patchValue({ searchTerm: '' }, { emitEvent: false });
        this.searchResults.set([]);

        this.showMessage('✓ Usuario encontrado - Puedes modificar los datos');
      },
      error: (err) => {
        console.error('Error obteniendo colaborador:', err);
        this.showMessage('Error obteniendo datos del colaborador');
      },
    });
  }

  loadUserData(
    user: StaffUserDto & { hasEnrollment?: boolean; lastEnrollment?: string | null },
  ): void {
    this.editingUser.set(user);
    this.isEditMode.set(true);

    this.userForm.patchValue(
      {
        firstName: user.firstName,
        secondName: user.middleName ?? '',
        paternalLastName: user.lastName,
        maternalLastName: user.secondLastName ?? '',
        rut: user.rut,
        email: user.email,
        profileId: user.profileId,
        branchId: user.branchId,
        isActive: user.active,
        hasEnrollment: user.hasEnrollment ?? false,
      },
      { emitEvent: false },
    );

    setTimeout(() => this.updatePasswordValidation(), 50);
  }

  // ============================================
  // GUARDAR (CREAR / ACTUALIZAR)
  // ============================================
  saveUser(): void {
    const formData = this.userForm.value;

    if (!formData.firstName || !formData.paternalLastName || !formData.maternalLastName) {
      this.showMessage('⚠ Completa todos los nombres requeridos');
      return;
    }

    if (!formData.rut) {
      this.showMessage('⚠ El RUT es requerido');
      return;
    }

    const emailControl = this.userForm.get('email');
    if (
      !formData.email ||
      emailControl?.hasError('invalidEmail') ||
      emailControl?.hasError('email')
    ) {
      this.showMessage('⚠ Ingresa un email válido (ejemplo@correo.com)');
      return;
    }

    if (!formData.profileId) {
      this.showMessage('⚠ Debes seleccionar un perfil');
      return;
    }

    const branchId = this.currentBranchId();
    if (!branchId) {
      this.showMessage('✗ No se pudo determinar la sucursal actual');
      return;
    }

    const rutError = this.rutService.getErrorMessage(formData.rut);
    if (rutError) {
      this.showMessage(`✗ Error en RUT: ${rutError}`);
      return;
    }

    const formattedRut = this.rutService.formatRut(formData.rut);
    const profile = this.profiles().find((p) => p.id === formData.profileId);
    const passwordControl = this.userForm.get('password');

    // Contraseña obligatoria SOLO al crear si el perfil la requiere
    if (!this.isEditMode() && profile?.requiresPassword) {
      if (!formData.password) {
        this.showMessage('⚠ La contraseña es requerida para este perfil');
        return;
      }

      if (passwordControl?.errors) {
        this.showMessage(
          this.getPasswordErrorMessage() || '⚠ La contraseña no cumple los requisitos',
        );
        return;
      }
    }

    if (!this.isEditMode()) {
      const payload: CreateStaffUserPayload = {
        firstName: formData.firstName.trim(),
        middleName: formData.secondName || null,
        lastName: formData.paternalLastName.trim(),
        secondLastName: formData.maternalLastName.trim(),
        rut: formattedRut,
        email: formData.email.trim(),
        phone: null,
        branchId,
        profileId: formData.profileId,
        isActive: formData.isActive,
        password: profile?.requiresPassword ? formData.password : undefined,
      };

      this.managementService.createStaffUser(payload).subscribe({
        next: (created) => this.afterSaveSuccess(created as any, false),
        error: (err) => {
          console.error('Error creando usuario:', err);
          this.showMessage(
            '✗ Error al crear usuario: ' +
              (err?.error?.message || err.message || 'Error desconocido'),
          );
        },
      });
    } else {
      const payload: UpdateStaffUserPayload = {
        firstName: formData.firstName.trim(),
        middleName: formData.secondName || null,
        lastName: formData.paternalLastName.trim(),
        secondLastName: formData.maternalLastName.trim(),
        email: formData.email.trim(),
        branchId,
        profileId: formData.profileId,
        isActive: formData.isActive,
      };

      if (profile?.requiresPassword && formData.password) {
        payload.password = formData.password;
      }

      const userId = this.editingUser()?.id;
      if (!userId) {
        this.showMessage('✗ Error interno: falta ID de usuario');
        return;
      }

      this.managementService.updateStaffUser(userId, payload).subscribe({
        next: (updated) => this.afterSaveSuccess(updated as any, true),
        error: (err) => {
          console.error('Error actualizando usuario:', err);
          this.showMessage(
            '✗ Error al actualizar usuario: ' +
              (err?.error?.message || err.message || 'Error desconocido'),
          );
        },
      });
    }
  }

  private afterSaveSuccess(user: StaffUserDto, wasEdit: boolean): void {
    const previousEnroll = this.editingUser()?.hasEnrollment ?? false;
    const previousLast = this.editingUser()?.lastEnrollment ?? null;

    const enriched = {
      ...(user as any),
      hasEnrollment: previousEnroll,
      lastEnrollment: previousLast,
    };

    this.loadUserData(enriched);
    this.userForm.patchValue({ password: '' }, { emitEvent: false });
    this.updatePasswordValidation();

    if (wasEdit) {
      this.showMessage('✓ Usuario actualizado correctamente');
    } else {
      this.showMessage(
        '✓ Usuario creado correctamente - Ahora puedes enrolarlo facialmente',
      );
    }
  }

  // ============================================
  // ENROLLMENT FACIAL (usa Enrollment)
  // ============================================
  openEnrollmentModal(): void {
    if (!this.editingUser()) {
      this.showMessage('⚠ Primero debes guardar el usuario antes de enrolarlo');
      return;
    }
    this.enrollmentView.set('camera');
    this.showEnrollmentModal.set(true);
    setTimeout(() => this.startCamera(), 300);
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        setTimeout(() => this.faceDetected.set(true), 2000);
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      this.showMessage('✗ Error al acceder a la cámara - Verifica los permisos');
      this.closeEnrollmentModal();
    }
  }

  captureImage(): void {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedImage.set(canvas.toDataURL('image/jpeg', 0.9));
    this.stopCamera();
    this.enrollmentView.set('review');
  }

  retakePhoto(): void {
    this.capturedImage.set('');
    this.faceDetected.set(false);
    this.enrollmentView.set('camera');
    setTimeout(() => this.startCamera(), 100);
  }

  confirmEnrollment(): void {
    const user = this.editingUser();
    const image = this.capturedImage();

    if (!user?.id || !image) {
      this.showMessage('✗ Error: Faltan datos del usuario');
      return;
    }

    this.enrollmentView.set('processing');

    // 🔥 Usamos el servicio Enrollment para convertir la imagen y llamar al endpoint:
    const blob = this.enrollmentService.dataUrlToBlob(image);

    this.enrollmentService.enrollFace(user.id, blob).subscribe({
      next: () => {
        this.enrollmentView.set('success');
        const updated = {
          ...user,
          hasEnrollment: true,
          lastEnrollment: new Date().toLocaleDateString('es-CL'),
        };
        this.editingUser.set(updated);
        this.userForm.patchValue({ hasEnrollment: true });

        setTimeout(() => this.closeEnrollmentModal(), 2000);
      },
      error: (err) => {
        console.error('Error al enrolar:', err);
        this.showMessage('✗ Error al enrolar usuario');
        this.closeEnrollmentModal();
      },
    });
  }

  closeEnrollmentModal(): void {
    this.stopCamera();
    this.showEnrollmentModal.set(false);
    this.enrollmentView.set('form');
    this.capturedImage.set('');
    this.faceDetected.set(false);
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================
  clearForm(): void {
    this.editingUser.set(null);
    this.isEditMode.set(false);
    this.userForm.reset({
      isActive: true,
      hasEnrollment: false,
      branchId: this.currentBranchId(),
    });
    this.searchForm.reset();
    this.searchResults.set([]);
    this.updatePasswordValidation();
    this.showMessage('✓ Formulario limpiado - Listo para nuevo usuario');
  }

  updatePasswordValidation(): void {
    const passwordControl = this.userForm.get('password');
    if (!passwordControl) return;

    const profileId = this.userForm.get('profileId')?.value;
    const profile = this.profiles().find((p) => p.id === profileId);

    if (profile?.requiresPassword) {
      const validators: any[] = [this.strongPasswordValidator];
      if (!this.isEditMode()) {
        validators.unshift(Validators.required);
      }
      passwordControl.setValidators(validators);
    } else {
      // si el perfil NO usa contraseña, limpiamos value y validadores
      passwordControl.setValue('', { emitEvent: false });
      passwordControl.clearValidators();
    }

    passwordControl.updateValueAndValidity();
  }

  requiresPassword(): boolean {
    const profileId = this.userForm.get('profileId')?.value;
    const profile = this.profiles().find((p) => p.id === profileId);
    return !!profile?.requiresPassword;
  }

  formatRut(event: any): void {
    let value = event.target.value.replace(/[^0-9kK]/g, '');
    if (value.length === 0) return;

    const dv = value.slice(-1);
    const rut = value.slice(0, -1);

    if (rut.length === 0) {
      this.userForm.patchValue({ rut: value }, { emitEvent: false });
      return;
    }

    let formatted = '';
    const reversed = rut.split('').reverse().join('');

    for (let i = 0; i < reversed.length; i++) {
      if (i > 0 && i % 3 === 0) {
        formatted = '.' + formatted;
      }
      formatted = reversed[i] + formatted;
    }

    formatted = formatted + '-' + dv.toUpperCase();
    this.userForm.patchValue({ rut: formatted }, { emitEvent: false });
  }

  showMessage(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.stopCamera();
    this.searchSub?.unsubscribe();
  }
}
