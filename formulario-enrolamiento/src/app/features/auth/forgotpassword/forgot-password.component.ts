import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, NgIf],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  @Input() inline = false;   // usar como tarjeta dentro del mismo modal
  @Input() visible = true;   // controla *ngIf del overlay
  @Output() close = new EventEmitter<void>(); // notifica cierre (volver a login)

  f: FormGroup;
  sending = false;
  sent = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.f = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]]
    });
  }

  ngOnInit(): void {
    if (!this.inline) document.body.style.overflow = 'hidden';
  }
  ngOnDestroy(): void {
    if (!this.inline) document.body.style.overflow = '';
  }

  get email() { return this.f.get('email'); }

  async onSubmit() {
    if (this.f.invalid || this.sending) { this.f.markAllAsTouched(); return; }
    this.sending = true;
    try {
      await new Promise(res => setTimeout(res, 800)); // simulación
      this.sent = true;
    } finally {
      this.sending = false;
    }
  }

  closeModal() {
    if (this.inline) {
      this.close.emit(); // vuelve a login
    } else {
      this.router.navigate([{ outlets: { modal: null } }], { relativeTo: this.route.root });
    }
  }

  onBackdrop(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('login-overlay')) {
      this.closeModal();
    }
  }
}
