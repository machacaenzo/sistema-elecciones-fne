import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';

import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { EvaluacionPayload, VotacionService } from '../votacion.service';
import { DetalleEleccionComponent } from '../detalle-eleccion/detalle-eleccion.component';

@Component({
  selector: 'app-votacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, DetalleEleccionComponent],
  templateUrl: './votacion.component.html',
  styleUrls: ['./votacion.component.scss']
})
export class VotacionComponent implements OnInit, OnDestroy{
  private eleccionService = inject(EleccionService);
  private candidataService = inject(CandidataService);
  private votacionService = inject(VotacionService);
  authService = inject(AuthService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  todasLasElecciones = signal<Eleccion[]>([]);
  isLoading = signal(true);
  today = new Date();

  // Estados de Votación
  isVotingMode = signal(false);
  isReviewMode = signal(false);
  selectedEleccion = signal<Eleccion | null>(null);
  candidatas = signal<Candidata[]>([]);
  isVotingLoading = signal(false);
  votacionForm!: FormGroup;
  currentStep = signal(0);
  carouselImageIndex = signal(0);
  isSubmitting = signal(false);


  private photoSlideshowInterval: any = null;


  // Alternar entre Embajadoras y Embajadores directamente desde la pantalla de Auditoría
toggleCategoriaAudit(): void {
  const actual = this.categoriaSeleccionada();
  const nueva: 'Embajadora' | 'Embajador' = (actual === 'Embajador') ? 'Embajadora' : 'Embajador';
  this.categoriaSeleccionada.set(nueva);
  this.cargarBorradorLocal(nueva);
  this.isReviewMode.set(true); // Se mantiene en la pantalla de resumen
}

  // Control de tanda activa: 'Embajadora' | 'Embajador'
  categoriaSeleccionada = signal<'Embajadora' | 'Embajador' | null>(null);

  isDetalleMode = signal(false);
  selectedEleccionParaDetalle = signal<Eleccion | null>(null);

  constructor() {
    this.votacionForm = this.fb.group({ evaluaciones: this.fb.array([]) });
  }

  get evaluacionesArray(): FormArray {
    return this.votacionForm.get('evaluaciones') as FormArray;
  }

  ngOnInit(): void {
  this.loadElecciones();
  this.iniciarPaseAutomaticoFotos();
}

ngOnDestroy(): void {
  if (this.photoSlideshowInterval) {
    clearInterval(this.photoSlideshowInterval);
  }
}

  loadElecciones(): void {
    this.isLoading.set(true);
    this.eleccionService.getElecciones().pipe(first()).subscribe({
      next: (elecciones) => {
        this.todasLasElecciones.set(elecciones.sort((a, b) =>
          ((b.fechaEvento || b.fechaInicio)?.toMillis() || 0) - ((a.fechaEvento || a.fechaInicio)?.toMillis() || 0)
        ));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  formatNumero(num: number | undefined | null): string {
    const n = num ?? 0;
    return n < 10 ? `0${n}` : `${n}`;
  }

  openVotingMode(eleccion: Eleccion): void {
    this.selectedEleccion.set(eleccion);
    this.isVotingMode.set(true);
    this.isVotingLoading.set(true);
    this.categoriaSeleccionada.set(null);
    this.evaluacionesArray.clear();

    this.candidataService.getCandidatasPorEleccion(eleccion.id!).pipe(first()).subscribe(candidatas => {
      const ordenadas = candidatas.sort((a, b) => (a.numero || 0) - (b.numero || 0));
      this.candidatas.set(ordenadas);
      this.buildCandidatasForm(eleccion);
      this.isVotingLoading.set(false);
    });
  }

  buildCandidatasForm(eleccion: Eleccion): void {
    this.evaluacionesArray.clear();
    this.candidatas().forEach(candidata => {
      const criteriaGroup: { [key: string]: any } = { candidataId: [candidata.id] };
      const criterios = this.getCriteriosParaCandidata(candidata, eleccion);

      criterios.forEach(c => {
        criteriaGroup[c] = [0, [Validators.required, Validators.min(0), Validators.max(10)]];
      });

      this.evaluacionesArray.push(this.fb.group(criteriaGroup));
    });
  }

  // Seleccionar Tanda (Embajadoras o Embajadores) y restaurar borrador guardado
  seleccionarTanda(cat: 'Embajadora' | 'Embajador'): void {
    this.categoriaSeleccionada.set(cat);
    this.isReviewMode.set(false);
    this.carouselImageIndex.set(0);

    // Restaurar borrador del dispositivo si existe
    this.cargarBorradorLocal(cat);

    // Posicionarse en el primer candidato de esa categoría
    const filtrados = this.getCandidatasFiltradas();
    if (filtrados.length > 0) {
      const primerIdx = this.candidatas().indexOf(filtrados[0]);
      this.currentStep.set(primerIdx >= 0 ? primerIdx : 0);
    }
  }

  getCandidatasFiltradas(): Candidata[] {
    const cat = this.categoriaSeleccionada();
    return this.candidatas().filter(c => {
      if (cat === 'Embajador') return c.categoria === 'Embajador' || c.categoria === 'Paje';
      return (c.categoria || 'Embajadora') === 'Embajadora';
    });
  }

  // Salto inmediato a un candidato al tocar su miniatura (incluso desde el resumen)
  selectCandidate(candidata: Candidata): void {
    const idx = this.candidatas().findIndex(c => c.id === candidata.id);
    if (idx >= 0) {
      this.currentStep.set(idx);
      this.carouselImageIndex.set(0);
      // Apagamos el modo resumen para volver de inmediato a los sliders
      this.isReviewMode.set(false);
    }
  }

  // Actualizar slider y guardar en LocalStorage automáticamente
  updateSliderValue(index: number, controlName: string, event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    const control = this.evaluacionesArray.at(index)?.get(controlName);
    if (control) {
      control.setValue(val);
      this.guardarBorradorLocal();
    }
  }

  getEvaluacionValue(index: number, controlName: string): number {
    return this.evaluacionesArray.at(index)?.get(controlName)?.value || 0;
  }

  calculateTotalScore(idx: number): number {
    const group = this.evaluacionesArray.at(idx) as FormGroup;
    if (!group || !this.candidatas()[idx] || !this.selectedEleccion()) return 0;

    const criterios = this.getCriteriosParaCandidata(this.candidatas()[idx], this.selectedEleccion()!);
    return criterios.reduce((acc, c) => acc + (group.get(c)?.value || 0), 0);
  }

  // Puntaje acumulado en vivo para la miniatura del carrusel
  calculateTotalScoreByCandidate(candidata: Candidata): number {
    const idx = this.candidatas().findIndex(c => c.id === candidata.id);
    return idx >= 0 ? this.calculateTotalScore(idx) : 0;
  }

  getCriteriosParaCandidata(c: Candidata, e: Eleccion): string[] {
    if (c.categoria === 'Embajador') {
      return e.criteriosMasculinos || e.criterios || ['Actitud', 'Simpatía', 'Pasarela'];
    }
    return e.criteriosFemeninos || e.criterios || ['Elegancia', 'Porte', 'Pasarela'];
  }

  // =========================================================
  // GESTIÓN DE BORRADORES (LOCALSTORAGE EN VIVO)
  // =========================================================
  private getDraftStorageKey(cat: string): string {
    const eleccionId = this.selectedEleccion()?.id || 'temp';
    const userId = this.authService.currentUser()?.uid || 'anon';
    return `borrador_gala_${eleccionId}_${userId}_${cat}`;
  }

  private guardarBorradorLocal(): void {
    const cat = this.categoriaSeleccionada();
    if (!cat) return;
    const key = this.getDraftStorageKey(cat);
    localStorage.setItem(key, JSON.stringify(this.evaluacionesArray.value));
  }

  private cargarBorradorLocal(cat: string): void {
    const key = this.getDraftStorageKey(cat);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const valores = JSON.parse(saved);
        if (Array.isArray(valores) && valores.length === this.evaluacionesArray.length) {
          this.evaluacionesArray.patchValue(valores, { emitEvent: false });
        }
      } catch (e) {
        console.error('Error al restaurar borrador local:', e);
      }
    }
  }

  private limpiarBorradorLocal(cat: string): void {
    const key = this.getDraftStorageKey(cat);
    localStorage.removeItem(key);
  }

  // =========================================================
  // CONTROL DE TANDAS Y FIRMA
  // =========================================================
  tandaFirmada(categoria: 'Embajadora' | 'Embajador'): boolean {
  const user = this.authService.currentUser();
  const eleccionId = this.selectedEleccion()?.id;
  if (!user || !eleccionId) return false;

  const tandas = user.tandasVotadas || [];
  return tandas.includes(`${eleccionId}_${categoria}`);
}


  todasLasTandasFirmadas(eleccionId: string): boolean {
    const user = this.authService.currentUser() as any;
    if (!user) return false;
    const elecciones = user.eleccionesVotadas || [];
    return elecciones.includes(eleccionId);
  }

  openDetalleMode(e: Eleccion): void {
    this.selectedEleccionParaDetalle.set(e);
    this.isDetalleMode.set(true);
  }

  closeDetalleMode(): void {
    this.isDetalleMode.set(false);
  }

  handleIniciarVotacion(e: Eleccion): void {
    this.closeDetalleMode();
    setTimeout(() => this.openVotingMode(e), 200);
  }

  closeVotingMode(): void {
    this.isVotingMode.set(false);
    this.isReviewMode.set(false);
    this.categoriaSeleccionada.set(null);
    this.loadElecciones();
  }

  enterReviewMode(): void {
    this.isReviewMode.set(true);
  }

  openResultadosMode(e: Eleccion): void {
    if (e.id) this.router.navigate(['/dashboard/resultados', e.id]);
  }

  haVotado(eleccionId: string): boolean {
  const user = this.authService.currentUser();
  if (!user) return false;

  // Solo consideramos la elección terminada si ya firmó AMBAS tandas
  const tandas = user.tandasVotadas || [];
  const firmoChicas = tandas.includes(`${eleccionId}_Embajadora`);
  const firmoChicos = tandas.includes(`${eleccionId}_Embajador`);

  const tieneChicas = this.candidatas().some(c => (c.categoria || 'Embajadora') === 'Embajadora');
  const tieneChicos = this.candidatas().some(c => c.categoria === 'Embajador');

  if (tieneChicas && tieneChicos) {
    return firmoChicas && firmoChicos;
  }
  return firmoChicas || firmoChicos;
}

  // =========================================================
  // ENVÍO DEFINITIVO DEL ACTA DE LA TANDA
  // =========================================================
  async onSubmit(): Promise<void> {
    const cat = this.categoriaSeleccionada();
    if (!cat || this.isSubmitting()) return;

    const nombrePlural = cat === 'Embajador' ? 'Embajadores' : 'Embajadoras';

    const res = await this.notificationService.showConfirm(
      `¿Firmar Acta de ${nombrePlural}?`,
      `Esta acción enviará los puntajes oficiales de esta tanda de forma inalterable.`,
      'Sí, Firmar Acta'
    );

    if (res.isConfirmed) {
      this.isSubmitting.set(true);
      try {
        const evaluacionesCompletas = this.evaluacionesArray.value;
        const payloadFiltrado: EvaluacionPayload[] = [];

        this.candidatas().forEach((cand, index) => {
          const esMismaCat = (cat === 'Embajador')
            ? (cand.categoria === 'Embajador' || cand.categoria === 'Paje')
            : (cand.categoria === 'Embajadora');

          if (esMismaCat) {
            const evaluacionForm = evaluacionesCompletas[index];
            const criterios = this.getCriteriosParaCandidata(cand, this.selectedEleccion()!);

            let total = 0;
            const porCrit: { [key: string]: number } = {};

            criterios.forEach(c => {
              const pts = evaluacionForm[c] || 0;
              total += pts;
              porCrit[c] = pts;
            });

            payloadFiltrado.push({
              candidataId: cand.id!,
              puntuacion: total,
              puntuacionPorCriterio: porCrit
            });
          }
        });

        if (payloadFiltrado.length === 0) {
          this.notificationService.showAlertWarning('Atención', 'No hay votos cargados para enviar en esta tanda.');
          this.isSubmitting.set(false);
          return;
        }

        // Comprobar si la otra categoría ya fue firmada para marcar la elección completa
        // Detección segura de si quedan otras categorías
const otraCat = cat === 'Embajadora' ? 'Embajador' : 'Embajadora';
const yaFirmoLaOtra = this.tandaFirmada(otraCat);
const hayCandidatosDeLaOtra = this.candidatas().some(c =>
  otraCat === 'Embajador' ? (c.categoria === 'Embajador' || c.categoria === 'Paje') : ((c.categoria || 'Embajadora') === 'Embajadora')
);

const esUltimaTanda = yaFirmoLaOtra || !hayCandidatosDeLaOtra;

        // Enviar a Firebase
        await this.votacionService.submitVoto(
          this.selectedEleccion()!.id!,
          this.authService.currentUser()!.uid,
          cat,
          payloadFiltrado,
          esUltimaTanda
        );

        // Limpiar el borrador local de esta tanda
        this.limpiarBorradorLocal(cat);

        this.notificationService.showSuccessToast(`Acta de ${nombrePlural} firmada con éxito`);

        // Volver a la pantalla de selección de tanda
        this.isReviewMode.set(false);
        this.categoriaSeleccionada.set(null);

        await this.authService.refreshUserProfile();

      } catch (err: any) {
        console.error(err);
        this.notificationService.showAlertError('Error', err.message || 'No se pudieron registrar los votos.');
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  // Navegación de fotos de la candidata
nextImage(candidata: Candidata): void {
  const total = candidata.fotosURL?.length || 0;
  if (total > 1) {
    this.carouselImageIndex.update(i => (i + 1) % total);
  }
}

previousImage(candidata: Candidata): void {
  const total = candidata.fotosURL?.length || 0;
  if (total > 1) {
    this.carouselImageIndex.update(i => (i - 1 + total) % total);
  }
}

setImageIndex(i: number): void {
  this.carouselImageIndex.set(i);
}
iniciarPaseAutomaticoFotos(): void {
  if (this.photoSlideshowInterval) clearInterval(this.photoSlideshowInterval);

  // Cada 3.5 segundos cambia de foto suavemente si tiene más de 1 foto
  this.photoSlideshowInterval = setInterval(() => {
    const candidataActual = this.candidatas()[this.currentStep()];
    const totalFotos = candidataActual?.fotosURL?.length || 0;
    if (totalFotos > 1) {
      this.carouselImageIndex.update(idx => (idx + 1) % totalFotos);
    }
  }, 3500);
}

selectImageIndex(idx: number): void {
  this.carouselImageIndex.set(idx);
  this.iniciarPaseAutomaticoFotos(); // Reinicia el tiempo al hacer clic
}
}
