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
import { EnrollmentService, MemberUiModel } from '../../../core/services/enrollment-service';

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
  private enrollmentSvc = inject(EnrollmentService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  currentTheme: string = 'dark';
  private themeObserver?: MutationObserver;

  currentView: 'search' | 'member-info' | 'camera' | 'review' | 'processing' | 'success' | 'error' = 'search';
  
  searchRut = '';
  isSearching = false;
  searchError = '';

  memberData: MemberUiModel | null = null;
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
    this.currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
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

  // =========================
  // BUSCAR POR RUT (BACKEND)
  // =========================
  searchMember(): void {
    this.searchError = '';

    const rutError = this.rutService.getErrorMessage(this.searchRut);
    if (rutError) {
      this.searchError = rutError;
      return;
    }

    this.isSearching = true;

    // ✅ Enviar SIEMPRE el RUT formateado xx.xxx.xxx-X
    const formattedRut = this.rutService.formatRut(this.searchRut);
    this.searchRut = formattedRut; // reflejar formato en el input

    this.enrollmentSvc.getProfileByRut(formattedRut).subscribe({
      next: (member) => {
        // Asegurar que lo que mostramos también esté formateado
        member.rut = this.rutService.formatRut(member.rut);
        this.memberData = member;

        this.operationType = member.enrollmentStatus === 'enrolled' ? 'update' : 'new';
        this.currentView = 'member-info';
        this.isSearching = false;
      },
      error: (err: Error) => {
        this.searchError = err.message || 'Error al buscar.';
        this.isSearching = false;
      }
    });
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

  // ======================================
  // ENROLAR (POST imagen al endpoint FACE)
  // ======================================
  confirmEnrollment(): void {
    if (!this.memberData?.id || !this.capturedImage) {
      this.errorMessage = 'Falta la imagen o el usuario.';
      this.currentView = 'error';
      return;
    }

    this.currentView = 'processing';
    this.processingMessage = 'Procesando imagen facial...';

    const blob = this.enrollmentSvc.dataUrlToBlob(this.capturedImage);

    this.enrollmentSvc.enrollFace(this.memberData.id, blob).subscribe({
      next: () => {
        this.successMessage = this.operationType === 'new'
          ? '¡Enrolamiento exitoso!'
          : '¡Actualización de enrolamiento exitosa!';
        this.currentView = 'success';
      },
      error: (err: Error) => {
        this.errorMessage = err.message || 'Error al enrolar.';
        this.currentView = 'error';
      }
    });
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
    // Aquí podrías llamar a un endpoint de desbloqueo si existe.
    setTimeout(() => {
      if (this.memberData) this.memberData.enrollmentLocked = false;
      this.closeUnlockDialog();
    }, 1000);
  }

  getMembershipStatusClass(status: MemberUiModel['membershipStatus'] | string): string {
    switch (status) {
      case 'active': return 'status--active';
      case 'inactive': return 'status--inactive';
      case 'expired': return 'status--expired';
      default: return '';
    }
  }

  getEnrollmentStatusClass(status: MemberUiModel['enrollmentStatus'] | string): string {
    switch (status) {
      case 'enrolled': return 'status--enrolled';
      case 'locked': return 'status--locked';
      default: return 'status--inactive';
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }
}
