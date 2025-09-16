import { AbstractControl, ValidationErrors } from '@angular/forms';

export function rutValidator(ctrl: AbstractControl): ValidationErrors | null {
  const raw = (ctrl.value ?? '').toString().replace(/\./g,'').replace(/-/g,'').trim();
  if (!raw) return null;
  if (!/^\d{7,8}[0-9kK]$/.test(raw)) return { rut: 'formato' };

  const body = raw.slice(0, -1);
  const dv = raw.slice(-1).toLowerCase();
  let s = 0, m = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    s += parseInt(body[i], 10) * m;
    m = m === 7 ? 2 : m + 1;
  }
  const rest = 11 - (s % 11);
  const dvCalc = rest === 11 ? '0' : rest === 10 ? 'k' : String(rest);
  return dvCalc === dv ? null : { rut: 'dv' };
}
