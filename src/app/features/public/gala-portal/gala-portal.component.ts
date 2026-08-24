import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';

import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata, CategoriaParticipante } from '../../../core/models/candidata.model';

@Component({
  selector: 'app-gala-portal',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './gala-portal.component.html',
  styleUrls: ['./gala-portal.component.scss']
})
export class GalaPortalComponent implements OnInit {
  private eleccionService = inject(EleccionService);
  private candidataService = inject(CandidataService);

  // Signals de Estado
  eleccion = signal<Eleccion | null>(null);
  candidatas = signal<Candidata[]>([]);
  isLoading = signal(true);

  // Filtro de Pestaña activa: 'Embajadora' | 'Embajador'
  categoriaActiva = signal<CategoriaParticipante>('Embajadora');

  // Modal de Ficha Técnica (Solo Lectura)
  selectedCandidata = signal<Candidata | null>(null);
  selectedPhotoIndex = signal(0);
  isFichaModalOpen = signal(false);

  // Lista de participantes filtrada por categoría y ordenada por número de pasada
  participantesFiltrados = computed(() => {
    const lista = this.candidatas().filter(c => (c.categoria || 'Embajadora') === this.categoriaActiva());
    return lista.sort((a, b) => (a.numero || 0) - (b.numero || 0));
  });

  // Conteo rápido para las pestañas
  embajadorasCount = computed(() => this.candidatas().filter(c => (c.categoria || 'Embajadora') === 'Embajadora').length);
  embajadoresCount = computed(() => this.candidatas().filter(c => c.categoria === 'Embajador').length);

  // Podios Oficiales (Calculados automáticamente si el estado es 'Publicada')
  podioEmbajadoras = computed(() => {
    const chicas = this.candidatas().filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const ordenadas = this.ordenarPorPuntaje(chicas);
    const cantPuestos = this.eleccion()?.puestosFemeninos?.length || 3;
    return ordenadas.slice(0, cantPuestos);
  });

  podioEmbajadores = computed(() => {
    const chicos = this.candidatas().filter(c => c.categoria === 'Embajador');
    const ordenados = this.ordenarPorPuntaje(chicos);
    const cantPuestos = this.eleccion()?.puestosMasculinos?.length || 2;
    return ordenados.slice(0, cantPuestos);
  });

  ngOnInit(): void {
    this.cargarDatosGala();
  }

  cargarDatosGala(): void {
    this.isLoading.set(true);
    // Traer elecciones y tomar la más reciente o activa
    this.eleccionService.getElecciones().pipe(first()).subscribe({
      next: (elecciones) => {
        if (elecciones.length > 0) {
          // Priorizar gala 'Activa' o 'Publicada', sino la última creada
          const activa = elecciones.find(e => e.estado === 'Activa' || e.estado === 'Publicada') || elecciones[0];
          this.eleccion.set(activa);

          if (activa.id) {
            this.candidataService.getCandidatasPorEleccion(activa.id).pipe(first()).subscribe({
              next: (cands) => {
                this.candidatas.set(cands);
                this.isLoading.set(false);
              },
              error: () => this.isLoading.set(false)
            });
          }
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  private ordenarPorPuntaje(lista: Candidata[]): Candidata[] {
    return [...lista].sort((a, b) => (b.puntuacionTotal || 0) - (a.puntuacionTotal || 0));
  }

  getPuestoFemenino(index: number): string {
    return this.eleccion()?.puestosFemeninos?.[index] || `Puesto ${index + 1}`;
  }

  getPuestoMasculino(index: number): string {
    return this.eleccion()?.puestosMasculinos?.[index] || `Puesto ${index + 1}`;
  }

  openFicha(candidata: Candidata): void {
    this.selectedCandidata.set(candidata);
    this.selectedPhotoIndex.set(0);
    this.isFichaModalOpen.set(true);
  }

  closeFicha(): void {
    this.isFichaModalOpen.set(false);
    this.selectedCandidata.set(null);
  }

  selectPhoto(index: number): void {
    this.selectedPhotoIndex.set(index);
  }

  getNumeroFormat(num?: number): string {
    if (!num) return '01';
    return num < 10 ? `0${num}` : `${num}`;
  }
}
