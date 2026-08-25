import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
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

  private route = inject(ActivatedRoute);
  eleccion = signal<Eleccion | null>(null);
  candidatas = signal<Candidata[]>([]);
  isLoading = signal(true);

  // Categoría activa: 'Embajadora' o 'Embajador'
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
  private modalPhotoInterval: any = null;

  // Filtros
  participantesFiltrados = computed(() => {
    const lista = this.candidatas().filter(c => (c.categoria || 'Embajadora') === this.categoriaActiva());
    return lista.sort((a, b) => (a.numero || 0) - (b.numero || 0));
  });

  embajadorasCount = computed(() => this.candidatas().filter(c => (c.categoria || 'Embajadora') === 'Embajadora').length);
  embajadoresCount = computed(() => this.candidatas().filter(c => c.categoria === 'Embajador').length);

  ngOnInit(): void {
    this.cargarDatosGala();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.detenerPaseModal();
  }

  cargarDatosGala(): void {
    this.isLoading.set(true);
    const idParam = this.route.snapshot.paramMap.get('id');

    this.eleccionService.getElecciones().pipe(first()).subscribe({
      next: (elecciones) => {
        if (elecciones.length > 0) {

          // 1. Ordenamos de la fecha MÁS NUEVA a la más antigua
          const ordenadas = [...elecciones].sort((a, b) => {
            const fechaA = (a.fechaEvento || a.fechaInicio)?.toMillis() || 0;
            const fechaB = (b.fechaEvento || b.fechaInicio)?.toMillis() || 0;
            return fechaB - fechaA;
          });

          let galaSeleccionada: Eleccion | undefined;

          // 2. Si pasaron un ID por URL (ej: /gala/id_eleccion), busca esa exactamente
          if (idParam) {
            galaSeleccionada = ordenadas.find(e => e.id === idParam);
          }

          // 3. Si no hay ID en URL, toma la elección del año/fecha más reciente
          if (!galaSeleccionada) {
            // Prioridad:
            // A) La más reciente que esté 'Activa' (en vivo hoy)
            // B) La más reciente que esté 'Configuracion' (próxima gala del año)
            // C) La más reciente que esté 'Publicada'
            // D) La primera de la lista ordenada
            galaSeleccionada = ordenadas.find(e => e.estado === 'Activa')
                            || ordenadas.find(e => e.estado === 'Configuracion')
                            || ordenadas.find(e => e.estado === 'Publicada')
                            || ordenadas[0];
          }

          this.eleccion.set(galaSeleccionada || null);

          if (galaSeleccionada) {
            // Iniciar cuenta regresiva para la fecha de esta gala
            const fechaRef = (galaSeleccionada.fechaEvento || galaSeleccionada.fechaInicio)?.toDate();
            if (fechaRef) {
              this.iniciarCountdown(fechaRef);
            }

            // Cargar los participantes de esta gala específica
            if (galaSeleccionada.id) {
              this.candidataService.getCandidatasPorEleccion(galaSeleccionada.id).pipe(first()).subscribe({
                next: (cands) => {
                  this.candidatas.set(cands);
                  this.isLoading.set(false);
                },
                error: () => this.isLoading.set(false)
              });
            } else {
              this.isLoading.set(false);
            }
          } else {
            this.isLoading.set(false);
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

  // =========================================================
  // MODAL DE FICHA CON GALERÍA AUTOMÁTICA
  // =========================================================
  openFicha(candidata: Candidata): void {
    this.selectedCandidata.set(candidata);
    this.selectedPhotoIndex.set(0);
    this.isFichaModalOpen.set(true);
    this.iniciarPaseModal(candidata);
  }

  closeFicha(): void {
    this.detenerPaseModal();
    this.isFichaModalOpen.set(false);
    this.selectedCandidata.set(null);
  }

  iniciarPaseModal(candidata: Candidata): void {
    this.detenerPaseModal();
    const total = candidata.fotosURL?.length || 0;
    if (total > 1) {
      this.modalPhotoInterval = setInterval(() => {
        this.selectedPhotoIndex.update(idx => (idx + 1) % total);
      }, 3500);
    }
  }

  detenerPaseModal(): void {
    if (this.modalPhotoInterval) {
      clearInterval(this.modalPhotoInterval);
      this.modalPhotoInterval = null;
    }
  }

  selectPhoto(index: number): void {
    this.selectedPhotoIndex.set(index);
    if (this.selectedCandidata()) {
      this.iniciarPaseModal(this.selectedCandidata()!);
    }
  }

  nextModalPhoto(): void {
    const total = this.selectedCandidata()?.fotosURL?.length || 0;
    if (total > 1) {
      this.selectedPhotoIndex.update(i => (i + 1) % total);
    }
  }

  prevModalPhoto(): void {
    const total = this.selectedCandidata()?.fotosURL?.length || 0;
    if (total > 1) {
      this.selectedPhotoIndex.update(i => (i - 1 + total) % total);
    }
  }

  getNumeroFormat(num?: number): string {
    if (!num) return '01';
    return num < 10 ? `0${num}` : `${num}`;
  }
}
