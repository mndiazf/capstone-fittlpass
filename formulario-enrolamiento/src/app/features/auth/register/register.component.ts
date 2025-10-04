import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

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
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, NgIf],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  @Input() visible = false;
  @Input() selectedMembership: Membership | null = null;
  @Output() close = new EventEmitter();
  @Output() toLogin = new EventEmitter();
  @Output() proceedToPayment = new EventEmitter<any>();

  f: FormGroup;

  constructor(private fb: FormBuilder) {
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
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        ]],
        confirm: ['', [Validators.required]]
      }, { validators: samePassword })
    });
  }

  get firstName() { return this.f.get('firstName'); }
  get lastName()  { return this.f.get('lastName'); }
  get rut()       { return this.f.get('rut'); }
  get email()     { return this.f.get('email'); }
  get phone()     { return this.f.get('phone'); }
  get password()  { return this.f.get('passwordGroup.password'); }
  get confirm()   { return this.f.get('passwordGroup.confirm'); }
  get passGroup() { return this.f.get('passwordGroup'); }

  submit() {
    if (this.f.invalid) { 
      this.f.markAllAsTouched(); 
      return; 
    }

    const registrationData = {
      ...this.f.value,
      membership: this.selectedMembership
    };

    this.proceedToPayment.emit(registrationData);
  }

  onBackdrop(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('login-overlay')) this.close.emit();
  }
}