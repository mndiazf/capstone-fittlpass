import {
  Component, signal, ViewChild, ElementRef, OnDestroy, HostBinding,
  OnInit, Inject
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { RutService } from '../../../core/services/rut.service';
import { StaffService, StaffMember } from '../../../core/services/staff.service';

interface Profile {
  id: string;
  name: string;
  color: string;
  requiresPassword: boolean;
}

interface Branch {
  id: string;
  name: string;
}

type EnrollmentView = 'form' | 'camera' | 'review' | 'processing' | 'success';

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
    MatTooltipModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  /** Solo reflejamos el tema global en este host (no tocamos el global) */
  @HostBinding('attr.data-theme') dataTheme: 'light' | 'dark' | null = null;
  private themeObserver?: MutationObserver;

  userForm: FormGroup;
  searchForm: FormGroup;
  profiles = signal<Profile[]>([]);
  branches = signal<Branch[]>([]);
  editingUser = signal<StaffMember | null>(null);
  isEditMode = signal(false);
  isSearching = signal(false);

  // Enrollment
  enrollmentView = signal<EnrollmentView>('form');
  showEnrollmentModal = signal(false);
  faceDetected = signal(false);
  capturedImage = signal('');
  private stream: MediaStream | null = null;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private rutService: RutService,
    private staffService: StaffService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.searchForm = this.fb.group({
      searchTerm: ['', [Validators.required]]
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
      branchId: ['', Validators.required],
      isActive: [true],
      hasEnrollment: [false]
    });

    this.initializeProfiles();
    this.loadBranches();

    this.userForm.get('profileId')?.valueChanges.subscribe(() => {
      this.updatePasswordValidation();
    });
  }

  // ============================================
  // THEME: seguir data-theme del <html> sin tocarlo
  // ============================================
  ngOnInit(): void {
    this.syncThemeFromHtml();
    this.observeGlobalTheme();
  }

  private syncThemeFromHtml(): void {
    const t = this.document?.documentElement?.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') {
      this.dataTheme = t;          // activa tus selectores :host([data-theme="..."])
    } else {
      this.dataTheme = null;       // sin atributo => estilos por defecto del componente
    }
  }

  private observeGlobalTheme(): void {
    if (!this.document?.documentElement) return;
    this.themeObserver = new MutationObserver(() => this.syncThemeFromHtml());
    this.themeObserver.observe(this.document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  // ============================================
  // VALIDADORES PERSONALIZADOS
  // ============================================
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
  // INICIALIZACIÓN
  // ============================================
  initializeProfiles(): void {
    const defaultProfiles: Profile[] = [
      { id: '1', name: 'Administrador',    color: '#9747FF', requiresPassword: true  },
      { id: '2', name: 'Recepcionista',    color: '#06b6d4', requiresPassword: true  },
      { id: '3', name: 'Personal Trainer', color: '#f97316', requiresPassword: false }
    ];

    localStorage.setItem('gymhealth_profiles', JSON.stringify(defaultProfiles));
    this.profiles.set(defaultProfiles);
    console.log('✅ Perfiles inicializados:', this.profiles());
  }

  loadBranches(): void {
    const stored = localStorage.getItem('gymhealth_branches');
    if (stored) {
      this.branches.set(JSON.parse(stored));
    } else {
      const defaultBranches: Branch[] = [
        { id: '1', name: 'Sucursal Centro' },
        { id: '2', name: 'Sucursal Norte' },
        { id: '3', name: 'Sucursal Sur' }
      ];
      this.branches.set(defaultBranches);
      localStorage.setItem('gymhealth_branches', JSON.stringify(defaultBranches));
    }
  }

  // ============================================
  // BÚSQUEDA
  // ============================================
  searchUser(): void {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.trim();

    if (!searchTerm) {
      this.showMessage('Ingresa un RUT para buscar');
      return;
    }

    const rutError = this.rutService.getErrorMessage(searchTerm);
    if (rutError) {
      this.showMessage(rutError);
      return;
    }

    this.isSearching.set(true);
    const formattedRut = this.rutService.formatRut(searchTerm);

    this.staffService.getByRut(formattedRut).subscribe({
      next: (staff: StaffMember) => {
        this.loadUserData(staff);
        this.showMessage('✓ Usuario encontrado - Puedes modificar los datos');
        this.isSearching.set(false);
      },
      error: () => {
        this.clearFormKeepSearch();
        this.showMessage('⚠ Usuario no encontrado - Completa el formulario para crear uno nuevo');
        this.userForm.patchValue({ rut: formattedRut });
        this.isSearching.set(false);
      }
    });
  }

  loadUserData(staff: StaffMember): void {
    this.editingUser.set(staff);
    this.isEditMode.set(true);
    const { password, ...staffWithoutPassword } = staff as any;
    this.userForm.patchValue(staffWithoutPassword);
    this.searchForm.patchValue({ searchTerm: staff.rut });

    // Importante: refresca validación luego de cargar
    setTimeout(() => this.updatePasswordValidation(), 100);
  }

  // ============================================
  // GUARDAR (CREAR O ACTUALIZAR)
  // ============================================
  saveUser(): void {
    const formData = this.userForm.value;

    if (!formData.firstName || !formData.paternalLastName || !formData.maternalLastName) {
      this.showMessage('⚠ Por favor completa todos los nombres requeridos');
      return;
    }

    if (!formData.rut) {
      this.showMessage('⚠ El RUT es requerido');
      return;
    }

    const emailControl = this.userForm.get('email');
    if (!formData.email || emailControl?.hasError('invalidEmail')) {
      this.showMessage('⚠ Ingresa un email válido (ejemplo@correo.com)');
      return;
    }

    if (!formData.profileId) {
      this.showMessage('⚠ Debes seleccionar un perfil');
      return;
    }

    if (!formData.branchId) {
      this.showMessage('⚠ Debes seleccionar una sucursal');
      return;
    }

    const rutError = this.rutService.getErrorMessage(formData.rut);
    if (rutError) {
      this.showMessage(`✗ Error en RUT: ${rutError}`);
      return;
    }

    const profile = this.profiles().find(p => p.id === formData.profileId);

    // Validar contraseña SOLO si el perfil lo requiere Y es usuario nuevo
    if (!this.isEditMode() && profile?.requiresPassword) {
      const passwordControl = this.userForm.get('password');

      if (!formData.password) {
        this.showMessage('⚠ La contraseña es requerida para este perfil');
        return;
      }

      if (passwordControl?.hasError('minLength')) {
        this.showMessage('⚠ La contraseña debe tener al menos 8 caracteres');
        return;
      }

      if (passwordControl?.hasError('uppercase')) {
        this.showMessage('⚠ La contraseña debe contener al menos una mayúscula');
        return;
      }

      if (passwordControl?.hasError('lowercase')) {
        this.showMessage('⚠ La contraseña debe contener al menos una minúscula');
        return;
      }

      if (passwordControl?.hasError('number')) {
        this.showMessage('⚠ La contraseña debe contener al menos un número');
        return;
      }

      if (passwordControl?.hasError('special')) {
        this.showMessage('⚠ La contraseña debe contener al menos un carácter especial (!@#$%^&*)');
        return;
      }
    }

    const branch = this.branches().find(b => b.id === formData.branchId);
    const formattedRut = this.rutService.formatRut(formData.rut);

    const staffData: any = {
      firstName: formData.firstName,
      secondName: formData.secondName || '',
      paternalLastName: formData.paternalLastName,
      maternalLastName: formData.maternalLastName,
      rut: formattedRut,
      email: formData.email,
      profileId: formData.profileId,
      profileName: profile?.name || '',
      branchId: formData.branchId,
      branchName: branch?.name || '',
      isActive: formData.isActive,
      hasEnrollment: this.editingUser()?.hasEnrollment || false,
      enrollmentLocked: false
    };

    if (this.editingUser()?.id) {
      staffData.id = this.editingUser()!.id;
    }

    // Agregar contraseña SOLO si no es Personal Trainer
    if (profile?.name !== 'Personal Trainer' && formData.password) {
      staffData.password = formData.password;
    }

    this.staffService.save(staffData).subscribe({
      next: (saved: StaffMember) => {
        if (this.isEditMode()) {
          this.showMessage('✓ Usuario actualizado correctamente');
        } else {
          this.showMessage('✓ Usuario creado correctamente - Ahora puedes enrolarlo facialmente');
        }

        this.editingUser.set(saved);
        this.isEditMode.set(true);

        const { password, ...savedWithoutPassword } = saved as any;
        this.userForm.patchValue(savedWithoutPassword);
        this.updatePasswordValidation();
      },
      error: (err) => {
        console.error('❌ Error al guardar usuario:', err);
        this.showMessage('✗ Error al guardar usuario: ' + (err.message || 'Error desconocido'));
      }
    });
  }

  // ============================================
  // ENROLLMENT FACIAL
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
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
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

    const blob = this.staffService.dataUrlToBlob(image);

    this.staffService.enrollFace(user.id, blob).subscribe({
      next: () => {
        this.enrollmentView.set('success');
        const updated = { ...user, hasEnrollment: true, lastEnrollment: new Date().toLocaleDateString('es-CL') };
        this.editingUser.set(updated);
        this.userForm.patchValue({ hasEnrollment: true });

        setTimeout(() => this.closeEnrollmentModal(), 2000);
      },
      error: (err) => {
        console.error('Error al enrolar:', err);
        this.showMessage('✗ Error al enrolar usuario');
        this.closeEnrollmentModal();
      }
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
      this.stream.getTracks().forEach(track => track.stop());
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
    this.userForm.reset({ isActive: true, hasEnrollment: false });
    this.searchForm.reset();
    this.updatePasswordValidation();
    this.showMessage('✓ Formulario limpiado - Listo para nuevo usuario');
  }

  clearFormKeepSearch(): void {
    this.editingUser.set(null);
    this.isEditMode.set(false);
    this.userForm.reset({ isActive: true, hasEnrollment: false });
    this.updatePasswordValidation();
  }

  updatePasswordValidation(): void {
    const passwordControl = this.userForm.get('password');
    const profileId = this.userForm.get('profileId')?.value;
    const profile = this.profiles().find(p => p.id === profileId);

    if (!this.isEditMode() && profile?.requiresPassword) {
      passwordControl?.setValidators([
        Validators.required,
        this.strongPasswordValidator
      ]);
    } else {
      passwordControl?.clearValidators();
    }

    passwordControl?.updateValueAndValidity();
  }

  requiresPassword(): boolean {
    const profileId = this.userForm.get('profileId')?.value;
    const profile = this.profiles().find(p => p.id === profileId);

    // Mostrar campo SOLO si NO es modo edición Y el perfil requiere contraseña
    if (!this.isEditMode() && profile?.requiresPassword) {
      return true;
    }

    return false;
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
      verticalPosition: 'top'
    });
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
    this.stopCamera();
  }
}
