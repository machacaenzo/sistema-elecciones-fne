import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';

import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata, CategoriaParticipante } from '../../../core/models/candidata.model';

interface CountdownTime {
  dias: string;
  horas: string;
  minutos: string;
  segundos: string;
  iniciado: boolean;
}

@Component({
  selector: 'app-gala-portal',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './gala-portal.component.html',
  styleUrls: ['./gala-portal.component.scss']
})
export class GalaPortalComponent implements OnInit, OnDestroy {
  private eleccionService = inject(EleccionService);
  private candidataService = inject(CandidataService);

  eleccion = signal<Eleccion | null>(null);
  candidatas = signal<Candidata[]>([]);
  isLoading = signal(true);

  categoriaActiva = signal<CategoriaParticipante>('Embajadora');

  // Reloj de Cuenta Regresiva
  countdown = signal<CountdownTime>({
    dias: '00',
    horas: '00',
    minutos: '00',
    segundos: '00',
    iniciado: false
  });
  private timerInterval: any = null;

  // Modal de Ficha Técnica
  selectedCandidata = signal<Candidata | null>(null);
  selectedPhotoIndex = signal(0);
  isFichaModalOpen = signal(false);

  participantesFiltrados = computed(() => {
    const lista = this.candidatas().filter(c => (c.categoria || 'Embajadora') === this.categoriaActiva());
    return lista.sort((a, b) => (a.numero || 0) - (b.numero || 0));
  });

  embajadorasCount = computed(() => this.candidatas().filter(c => (c.categoria || 'Embajadora') === 'Embajadora').length);
  embajadoresCount = computed(() => this.candidatas().filter(c => c.categoria === 'Embajador').length);

  podioEmbajadoras = computed(() => {
    const chicas = this.candidatas().filter(c => (c.categoria || 'Embajadora') === 'Embajadora');
    const ordenadas = [...chicas].sort((a, b) => (b.puntuacionTotal || 0) - (a.puntuacionTotal || 0));
    const cantPuestos = this.eleccion()?.puestosFemeninos?.length || 3;
    return ordenadas.slice(0, cantPuestos);
  });

  podioEmbajadores = computed(() => {
    const chicos = this.candidatas().filter(c => c.categoria === 'Embajador');
    const ordenados = [...chicos].sort((a, b) => (b.puntuacionTotal || 0) - (a.puntuacionTotal || 0));
    const cantPuestos = this.eleccion()?.puestosMasculinos?.length || 2;
    return ordenados.slice(0, cantPuestos);
  });

  ngOnInit(): void {
    this.cargarDatosGala();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  cargarDatosGala(): void {
    this.isLoading.set(true);
    this.eleccionService.getElecciones().pipe(first()).subscribe({
      next: (elecciones) => {
        if (elecciones.length > 0) {
          const activa = elecciones.find(e => e.estado === 'Activa' || e.estado === 'Publicada') || elecciones[0];
          this.eleccion.set(activa);

          // Iniciar el reloj de cuenta regresiva
          const fechaRef = (activa.fechaEvento || activa.fechaInicio)?.toDate();
          if (fechaRef) {
            this.iniciarCountdown(fechaRef);
          }

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

  iniciarCountdown(fechaObjetivo: Date): void {
    const actualizar = () => {
      const ahora = new Date().getTime();
      const destino = fechaObjetivo.getTime();
      const diferencia = destino - ahora;

      if (diferencia <= 0) {
        this.countdown.set({ dias: '00', horas: '00', minutos: '00', segundos: '00', iniciado: true });
        if (this.timerInterval) clearInterval(this.timerInterval);
        return;
      }

      const d = Math.floor(diferencia / (1000 * 60 * 60 * 24));
      const h = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diferencia % (1000 * 60)) / 1000);

      this.countdown.set({
        dias: d < 10 ? `0${d}` : `${d}`,
        horas: h < 10 ? `0${h}` : `${h}`,
        minutos: m < 10 ? `0${m}` : `${m}`,
        segundos: s < 10 ? `0${s}` : `${s}`,
        iniciado: false
      });
    };

    actualizar();
    this.timerInterval = setInterval(actualizar, 1000);
  }

  getPuestoFemenino(index: number): string {
    return this.eleccion()?.puestosFemeninos?.[index] || `Puesto ${index + 1}`;
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
