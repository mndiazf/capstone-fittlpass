// src/app/features/members/enrollment/enrollment.component.ts

import { Component, inject, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { RutService } from '../../../core/services/rut.service';
import { RutFormatDirective } from '../../../shared/directives/rut-format.directive';

@Component({
  selector: 'app-enrollment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    RutFormatDirective
  ],
  templateUrl: './enrollment.component.html',
  styleUrls: ['./enrollment.component.scss'],
  host: {
    '[attr.data-theme]': 'currentTheme'
  }
})
export class EnrollmentComponent implements OnInit, AfterViewInit, OnDestroy {
  private rutService = inject(RutService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  currentTheme: string = 'dark';
  private themeObserver?: MutationObserver;

  currentView: 'search' | 'member-info' | 'camera' | 'review' | 'processing' | 'success' | 'error' = 'search';
  
  searchRut = '';
  isSearching = false;
  searchError = '';

  memberData: any = null;
  operationType: 'new' | 'update' = 'new';

  faceDetected = false;
  capturedImage = '';
  private stream: MediaStream | null = null;

  processingMessage = '';
  successMessage = '';
  errorMessage = '';

  showUnlockDialog = false;
  unlockReason = '';
  unlockPassword = '';
  unlockError = '';

  ngOnInit(): void {
    // Obtener tema inicial del documento
    this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    // Observar cambios en el tema del documento
    this.observeThemeChanges();
  }

  ngAfterViewInit(): void {}

  private observeThemeChanges(): void {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  searchMember(): void {
    this.searchError = '';
    const rutError = this.rutService.getErrorMessage(this.searchRut);
    if (rutError) {
      this.searchError = rutError;
      return;
    }

    this.isSearching = true;
    setTimeout(() => {
      this.memberData = {
        rut: this.searchRut,
        firstName: 'Juan',
        middleName: 'Carlos',
        lastName: 'Pérez',
        secondLastName: 'González',
        email: 'juan.perez@example.com',
        membership: 'Premium',
        membershipStatus: 'active',
        enrollmentStatus: 'not-enrolled',
        enrollmentLocked: false,
        lastEnrollment: null
      };
      this.operationType = this.memberData.enrollmentStatus === 'enrolled' ? 'update' : 'new';
      this.currentView = 'member-info';
      this.isSearching = false;
    }, 1000);
  }

  async startEnrollment(): Promise<void> {
    this.currentView = 'camera';
    setTimeout(() => this.startCamera(), 100);
  }

  async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.simulateFaceDetection();
      }
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      this.errorMessage = 'No se pudo acceder a la cámara. Verifica los permisos.';
      this.currentView = 'error';
    }
  }

  private simulateFaceDetection(): void {
    setTimeout(() => { this.faceDetected = true; }, 2000);
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
    this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
    this.stopCamera();
    this.currentView = 'review';
  }

  confirmEnrollment(): void {
    this.currentView = 'processing';
    this.processingMessage = 'Procesando imagen facial...';

    setTimeout(() => {
      console.log('Datos a enviar:', {
        rut: this.rutService.cleanRut(this.searchRut),
        imageSize: this.capturedImage.length
      });
      this.successMessage = this.operationType === 'new' ? '¡Enrolamiento exitoso!' : '¡Actualización exitosa!';
      this.currentView = 'success';
    }, 2000);
  }

  retakePhoto(): void {
    this.capturedImage = '';
    this.faceDetected = false;
    this.currentView = 'camera';
    setTimeout(() => this.startCamera(), 100);
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    this.faceDetected = false;
  }

  reset(): void {
    this.stopCamera();
    this.searchRut = '';
    this.searchError = '';
    this.memberData = null;
    this.capturedImage = '';
    this.currentView = 'search';
  }

  canEnroll(): boolean {
    return this.memberData?.membershipStatus === 'active' && !this.memberData?.enrollmentLocked;
  }

  openUnlockDialog(): void {
    this.showUnlockDialog = true;
  }

  closeUnlockDialog(): void {
    this.showUnlockDialog = false;
    this.unlockReason = '';
    this.unlockPassword = '';
    this.unlockError = '';
  }

  unlockEnrollment(): void {
    if (!this.unlockReason || !this.unlockPassword) {
      this.unlockError = 'Todos los campos son requeridos';
      return;
    }
    setTimeout(() => {
      this.memberData.enrollmentLocked = false;
      this.closeUnlockDialog();
    }, 1000);
  }

  getMembershipStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status--active';
      case 'inactive': return 'status--inactive';
      case 'expired': return 'status--expired';
      default: return '';
    }
  }

  getEnrollmentStatusClass(status: string): string {
    switch (status) {
      case 'enrolled': return 'status--enrolled';
      case 'locked': return 'status--locked';
      default: return 'status--inactive';
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    // Limpiar el observer
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }
}