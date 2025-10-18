// src/app/shared/components/modals/session-warning-modal.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-session-warning-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="modal-overlay" *ngIf="showWarning">
      <div class="modal-content">
        <div class="modal-icon">⏰</div>
        <h2>Tu sesión está por expirar</h2>
        <div class="countdown">
          <span class="time">{{ remainingTime }}</span>
          <span class="label">{{ remainingTime === 1 ? 'minuto' : 'minutos' }}</span>
        </div>
        <p>¿Deseas continuar con tu sesión?</p>
        <div class="modal-actions">
          <button mat-stroked-button (click)="logout()">
            Cerrar Sesión
          </button>
          <button mat-raised-button (click)="extendSession()">
            Continuar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: #1a2332;
      padding: 2rem;
      border-radius: 1rem;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }

    h2 {
      color: #e2e8f0;
      margin: 0 0 1.5rem 0;
      font-size: 1.5rem;
    }

    .countdown {
      background: rgba(245, 158, 11, 0.1);
      border: 2px solid rgba(245, 158, 11, 0.3);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;

      .time {
        display: block;
        font-size: 3rem;
        font-weight: 700;
        color: #f59e0b;
        line-height: 1;
      }

      .label {
        display: block;
        font-size: 0.875rem;
        color: #94a3b8;
        text-transform: uppercase;
        margin-top: 0.5rem;
      }
    }

    p {
      color: #e2e8f0;
      margin: 0 0 2rem 0;
      font-size: 1rem;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;

      button {
        flex: 1;
        height: 48px !important;
        font-weight: 600 !important;
        border-radius: 0.5rem !important;
      }

      button[mat-stroked-button] {
        color: #94a3b8 !important;
        border-color: rgba(148, 163, 184, 0.3) !important;

        &:hover {
          background: rgba(239, 68, 68, 0.1) !important;
          border-color: rgba(239, 68, 68, 0.5) !important;
          color: #ef4444 !important;
        }
      }

      button[mat-raised-button] {
        background: #06b6d4 !important;
        color: white !important;

        &:hover {
          background: #0891b2 !important;
        }
      }
    }

    @media (max-width: 640px) {
      .modal-content {
        padding: 1.5rem;
      }

      .modal-actions {
        flex-direction: column;
      }
    }
  `]
})
export class SessionWarningModalComponent implements OnInit, OnDestroy {
  showWarning = false;
  remainingTime = 0;
  private destroy$ = new Subject<void>();

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    // Escuchar advertencias
    this.authService.sessionWarning$
      .pipe(takeUntil(this.destroy$))
      .subscribe(warning => {
        this.showWarning = warning;
      });

    // Escuchar tiempo restante
    this.authService.remainingTime$
      .pipe(takeUntil(this.destroy$))
      .subscribe(time => {
        this.remainingTime = time;
      });
  }

  extendSession(): void {
    this.authService.extendSession();
  }

  logout(): void {
    this.authService.logout('user_request');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}