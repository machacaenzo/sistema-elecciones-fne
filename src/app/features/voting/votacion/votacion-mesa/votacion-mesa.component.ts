import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Eleccion } from '../../../../core/models/eleccion.model';
import { Candidata } from '../../../../core/models/candidata.model';

@Component({
  selector: 'app-votacion-mesa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './votacion-mesa.component.html'
})
export class VotacionMesaComponent {
  /** Lista completa de candidatas (ordenada por número) */
  @Input({ required: true }) candidatas: Candidata[] = [];
  /** Candidatas filtradas por la tanda activa */
  @Input({ required: true }) candidatasFiltradas: Candidata[] = [];
  @Input({ required: true }) eleccion!: Eleccion;
  @Input({ required: true }) categoriaSeleccionada!: 'Embajadora' | 'Embajador';
  /** Índice global (en `candidatas`) del candidato que se muestra */
  @Input({ required: true }) currentStep!: number;
  /** Índice de la foto activa en el carrusel */
  @Input({ required: true }) carouselImageIndex!: number;
  /** FormGroup del padre — pasado por referencia para que formArrayName funcione */
  @Input({ required: true }) votacionForm!: FormGroup;
  /** Si la tanda activa ya fue firmada (solo lectura) */
  @Input({ required: true }) tandaFirmada!: boolean;

  /** Emite cuando el usuario pulsa "Tandas" (volver a Pantalla A) */
  @Output() volverATandas = new EventEmitter<void>();
  /** Emite el candidato cuya miniatura fue pulsada en el carrusel */
  @Output() candidatoSeleccionado = new EventEmitter<Candidata>();
  /** Emite los datos del slider para que el padre actualice el form y guarde el borrador */
  @Output() sliderActualizado = new EventEmitter<{ index: number; controlName: string; event: Event }>();
  /** Emite cuando el usuario pulsa "Revisar y Firmar" */
  @Output() irARevisar = new EventEmitter<void>();

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

  getEvaluacionValue(index: number, controlName: string): number {
    return this.evaluacionesArray.at(index)?.get(controlName)?.value || 0;
  }
}
