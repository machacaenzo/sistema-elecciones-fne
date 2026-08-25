import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';

import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata, CategoriaParticipante } from '../../../core/models/candidata.model';

@Component({
  selector: 'app-podio-publico',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './podio-publico.component.html',
  styleUrls: ['./podio-publico.component.scss']
})
export class PodioPublicoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eleccionService = inject(EleccionService);
  private candidataService = inject(CandidataService);

  eleccion = signal<Eleccion | null>(null);
  candidatas = signal<Candidata[]>([]);
  isLoading = signal(true);

  // Control de tanda activa: 'Embajadora' o 'Embajador'
  tabActiva = signal<CategoriaParticipante>('Embajadora');

  // Podios Calculados Dinámicamente por Puntajes Oficiales
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
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading.set(true);
    const idParam = this.route.snapshot.paramMap.get('id');

    this.eleccionService.getElecciones().pipe(first()).subscribe({
      next: (elecciones) => {
        if (elecciones.length > 0) {

          // Ordenamos de más nueva a más antigua
          const ordenadas = [...elecciones].sort((a, b) => {
            const fechaA = (a.fechaEvento || a.fechaInicio)?.toMillis() || 0;
            const fechaB = (b.fechaEvento || b.fechaInicio)?.toMillis() || 0;
            return fechaB - fechaA;
          });

          let galaSeleccionada: Eleccion | undefined;

          if (idParam) {
            galaSeleccionada = ordenadas.find(e => e.id === idParam);
          }

          if (!galaSeleccionada) {
            galaSeleccionada = ordenadas.find(e => e.estado === 'Publicada')
                            || ordenadas.find(e => e.estado === 'Activa')
                            || ordenadas[0];
          }

          this.eleccion.set(galaSeleccionada || null);

          if (galaSeleccionada?.id) {
            this.cargarCandidatas(galaSeleccionada.id);
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

  private async cargarPorId(id: string): Promise<void> {
    try {
      const elec = await this.eleccionService.getEleccionById(id);
      if (elec) {
        this.eleccion.set(elec);
        this.cargarCandidatas(id);
      } else {
        this.router.navigate(['/']);
      }
    } catch {
      this.router.navigate(['/']);
    }
  }

  private cargarCandidatas(eleccionId: string): void {
    this.candidataService.getCandidatasPorEleccion(eleccionId).pipe(first()).subscribe({
      next: (data) => {
        this.candidatas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getPuestoFemenino(index: number): string {
    return this.eleccion()?.puestosFemeninos?.[index] || `Puesto ${index + 1}`;
  }

  getPuestoMasculino(index: number): string {
    return this.eleccion()?.puestosMasculinos?.[index] || `Puesto ${index + 1}`;
  }

  getNumeroFormat(num?: number): string {
    if (!num) return '01';
    return num < 10 ? `0${num}` : `${num}`;
  }

  // Modo Pantalla Completa para conectar al HDMI del proyector
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  }
}
