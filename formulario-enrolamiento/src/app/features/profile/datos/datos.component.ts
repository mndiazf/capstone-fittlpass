import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-datos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './datos.component.html',
  styleUrls: ['./datos.component.scss']
})
export class DatosComponent implements OnInit {
  datosForm: FormGroup;
  isEditing = false;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.datosForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
      direccion: [''],
      fechaNacimiento: ['', Validators.required],
      documento: ['', [Validators.required, Validators.pattern(/^[0-9]{7,12}$/)]],
      genero: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.datosForm.disable();
  }

  loadUserData() {
    // Aquí cargarías los datos del usuario desde tu servicio
    // Por ahora usamos datos de ejemplo
    const userData = {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@email.com',
      telefono: '912345678',
      direccion: 'Av. Principal 123, Santiago',
      fechaNacimiento: '1990-05-15',
      documento: '12345678',
      genero: 'masculino'
    };

    this.datosForm.patchValue(userData);
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.successMessage = '';
    this.errorMessage = '';
    
    if (this.isEditing) {
      this.datosForm.enable();
    } else {
      this.datosForm.disable();
      this.loadUserData(); // Recargar datos originales si se cancela
    }
  }

  onSubmit() {
    if (this.datosForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      // Simular guardado (reemplazar con tu servicio real)
      setTimeout(() => {
        this.loading = false;
        this.successMessage = '¡Datos actualizados correctamente!';
        this.isEditing = false;
        this.datosForm.disable();
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }, 1000);
    } else {
      this.errorMessage = 'Por favor, completa todos los campos correctamente';
      this.markFormGroupTouched(this.datosForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.datosForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.datosForm.get(fieldName);
    if (field?.hasError('required')) return 'Este campo es requerido';
    if (field?.hasError('email')) return 'Email inválido';
    if (field?.hasError('minLength')) return 'Mínimo 2 caracteres';
    if (field?.hasError('pattern')) {
      if (fieldName === 'telefono') return 'Teléfono inválido (9-15 dígitos)';
      if (fieldName === 'documento') return 'Documento inválido (7-12 dígitos)';
    }
    return '';
  }
}