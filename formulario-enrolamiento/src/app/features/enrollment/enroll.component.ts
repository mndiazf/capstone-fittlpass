import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
  signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, ReactiveFormsModule, Validators,
  AbstractControl, ValidationErrors, FormGroup
} from '@angular/forms';
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

  // Media
  private stream: MediaStream | null = null;
  private rafId: number | null = null;

  // FaceDetector nativo
  private faceDetector: any | null =
    (typeof (window as any).FaceDetector !== 'undefined')
      ? new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 })
      : null;

  // === HiDPI / DPR helpers (para canvas, si lo usas) ===
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

  // -------- Form --------
  f: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, this.nameValidator()]],
    segundoNombre: ['', [this.nameOptionalValidator()]],
    apellidoPaterno: ['', [Validators.required, this.nameValidator()]],
    apellidoMaterno: ['', [Validators.required, this.nameValidator()]],
    rut: ['', [Validators.required, this.rutValidator()]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, this.clPhoneValidator()]],
    acepta: [false, [Validators.requiredTrue]],
  });

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

    if (this.f.valid && this.f.value.acepta) {
      this.sendSnapshot(dataUrl);
    } else {
      this.msg.set('Captura lista. Completa los datos y acepta la política para enviar.');
    }
  }

  private async sendSnapshot(dataUrl: string) {
    // ⚠️ DEMO: genera embedding placeholder desde la imagen
    const embedding = this.dataUrlToEmbedding512(dataUrl);

    // heurísticas simples para demo
    const livenessScore = this.guideOk() ? 0.96 : 0.82;
    const qualityScore  = this.guideOk() ? 0.93 : 0.85;

    const nombre = (this.f.value.nombre ?? '').toString().trim();
    const segundoNombre = (this.f.value.segundoNombre ?? '').toString().trim();
    const apPat = (this.f.value.apellidoPaterno ?? '').toString().trim();
    const apMat = (this.f.value.apellidoMaterno ?? '').toString().trim();

    const personaNombre = segundoNombre ? `${nombre} ${segundoNombre}` : nombre;
    const personaApellido = `${apPat} ${apMat}`.trim();

    const telefono = (this.f.value.telefono as string).replace(/\s+/g, '');
    const rut = (this.f.value.rut as string).replace(/\./g, '');

    const payload: OneShotRequest = {
      persona: {
        tipo: 'SOCIO',
        rut,
        nombre: personaNombre,
        apellido: personaApellido,
        email: this.f.value.email,
        telefono
      },
      consentimiento: {
        versionPolitica: 'v1.2',
        aceptado: true
        // ipOrigen lo puede determinar el backend si lo necesita
      },
      fuente: 'KIOSKO',
      sucursalId: 1, // usa la sucursal de prueba; cámbialo si corresponde
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

  // ====== DEMO: embedding placeholder 512-dim desde dataURL ======
  // Convierte base64 -> bytes -> mapa a [-1,1] -> normaliza L2 (para coseno)
  private dataUrlToEmbedding512(dataUrl: string): { dims: number; values: number[] } {
    const base64 = dataUrl.split(',')[1] ?? '';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const D = 512;
    const vals = new Float32Array(D);
    // plegado determinista de bytes sobre 512 celdas
    for (let i = 0; i < bytes.length; i++) {
      vals[i % D] += (bytes[i] / 127.5) - 1.0; // [0..255] -> [-1..1]
    }
    // normalización L2
    let sumSq = 0;
    for (let i = 0; i < D; i++) sumSq += vals[i] * vals[i];
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
    const rect = canvas.getBoundingClientRect(); // mismo tamaño que el video
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
          else if (!centerOk) helpMsg = (fx < cx) ? 'Muévete a la derecha'
                                   : (fx > cx) ? 'Muévete a la izquierda'
                                   : (fy < cy) ? 'Baja un poco' : 'Sube un poco';
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

  // -------- Validaciones --------
  isInvalid(ctrl: string): boolean {
    const c = this.f.get(ctrl);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
  rutErrorMsg(): string {
    const c = this.f.get('rut');
    if (!c) return 'RUT inválido';
    if (c.hasError('required')) return 'El RUT es obligatorio.';
    if (c.hasError('rutFormat')) return 'Formato inválido. Usa 12.345.678-9 o 12345678-9.';
    if (c.hasError('rutDv')) return 'Dígito verificador incorrecto.';
    return 'RUT inválido.';
  }

  private nameRegex = /^[A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+)*$/;
  private nameValidator() {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = (c.value ?? '').toString().trim();
      if (v.length < 2 || v.length > 50) return { nameLen: true };
      if (!this.nameRegex.test(v)) return { nameChars: true };
      return null;
    };
  }
  private nameOptionalValidator() {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = (c.value ?? '').toString().trim();
      if (!v) return null;
      if (v.length < 2 || v.length > 50) return { nameLen: true };
      if (!this.nameRegex.test(v)) return { nameChars: true };
      return null;
    };
  }
  private clPhoneValidator() {
    const reg = /^(?:\+56\s?9\s?\d{8}|0?9\d{8}|9\d{8})$/;
    return (c: AbstractControl): ValidationErrors | null => {
      const raw = (c.value ?? '').toString().replace(/\s+/g, '');
      if (!reg.test(raw)) return { clPhone: true };
      return null;
    };
  }
  private rutValidator() {
    return (c: AbstractControl): ValidationErrors | null => {
      const raw = (c.value ?? '').toString().trim();
      const clean = raw.replace(/\./g, '').replace(/–/g, '-');
      if (!/^\d{1,8}-[\dkK]$/.test(clean)) return { rutFormat: true };
      const [numStr, dv] = clean.split('-');
      const dvCalc = this.computeDv(numStr);
      if (dvCalc.toLowerCase() !== dv.toLowerCase()) return { rutDv: true };
      return null;
    };
  }
  private computeDv(numStr: string): string {
    let sum = 0, mul = 2;
    for (let i = numStr.length - 1; i >= 0; i--) {
      sum += parseInt(numStr[i], 10) * mul;
      mul = (mul === 7) ? 2 : mul + 1;
    }
    const res = 11 - (sum % 11);
    if (res === 11) return '0';
    if (res === 10) return 'K';
    return String(res);
  }

  formatRut(): void {
    const c = this.f.get('rut'); if (!c) return;
    let v = (c.value ?? '').toString().trim();
    v = v.replace(/\./g, '').replace(/–/g, '-').replace(/k$/, 'K');
    const m = v.match(/^(\d{1,8})-([\dkK])$/);
    if (!m) { c.updateValueAndValidity(); return; }
    const numFmt = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    c.setValue(`${numFmt}-${m[2].toUpperCase()}`, { emitEvent: false });
    c.updateValueAndValidity();
  }

  normalizePhone(): void {
    const c = this.f.get('telefono'); if (!c) return;
    let v = (c.value ?? '').toString().replace(/\s+/g, '');
    const digits = v.replace(/\D/g, '');
    let local = digits.startsWith('56') ? digits.slice(2) : digits;
    if (local.startsWith('0')) local = local.slice(1);
    if (!local.startsWith('9')) local = '9' + local.replace(/^9?/, '');
    local = local.slice(0, 9);
    if (local.length === 9) c.setValue(`+56 9 ${local.slice(1)}`, { emitEvent: false });
    c.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.f.invalid || !this.preview()) {
      this.msg.set('Revisa los campos y captura una imagen.');
      return;
    }
    if (this.preview() && this.f.valid && this.f.value.acepta) {
      this.sendSnapshot(this.preview()!);
    }
  }

  reset(): void {
    this.f.reset({ acepta: false });
    this.preview.set(null);
    this.msg.set(null);
  }

  guideMsg() { return this.guideText(); }
}
