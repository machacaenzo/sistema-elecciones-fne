import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { AuthService } from '../../../core/services/auth.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';

@Component({
  selector: 'app-resultados-eleccion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resultados-eleccion.component.html',
  styleUrls: ['./resultados-eleccion.component.scss']
})
export class ResultadosEleccionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eleccionService = inject(EleccionService);
  private candidataService = inject(CandidataService);
  authService = inject(AuthService);

  eleccion = signal<Eleccion | null>(null);
  candidatas = signal<Candidata[]>([]);
  isLoading = signal(true);

  // Control de pestañas en pantalla: 'Embajadora' | 'Embajador' | 'Matriz'
  tabActiva = signal<'Embajadora' | 'Embajador' | 'Matriz'>('Embajadora');

  // Permisos
  isAdmin = computed(() => this.authService.currentUser()?.rol === 'Administrador');

  // 1. RANKING COMPLETO DE CHICAS (Ordenado con desempates por sus criterios)
  rankingEmbajadoras = computed(() => {
    const chicas = this.candidatas().filter(c => c.categoria === 'Embajadora' || !c.categoria);
    const criterios = this.eleccion()?.criteriosFemeninos || this.eleccion()?.criterios || [];
    return this.ordenarParticipantes(chicas, criterios);
  });

  // 2. RANKING COMPLETO DE CHICOS (Ordenado con desempates por sus criterios)
  rankingEmbajadores = computed(() => {
    const chicos = this.candidatas().filter(c => c.categoria === 'Embajador');
    const criterios = this.eleccion()?.criteriosMasculinos || this.eleccion()?.criterios || [];
    return this.ordenarParticipantes(chicos, criterios);
  });

  // 3. PODIO FEMENINO DINÁMICO (Toma exactamente la cantidad de puestos configurados)
  podioFemenino = computed(() => {
    const cantidadPuestos = this.eleccion()?.puestosFemeninos?.length || 0;
    return this.rankingEmbajadoras().slice(0, cantidadPuestos);
  });

  // 4. PODIO MASCULINO DINÁMICO (Toma exactamente la cantidad de puestos configurados)
  podioMasculino = computed(() => {
    const cantidadPuestos = this.eleccion()?.puestosMasculinos?.length || 0;
    return this.rankingEmbajadores().slice(0, cantidadPuestos);
  });

  async ngOnInit(): Promise<void> {
    const eleccionId = this.route.snapshot.paramMap.get('id');
    if (!eleccionId) {
      this.router.navigate(['/dashboard/home']);
      return;
    }

    try {
      const eleccionData = await this.eleccionService.getEleccionById(eleccionId);
      if (!eleccionData) {
        this.router.navigate(['/dashboard/home']);
        return;
      }
      this.eleccion.set(eleccionData);

      this.candidataService.getCandidatasPorEleccion(eleccionId).subscribe(data => {
        this.candidatas.set(data);
        this.isLoading.set(false);
      });
    } catch (error) {
      console.error('Error al cargar resultados:', error);
      this.isLoading.set(false);
      this.router.navigate(['/dashboard/home']);
    }
  }

  // Ordenamiento matemático oficial por puntajes y desempates dinámicos
  private ordenarParticipantes(lista: Candidata[], criterios: string[]): Candidata[] {
    const copia = [...lista];
    return copia.sort((a, b) => {
      // 1° Criterio: Mayor Puntaje Total
      if (b.puntuacionTotal !== a.puntuacionTotal) {
        return b.puntuacionTotal - a.puntuacionTotal;
      }
      // 2° Criterio: Desempate por cada criterio en el orden configurado por el colegio
      for (const criterio of criterios) {
        const puntosA = a.puntuacionPorCriterio?.[criterio] || 0;
        const puntosB = b.puntuacionPorCriterio?.[criterio] || 0;
        if (puntosB !== puntosA) {
          return puntosB - puntosA;
        }
      }
      // 3° Criterio: Mayor cantidad de votos recibidos
      return (b.cantidadDeVotos || 0) - (a.cantidadDeVotos || 0);
    });
  }

  // Obtiene el título exacto configurado para el puesto femenino N° index
  getPuestoFemeninoNombre(index: number): string {
    return this.eleccion()?.puestosFemeninos?.[index] || `Puesto ${index + 1}`;
  }

  // Obtiene el título exacto configurado para el puesto masculino N° index
  getPuestoMasculinoNombre(index: number): string {
    return this.eleccion()?.puestosMasculinos?.[index] || `Puesto ${index + 1}`;
  }

  // Pantalla Completa para conectar al Proyector / Pantalla LED del escenario
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  }
}
