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


  // 2. RANKING COMPLETO DE CHICOS (Ordenado con desempates por sus criterios)
  // ... dentro de la clase ResultadosEleccionComponent

  // 1. RANKING COMPLETO DE CHICAS (Filtrado mejorado)
  rankingEmbajadoras = computed(() => {
    const chicas = this.candidatas().filter(c =>
      c.categoria?.toLowerCase() === 'embajadora' || !c.categoria
    );
    const criterios = this.eleccion()?.criteriosFemeninos || this.eleccion()?.criterios || [];
    return this.ordenarParticipantes(chicas, criterios);
  });

  // 2. RANKING COMPLETO DE CHICOS (Filtrado mejorado)
  rankingEmbajadores = computed(() => {
    const chicos = this.candidatas().filter(c =>
      c.categoria?.toLowerCase() === 'embajador' || c.categoria?.toLowerCase() === 'paje'
    );
    const criterios = this.eleccion()?.criteriosMasculinos || this.eleccion()?.criterios || [];
    return this.ordenarParticipantes(chicos, criterios);
  });

  // 3. PODIO FEMENINO (Si no hay puestos configurados, muestra los top 3)
  podioFemenino = computed(() => {
    const puestosConfigurados = this.eleccion()?.puestosFemeninos?.length || 0;
    const limite = puestosConfigurados > 0 ? puestosConfigurados : 3; // Mínimo 3 para que no se vea vacío
    return this.rankingEmbajadoras().slice(0, limite);
  });

  // 4. PODIO MASCULINO (Si no hay puestos configurados, muestra los top 3)
  podioMasculino = computed(() => {
    const puestosConfigurados = this.eleccion()?.puestosMasculinos?.length || 0;
    const limite = puestosConfigurados > 0 ? puestosConfigurados : 3; // Mínimo 3 para que no se vea vacío
    return this.rankingEmbajadores().slice(0, limite);
  });

  // 5. Función de ordenamiento (Aseguramos que trate los puntos como números)
  private ordenarParticipantes(lista: Candidata[], criterios: string[]): Candidata[] {
    return [...lista].sort((a, b) => {
      const puntosA = Number(a.puntuacionTotal) || 0;
      const puntosB = Number(b.puntuacionTotal) || 0;

      if (puntosB !== puntosA) {
        return puntosB - puntosA;
      }

      for (const criterio of criterios) {
        const cA = Number(a.puntuacionPorCriterio?.[criterio]) || 0;
        const cB = Number(b.puntuacionPorCriterio?.[criterio]) || 0;
        if (cB !== cA) return cB - cA;
      }
      return (b.cantidadDeVotos || 0) - (a.cantidadDeVotos || 0);
    });
  }

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

  // Define los grupos para la matriz de forma limpia en el TS
matrizData = computed(() => {
  const e = this.eleccion();
  if (!e) return [];

  return [
    {
      titulo: 'EMBAJADORAS',
      candidatas: this.rankingEmbajadoras(),
      criterios: e.criteriosFemeninos || e.criterios || []
    },
    {
      titulo: 'EMBAJADORES',
      candidatas: this.rankingEmbajadores(),
      criterios: e.criteriosMasculinos || e.criterios || []
    }
  ];
});

// Agrega este método dentro de la clase en el archivo .ts
formatNumero(num: number | undefined | null): string {
  const n = num ?? 0;
  return n < 10 ? `0${n}` : `${n}`;
}
}
