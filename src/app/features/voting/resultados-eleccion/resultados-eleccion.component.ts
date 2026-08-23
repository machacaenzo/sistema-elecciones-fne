import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; 
import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { AuthService } from '../../../core/services/auth.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-resultados-eleccion',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatTableModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
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

  rankingCompleto = computed(() => {
    const candidatasOrdenadas = [...this.candidatas()];
    const criteriosDeEleccion = this.eleccion()?.criterios || [];
    candidatasOrdenadas.sort((a, b) => {
      if (b.puntuacionTotal !== a.puntuacionTotal) return b.puntuacionTotal - a.puntuacionTotal;
      for (const criterio of criteriosDeEleccion) {
        const puntosA = a.puntuacionPorCriterio?.[criterio] || 0;
        const puntosB = b.puntuacionPorCriterio?.[criterio] || 0;
        if (puntosB !== puntosA) return puntosB - puntosA;
      }
      return (b.cantidadDeVotos || 0) - (a.cantidadDeVotos || 0);
    });
    return candidatasOrdenadas;
  });

  podio = computed(() => {
    const numeroDePuestos = this.eleccion()?.puestos?.length || 0;
    return this.rankingCompleto().slice(0, numeroDePuestos);
  });

  displayedColumns = computed(() => {
    const baseColumns = ['posicion', 'candidata', 'puntuacionTotal'];
    return [...baseColumns, ...(this.eleccion()?.criterios || [])];
  });

  async ngOnInit(): Promise<void> {
    const eleccionId = this.route.snapshot.paramMap.get('id');
    if (!eleccionId) {
      this.router.navigate(['/dashboard/votacion']);
      return;
    }

    try {
      const eleccionData = await this.eleccionService.getEleccionById(eleccionId);
      if (!eleccionData) {
        this.router.navigate(['/dashboard/votacion']);
        return;
      }
      this.eleccion.set(eleccionData);

      this.candidataService.getCandidatasPorEleccion(eleccionId).subscribe(candidatasData => {
        this.candidatas.set(candidatasData);
        this.isLoading.set(false);
      });
    } catch (error) {
      console.error("Error al cargar la elección:", error);
      this.isLoading.set(false);
      this.router.navigate(['/dashboard/votacion']);
    }
  }

  getPuestoNombre(index: number): string {
    return this.eleccion()?.puestos?.[index] || `Puesto ${index + 1}`;
  }
}
