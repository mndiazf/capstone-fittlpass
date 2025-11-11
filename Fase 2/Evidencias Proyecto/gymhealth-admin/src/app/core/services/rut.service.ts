// src/app/core/services/rut.service.ts

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RutService {


  formatRut(rut: string): string {

    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    
    if (clean.length === 0) return '';
    

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    
    if (body.length === 0) return dv;
    

    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    

    return `${formattedBody}-${dv}`;
  }


  cleanRut(rut: string): string {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
  }


  validateRut(rut: string): boolean {

    const cleanRut = this.cleanRut(rut);
    

    if (cleanRut.length < 2) return false;
    
 
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);
    

    const expectedDv = this.calculateDv(body);
    
    return dv === expectedDv;
  }

  /**
   * Calcula el dígito verificador usando módulo 11
   */
  private calculateDv(rut: string): string {
    let sum = 0;
    let multiplier = 2;
    
    // Sumar desde el final
    for (let i = rut.length - 1; i >= 0; i--) {
      sum += parseInt(rut[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const remainder = sum % 11;
    const dv = 11 - remainder;
    
    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
  }


  getErrorMessage(rut: string): string | null {
    if (!rut || rut.trim() === '') {
      return 'El RUT es requerido';
    }
    
    const cleanRut = this.cleanRut(rut);
    
    if (cleanRut.length < 2) {
      return 'RUT incompleto';
    }
    
    if (!this.validateRut(rut)) {
      return 'RUT inválido';
    }
    
    return null;
  }
}