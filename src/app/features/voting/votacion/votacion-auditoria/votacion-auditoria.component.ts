import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup } from '@angular/forms';
import { Eleccion } from '../../../../core/models/eleccion.model';
import { Candidata } from '../../../../core/models/candidata.model';

@Component({
  selector: 'app-votacion-auditoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './votacion-auditoria.component.html'
})
export class VotacionAuditoriaComponent {
  /** Lista completa de candidatas (necesaria para calcular el índice global) */
  @Input({ required: true }) candidatas: Candidata[] = [];
  /** Candidatas filtradas por la tanda activa */
  @Input({ required: true }) candidatasFiltradas: Candidata[] = [];
  @Input({ required: true }) eleccion!: Eleccion;
  @Input({ required: true }) categoriaSeleccionada!: 'Embajadora' | 'Embajador';
  /** FormGroup del padre — pasado por referencia para leer los puntajes */
  @Input({ required: true }) votacionForm!: FormGroup;
  /** Si la tanda activa ya fue firmada */
  @Input({ required: true }) tandaFirmada!: boolean;
  /** Si el padre está procesando el envío */
  @Input({ required: true }) isSubmitting!: boolean;

  /** Emite el candidato cuya fila de edición fue pulsada */
  @Output() editarCandidato = new EventEmitter<Candidata>();
  /** Emite cuando se pulsa "Firmar Acta Oficial" */
  @Output() firmarActa = new EventEmitter<void>();
  /** Emite cuando se pulsa "← Ir a la siguiente tanda" */
  @Output() volverATandas = new EventEmitter<void>();

  // ── Helpers ──────────────────────────────────────────────

  get evaluacionesArray(): FormArray {
    return this.votacionForm.get('evaluaciones') as FormArray;
  }

  formatNumero(num: number | undefined | null): string {
    const n = num ?? 0;
    return n < 10 ? `0${n}` : `${n}`;
  }

  getCriteriosParaCandidata(c: Candidata, e: Eleccion): string[] {
    if (c.categoria === 'Embajador') {
      return e.criteriosMasculinos || e.criterios || ['Actitud', 'Simpatía', 'Pasarela'];
    }
    return e.criteriosFemeninos || e.criterios || ['Elegancia', 'Porte', 'Pasarela'];
  }

  calculateTotalScore(idx: number): number {
    const group = this.evaluacionesArray.at(idx) as FormGroup;
    if (!group || !this.candidatas[idx] || !this.eleccion) return 0;
    const criterios = this.getCriteriosParaCandidata(this.candidatas[idx], this.eleccion);
    return criterios.reduce((acc, c) => acc + (group.get(c)?.value || 0), 0);
  }
}
