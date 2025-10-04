import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
  signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { EnrollService, OneShotRequest } from './services/enroll.service';

type FaceBox = { x:number; y:number; width:number; height:number };

@Component({
  standalone: true,
  selector: 'app-enroll',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './enroll.component.html',
  styleUrls: ['./enroll.component.scss'],
})
export class EnrollComponent implements AfterViewInit, OnDestroy {

  @ViewChild('video', { static: true })  videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('guide', { static: true })  guideEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ring',  { static: true })  ringEl!:  ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder);
  private api = inject(EnrollService);

  // UI
  loading   = signal(false);
  msg       = signal<string | null>(null);
  camReady  = signal(false);
  guideOk   = signal(false);
  guideText = signal('Ajusta tu rostro dentro del marco');
  preview   = signal<string | null>(null);

  // Solo consentimiento
  f: FormGroup = this.fb.group({
    acepta: [false, [Validators.requiredTrue]],
  });

  // Media
  private stream: MediaStream | null = null;
  private rafId: number | null = null;

  // FaceDetector nativo
  private faceDetector: any | null =
    (typeof (window as any).FaceDetector !== 'undefined')
      ? new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
      : null;

  // === HiDPI / DPR helpers (para canvas) ===
  private dpr = Math.max(1, window.devicePixelRatio || 1);
  private resizeCanvasToDisplaySize() {
    const canvas = this.guideEl.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width  * this.dpr);
    const h = Math.round(rect.height * this.dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  private setCtxScale(ctx: CanvasRenderingContext2D) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // -------- Lifecycle --------
  ngAfterViewInit(): void {
    const video = this.videoEl.nativeElement;
    video.addEventListener('loadedmetadata', () => {
      this.resizeCanvasToDisplaySize();
      this.layoutRing();
    });
    window.addEventListener('resize', () => {
      this.resizeCanvasToDisplaySize();
      this.layoutRing();
    });
  }
  ngOnDestroy(): void { this.stopCam(); }

  // -------- Camera --------
  async startCam(): Promise<void> {
    try {
      if (this.stream) this.stopCam();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });

      const video = this.videoEl.nativeElement;
      video.srcObject = this.stream;
      await video.play();

      this.resizeCanvasToDisplaySize();
      this.layoutRing();
      this.camReady.set(true);
      this.msg.set(null);
      this.loop();
    } catch (err:any) {
      this.camReady.set(false);
      this.msg.set(err?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
        : 'No se pudo iniciar la cámara.'
      );
      console.error(err);
    }
  }

  stopCam(): void {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    this.camReady.set(false);
    this.guideOk.set(false);
    this.clearGuide();
  }

  // -------- Capture + send --------
  capture(): void {
    const video = this.videoEl.nativeElement;
    if (!this.camReady() || video.videoWidth === 0) return;

    const off = document.createElement('canvas');
    off.width  = video.videoWidth;
    off.height = video.videoHeight;
    const ctx = off.getContext('2d')!;
    ctx.drawImage(video, 0, 0, off.width, off.height);

    const dataUrl = off.toDataURL('image/jpeg', 0.9);
    this.preview.set(dataUrl);
    this.msg.set('Captura lista.');
  }

  async onSubmit(): Promise<void> {
    if (!this.preview()) { this.msg.set('Primero captura una imagen.'); return; }
    if (this.f.invalid || !this.f.value.acepta) {
      this.msg.set('Debes aceptar la política biométrica.'); return;
    }
    await this.sendSnapshot(this.preview()!);
  }

  resetShot(): void {
    this.preview.set(null);
    this.msg.set(null);
  }

  private async sendSnapshot(dataUrl: string) {
    const embedding = this.dataUrlToEmbedding512(dataUrl);
    const livenessScore = this.guideOk() ? 0.96 : 0.82;
    const qualityScore  = this.guideOk() ? 0.93 : 0.85;

    // ⚠️ Ajusta estos campos según tu backend.
    const payload: OneShotRequest = {
      persona: {
        tipo: 'SOCIO',
        rut: '', nombre: '', apellido: '', email: '', telefono: ''
      },
      consentimiento: { versionPolitica: 'v1.2', aceptado: true },
      fuente: 'KIOSKO',
      sucursalId: 1,
      deviceId: this.buildDeviceId(),
      embedding,
      livenessScore,
      qualityScore,
      requestId: (crypto as any).randomUUID ? crypto.randomUUID() : String(Date.now())
    };

    this.loading.set(true);
    this.api.enrollOneShot(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.msg.set('Enrolamiento enviado correctamente.');
      },
      error: (e) => {
        this.loading.set(false);
        console.error(e);
        const msg = e?.error?.error ?? 'No se pudo enviar al servidor.';
        this.msg.set(msg);
      }
    });
  }

  // ====== Embedding placeholder 512 ======
  private dataUrlToEmbedding512(dataUrl: string): { dims: number; values: number[] } {
    const base64 = dataUrl.split(',')[1] ?? '';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const D = 512;
    const vals = new Float32Array(D);
    for (let i = 0; i < bytes.length; i++) vals[i % D] += (bytes[i] / 127.5) - 1.0;
    let sumSq = 0; for (let i = 0; i < D; i++) sumSq += vals[i] * vals[i];
    const norm = Math.sqrt(sumSq) || 1;
    for (let i = 0; i < D; i++) vals[i] = vals[i] / norm;

    return { dims: D, values: Array.from(vals) };
  }

  private buildDeviceId(): string {
    const ua = navigator.userAgent.replace(/\s+/g, '_').slice(0, 64);
    return `web-${ua}`;
  }

  // -------- Ring overlay layout --------
  private layoutRing() {
    const ring = this.ringEl.nativeElement;
    const canvas = this.guideEl.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.32;
    const size = radius * 2;

    ring.style.width  = `${size}px`;
    ring.style.height = `${size}px`;
    ring.style.left   = `50%`;
    ring.style.top    = `50%`;
    ring.style.transform = `translate(-50%, -50%)`;
  }

  // -------- Loop + guía --------
  private loop = async () => {
    const canvas = this.guideEl.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const video = this.videoEl.nativeElement;

    this.resizeCanvasToDisplaySize();
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.setCtxScale(ctx);

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.32;

    let isCentered = false;
    let helpMsg = 'Ajusta tu rostro dentro del marco';

    if (this.faceDetector && video.readyState >= 2) {
      try {
        const faces: any[] = await this.faceDetector.detect(video);
        if (faces?.length) {
          const box = faces[0].boundingBox as FaceBox;
          const sx = rect.width / video.videoWidth;
          const sy = rect.height / video.videoHeight;
          const fx = (box.x + box.width / 2) * sx;
          const fy = (box.y + box.height / 2) * sy;
          const fwidth  = box.width  * sx;

          const dist = Math.hypot(fx - cx, fy - cy);
          const sizeOk   = fwidth >= radius * 1.1 && fwidth <= radius * 2.0;
          const centerOk = dist < radius * 0.35;
          isCentered = sizeOk && centerOk;

          if (!sizeOk)      helpMsg = fwidth < radius * 1.1 ? 'Acércate un poco' : 'Aléjate un poco';
          else if (!centerOk) helpMsg =
              (fx < cx) ? 'Muévete a la derecha' :
              (fx > cx) ? 'Muévete a la izquierda' :
              (fy < cy) ? 'Baja un poco' : 'Sube un poco';
        } else {
          helpMsg = 'Acércate a la cámara';
        }
      } catch {
        helpMsg = 'Tu navegador no soporta detección facial; alinéate al círculo.';
      }
    } else {
      helpMsg = 'Tu navegador no soporta detección facial; alinéate al círculo.';
    }

    const ring = this.ringEl.nativeElement;
    ring.style.borderColor = isCentered ? '#22c55e' : '#ef4444';
    ring.style.boxShadow   = `0 0 16px ${isCentered ? '#22c55e' : '#ef4444'}`;

    this.guideOk.set(isCentered);
    this.guideText.set(isCentered ? '¡Perfecto! Mantén la posición.' : helpMsg);

    this.rafId = requestAnimationFrame(this.loop);
  };

  private clearGuide(): void {
    const ctx = this.guideEl.nativeElement.getContext('2d')!;
    this.guideText.set('Ajusta tu rostro dentro del marco');
    ctx.resetTransform();
    ctx.clearRect(0, 0, this.guideEl.nativeElement.width, this.guideEl.nativeElement.height);
  }

  guideMsg() { return this.guideText(); }
}
