import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-ganadores-escenario',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ganadores-escenario.component.html',
  styleUrls: ['./ganadores-escenario.component.scss']
})
export class GanadoresEscenarioComponent implements OnInit, OnDestroy {
  private candidataService = inject(CandidataService);
  private eleccionService = inject(EleccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  eleccionActiva = signal<Eleccion | null>(null);
  candidatas = signal<Candidata[]>([]);
  categoriaActiva = signal<'Embajadora' | 'Embajador'>('Embajadora');
  showFireworks = signal(true);
  isLoading = signal(true);

  // Control de Pantalla Completa (Oculta botones)
  isFullscreen = signal(false);

  // Control del pase automático cada 15 segundos
  isAutoPlay = signal(true);
  private autoPlayInterval: any = null;

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Lógica del Podio de Ganadores
  podio = computed(() => {
    const cat = this.categoriaActiva();
    const listaOriginal = this.candidatas();

    const listaFiltrada = listaOriginal.filter(c => {
      if (cat === 'Embajador') {
        return c.categoria === 'Embajador' || c.categoria === 'Paje';
      }
      return (c.categoria || 'Embajadora') === 'Embajadora';
    });

    const ordenados = [...listaFiltrada].sort((a, b) =>
      (Number(b.puntuacionTotal) || 0) - (Number(a.puntuacionTotal) || 0)
    );

    return {
      primero: ordenados[0] || null,
      segundo: ordenados[1] || null,
      tercero: ordenados[2] || null,
      resto: ordenados.slice(3, 7)
    };
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.cargarDatos(id || undefined);
    });
  }

  ngOnDestroy(): void {
    this.detenerAutoPlay();
  }

  async cargarDatos(id?: string) {
    this.isLoading.set(true);
    try {
      let eleccionEncontrada: Eleccion | undefined;

      if (id && id !== 'undefined') {
        eleccionEncontrada = await this.eleccionService.getEleccionById(id);
      } else {
        const elecciones = await firstValueFrom(this.eleccionService.getElecciones());
        if (elecciones && elecciones.length > 0) {
          const ordenadas = [...elecciones].sort((a, b) => {
            const fechaA = (a.fechaEvento || a.fechaInicio)?.toMillis() || 0;
            const fechaB = (b.fechaEvento || b.fechaInicio)?.toMillis() || 0;
            return fechaB - fechaA;
          });

          eleccionEncontrada = ordenadas.find(e => e.estado === 'Publicada')
                           || ordenadas.find(e => e.estado === 'Activa')
                           || ordenadas[0];
        }
      }

      if (eleccionEncontrada && eleccionEncontrada.id) {
        this.eleccionActiva.set(eleccionEncontrada);

        const participantes = await firstValueFrom(this.candidataService.getCandidatasPorEleccion(eleccionEncontrada.id));
        this.candidatas.set(participantes);

        const tieneMujeres = participantes.some(c => (c.categoria || 'Embajadora') === 'Embajadora');
        const tieneHombres = participantes.some(c => c.categoria === 'Embajador');

        if (!tieneMujeres && tieneHombres) {
          this.categoriaActiva.set('Embajador');
        }

        // Si existen ambas categorías, iniciamos la alternancia automática cada 15 segundos
        if (tieneMujeres && tieneHombres) {
          this.iniciarAutoPlay();
        }
      }
    } catch (error) {
      console.error('Error al cargar escenario:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // SHOW AUTOMÁTICO CADA 15 SEGUNDOS
  iniciarAutoPlay(): void {
    this.detenerAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      if (this.isAutoPlay()) {
        const siguiente = this.categoriaActiva() === 'Embajadora' ? 'Embajador' : 'Embajadora';
        this.setCategoria(siguiente);
      }
    }, 15000); // 👈 15 segundos
  }

  detenerAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  toggleAutoPlay(): void {
    this.isAutoPlay.update(v => !v);
  }

  setCategoria(cat: 'Embajadora' | 'Embajador'): void {
    this.categoriaActiva.set(cat);
    this.showFireworks.set(false);
    setTimeout(() => this.showFireworks.set(true), 150);
  }

  getPuestoNombre(index: number): string {
    const e = this.eleccionActiva();
    if (!e) return `Puesto ${index + 1}`;

    if (this.categoriaActiva() === 'Embajadora') {
      return e.puestosFemeninos?.[index] || e.puestos?.[index] || (index === 0 ? 'EMBAJADORA' : `${index + 1}° Princesa`);
    } else {
      return e.puestosMasculinos?.[index] || (index === 0 ? 'EMBAJADOR' : `${index + 1}° Paje`);
    }
  }

  formatNumero(num?: number): string {
    if (!num) return '01';
    return num < 10 ? `0${num}` : `${num}`;
  }

  salir(): void {
    this.detenerAutoPlay();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.router.navigate(['/dashboard/admin/elections']);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  }
}
