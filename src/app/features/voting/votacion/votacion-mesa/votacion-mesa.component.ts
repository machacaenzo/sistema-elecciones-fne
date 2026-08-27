import { Component, ElementRef, EventEmitter, Input, Output, signal, ViewChild } from '@angular/core';
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
  @ViewChild('carouselContainer') carouselContainer?: ElementRef<HTMLDivElement>;

  @Input({ required: true }) candidatas: Candidata[] = [];
  @Input({ required: true }) candidatasFiltradas: Candidata[] = [];
  @Input({ required: true }) eleccion!: Eleccion;
  @Input({ required: true }) categoriaSeleccionada!: 'Embajadora' | 'Embajador';
  @Input({ required: true }) currentStep!: number;
  @Input({ required: true }) carouselImageIndex!: number;
  @Input({ required: true }) votacionForm!: FormGroup;
  @Input({ required: true }) tandaFirmada!: boolean;

  @Output() volverATandas = new EventEmitter<void>();
  @Output() cerrarMesa = new EventEmitter<void>();
  @Output() candidatoSeleccionado = new EventEmitter<Candidata>();
  @Output() sliderActualizado = new EventEmitter<{ index: number; controlName: string; event: Event }>();
  @Output() irARevisar = new EventEmitter<void>();

  isHeaderMinimized = signal(false);

  // Mensaje flotante de confirmación rápida para personas mayores
  mensajeGuardado = signal<string | null>(null);
  private mensajeTimeout: any = null;

  escalaNumerica = [5, 6, 7, 8, 9, 10];

  toggleHeaderMinimize(): void {
    this.isHeaderMinimized.update(val => !val);
  }

  esUltimoCandidato(): boolean {
    const filtrados = this.candidatasFiltradas;
    if (filtrados.length === 0) return true;
    const actual = this.candidatas[this.currentStep];
    const idx = filtrados.findIndex(c => c.id === actual?.id);
    return idx === filtrados.length - 1;
  }

  esPrimerCandidato(): boolean {
    const filtrados = this.candidatasFiltradas;
    if (filtrados.length === 0) return true;
    const actual = this.candidatas[this.currentStep];
    const idx = filtrados.findIndex(c => c.id === actual?.id);
    return idx <= 0;
  }

  // Muestra el aviso verde de confirmación rápida
  lanzarAvisoGuardado(nombre: string, pts: number): void {
    if (this.mensajeTimeout) clearTimeout(this.mensajeTimeout);
    this.mensajeGuardado.set(`✓ Puntaje de #${this.formatNumero(this.candidatas[this.currentStep]?.numero)} ${nombre} guardado (${pts} pts)`);
    this.mensajeTimeout = setTimeout(() => {
      this.mensajeGuardado.set(null);
    }, 1600);
  }

  nextCandidate(): void {
    const filtrados = this.candidatasFiltradas;
    if (filtrados.length === 0) return;

    const actual = this.candidatas[this.currentStep];
    const pts = this.calculateTotalScore(this.currentStep);

    // Disparamos la confirmación visual para que el jurado sepa que se guardó
    this.lanzarAvisoGuardado(actual.nombre, pts);

    const idx = filtrados.findIndex(c => c.id === actual?.id);
    if (idx < filtrados.length - 1) {
      const sig = filtrados[idx + 1];
      this.candidatoSeleccionado.emit(sig);
      this.scrollCarousel('right');
    }
  }

  prevCandidate(): void {
    const filtrados = this.candidatasFiltradas;
    if (filtrados.length === 0) return;

    const actual = this.candidatas[this.currentStep];
    const idx = filtrados.findIndex(c => c.id === actual?.id);

    if (idx > 0) {
      const ant = filtrados[idx - 1];
      this.candidatoSeleccionado.emit(ant);
      this.scrollCarousel('left');
    }
  }

  setScoreDirect(index: number, controlName: string, value: number): void {
    if (this.tandaFirmada) return;
    const fakeEvent = { target: { value: value.toString() } } as unknown as Event;
    this.sliderActualizado.emit({ index, controlName, event: fakeEvent });
  }

  scrollCarousel(direction: 'left' | 'right'): void {
    if (!this.carouselContainer?.nativeElement) return;
    const offset = direction === 'left' ? -220 : 220;
    this.carouselContainer.nativeElement.scrollBy({ left: offset, behavior: 'smooth' });
  }

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
    return criterios.reduce((acc, c) => acc + (Number(group.get(c)?.value) || 5), 0);
  }

  getEvaluacionValue(index: number, controlName: string): number {
    const val = this.evaluacionesArray.at(index)?.get(controlName)?.value;
    return val !== null && val !== undefined && !isNaN(val) ? Number(val) : 5;
  }
}
