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

  // Signal para colapsar/minimizar la barra superior y ganar 100% de espacio vertical
  isHeaderMinimized = signal(false);

  toggleHeaderMinimize(): void {
    this.isHeaderMinimized.update(val => !val);
  }

  // Avanzar al siguiente candidato con el botón circular dorado ▶
  nextCandidate(): void {
    const filtrados = this.candidatasFiltradas;
    if (filtrados.length === 0) return;

    const actual = this.candidatas[this.currentStep];
    const idxEnFiltrados = filtrados.findIndex(c => c.id === actual?.id);

    if (idxEnFiltrados < filtrados.length - 1) {
      const sigCandidato = filtrados[idxEnFiltrados + 1];
      this.candidatoSeleccionado.emit(sigCandidato);
      this.scrollCarousel('right');
    }
  }

  // Retroceder al candidato anterior con el botón circular dorado ◀
  prevCandidate(): void {
    const filtrados = this.candidatasFiltradas;
    if (filtrados.length === 0) return;

    const actual = this.candidatas[this.currentStep];
    const idxEnFiltrados = filtrados.findIndex(c => c.id === actual?.id);

    if (idxEnFiltrados > 0) {
      const antCandidato = filtrados[idxEnFiltrados - 1];
      this.candidatoSeleccionado.emit(antCandidato);
      this.scrollCarousel('left');
    }
  }

  // Desplazamiento del carrusel con animación suave
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
    return criterios.reduce((acc, c) => acc + (group.get(c)?.value || 0), 0);
  }

  getEvaluacionValue(index: number, controlName: string): number {
    return this.evaluacionesArray.at(index)?.get(controlName)?.value || 5;
  }
}
