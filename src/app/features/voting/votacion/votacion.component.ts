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

// Sub-componentes standalone de votación
import { EleccionListaComponent }     from './eleccion-lista/eleccion-lista.component';
import { VotacionTandaComponent }     from './votacion-tanda/votacion-tanda.component';
import { VotacionMesaComponent }      from './votacion-mesa/votacion-mesa.component';
import { VotacionAuditoriaComponent } from './votacion-auditoria/votacion-auditoria.component';

@Component({
  selector: 'app-votacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DetalleEleccionComponent,
    EleccionListaComponent,
    VotacionTandaComponent,
    VotacionMesaComponent,
    VotacionAuditoriaComponent
  ],
  templateUrl: './votacion.component.html',
  styleUrls: ['./votacion.component.scss']
})
export class VotacionComponent implements OnInit, OnDestroy {
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

  // REGLA: Los sliders inician en 5 (rango 5 a 10)
  buildCandidatasForm(eleccion: Eleccion): void {
    this.evaluacionesArray.clear();
    this.candidatas().forEach(candidata => {
      const criteriaGroup: { [key: string]: any } = { candidataId: [candidata.id] };
      const criterios = this.getCriteriosParaCandidata(candidata, eleccion);

      criterios.forEach(c => {
        criteriaGroup[c] = [5, [Validators.required, Validators.min(5), Validators.max(10)]];
      });

      this.evaluacionesArray.push(this.fb.group(criteriaGroup));
    });
  }

  getCandidatasFiltradas(): Candidata[] {
    const cat = this.categoriaSeleccionada();
    return this.candidatas().filter(c => {
      if (cat === 'Embajador') return c.categoria === 'Embajador' || c.categoria === 'Paje';
      return (c.categoria || 'Embajadora') === 'Embajadora';
    });
  }

  selectCandidate(candidata: Candidata): void {
    const idx = this.candidatas().findIndex(c => c.id === candidata.id);
    if (idx >= 0) {
      this.currentStep.set(idx);
      this.carouselImageIndex.set(0);
      this.isReviewMode.set(false);
    }
  }

  updateSliderValue(index: number, controlName: string, event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    const control = this.evaluacionesArray.at(index)?.get(controlName);
    if (control) {
      control.setValue(val);
      this.guardarBorradorLocal();
    }
  }

  getEvaluacionValue(index: number, controlName: string): number {
  const controlVal = this.evaluacionesArray.at(index)?.get(controlName)?.value;
  if (controlVal !== null && controlVal !== undefined && !isNaN(controlVal)) {
    return Math.max(5, Math.min(10, Number(controlVal))); // 👈 Clampeado estrictamente entre 5 y 10
  }
  return 5;
}
  calculateTotalScore(idx: number): number {
    const group = this.evaluacionesArray.at(idx) as FormGroup;
    if (!group || !this.candidatas()[idx] || !this.selectedEleccion()) return 0;

    const criterios = this.getCriteriosParaCandidata(this.candidatas()[idx], this.selectedEleccion()!);
    return criterios.reduce((acc, c) => acc + (group.get(c)?.value || 0), 0);
  }

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

  // GESTIÓN DE BORRADORES LOCALES
  private getDraftStorageKey(cat: string): string {
    const eleccionId = this.selectedEleccion()?.id || 'temp';
    const userId = this.authService.currentUser()?.uid || 'anon';
    return `borrador_gala_${eleccionId}_${userId}_${cat}`;
  }

  guardarBorradorLocal(): void {
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
        // Sanitizamos para que ningún valor quede en 0
        const sanitizados = valores.map((grupo: any) => {
          const nuevoGrupo: any = { ...grupo };
          for (const k in nuevoGrupo) {
            if (k !== 'candidataId') {
              nuevoGrupo[k] = Math.max(5, Math.min(10, Number(nuevoGrupo[k]) || 5));
            }
          }
          return nuevoGrupo;
        });
        this.evaluacionesArray.patchValue(sanitizados, { emitEvent: false });
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

  tandaFirmada(categoria: 'Embajadora' | 'Embajador'): boolean {
    const user = this.authService.currentUser() as any;
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
    const user = this.authService.currentUser() as any;
    if (!user) return false;

    const elecciones = user.eleccionesVotadas || [];
    if (elecciones.includes(eleccionId)) return true;

    const tandas = user.tandasVotadas || [];
    const firmoChicas = tandas.includes(`${eleccionId}_Embajadora`);
    const firmoChicos = tandas.includes(`${eleccionId}_Embajador`);

    return firmoChicas && firmoChicos;
  }

  async onSubmit(): Promise<void> {
    const cat = this.categoriaSeleccionada();
    if (!cat || this.isSubmitting()) return;

    const nombrePlural = cat === 'Embajador' ? 'Embajadores' : 'Embajadoras';
    const res = await this.notificationService.showConfirm(`¿Firmar Acta de ${nombrePlural}?`, `Esta acción enviará los puntajes oficiales de esta tanda de forma inalterable.`, 'Confirmar');

    if (res.isConfirmed) {
      this.isSubmitting.set(true);
      try {
        const evaluacionesCompletas = this.evaluacionesArray.value;
        const payloadFiltrado: EvaluacionPayload[] = [];

        this.candidatas().forEach((cand, idx) => {
          const esMismo = cat === 'Embajador'
            ? (cand.categoria === 'Embajador' || cand.categoria === 'Paje')
            : (cand.categoria === 'Embajadora' || !cand.categoria);

          if (esMismo) {
            const formValue = evaluacionesCompletas[idx];
            const criterios = this.getCriteriosParaCandidata(cand, this.selectedEleccion()!);
            const porCrit: { [key: string]: number } = {};
            let sumaCandidata = 0;

            criterios.forEach((cr: string) => {
              const valor = formValue[cr] || 5;
              porCrit[cr] = valor;
              sumaCandidata += valor;
            });

            payloadFiltrado.push({
              candidataId: cand.id!,
              puntuacion: sumaCandidata,
              puntuacionPorCriterio: porCrit
            });
          }
        });

        if (payloadFiltrado.length === 0) {
          throw new Error('No hay candidatos para calificar en esta tanda.');
        }

        const otra = cat === 'Embajadora' ? 'Embajador' : 'Embajadora';
        const esUltima = this.tandaFirmada(otra);

        await this.votacionService.submitVoto(
          this.selectedEleccion()!.id!,
          this.authService.currentUser()!.uid,
          cat,
          payloadFiltrado,
          esUltima
        );

        this.limpiarBorradorLocal(cat);
        this.notificationService.showSuccessToast('Acta firmada y registrada correctamente');

        this.categoriaSeleccionada.set(null);
        this.isReviewMode.set(false);
        await this.authService.refreshUserProfile();

      } catch (e: any) {
        this.notificationService.showAlertError('Error', e.message);
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  // Control de fotos
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
    this.iniciarPaseAutomaticoFotos();
  }

  async cargarVotoFirmado(cat: 'Embajadora' | 'Embajador'): Promise<void> {
    const eleccionId = this.selectedEleccion()?.id;
    const userId = this.authService.currentUser()?.uid;
    if (!eleccionId || !userId) return;

    try {
      const voto = await this.votacionService.getVotoFirmado(eleccionId, userId, cat);
      if (voto && voto['evaluaciones']) {
        this.candidatas().forEach((cand, idx) => {
          const evaluacion = voto['evaluaciones'].find((ev: any) => ev.candidataId === cand.id);
          if (evaluacion && evaluacion.puntuacionPorCriterio) {
            const formValues = {
              candidataId: cand.id,
              ...evaluacion.puntuacionPorCriterio
            };
            this.evaluacionesArray.at(idx)?.patchValue(formValues, { emitEvent: false });
          }
        });
      }
    } catch (err) {
      console.error('Error al cargar voto firmado:', err);
    }
  }

  async seleccionarTanda(cat: 'Embajadora' | 'Embajador'): Promise<void> {
    this.categoriaSeleccionada.set(cat);
    this.isReviewMode.set(false);
    this.carouselImageIndex.set(0);

    if (this.tandaFirmada(cat)) {
      await this.cargarVotoFirmado(cat);
    } else {
      this.cargarBorradorLocal(cat);
    }

    const filtrados = this.getCandidatasFiltradas();
    if (filtrados.length > 0) {
      const primerIdx = this.candidatas().indexOf(filtrados[0]);
      this.currentStep.set(primerIdx >= 0 ? primerIdx : 0);
    }
  }

  async toggleCategoriaAudit(): Promise<void> {
    const actual = this.categoriaSeleccionada();
    const nueva: 'Embajadora' | 'Embajador' = (actual === 'Embajador') ? 'Embajadora' : 'Embajador';
    this.categoriaSeleccionada.set(nueva);

    if (this.tandaFirmada(nueva)) {
      await this.cargarVotoFirmado(nueva);
    } else {
      this.cargarBorradorLocal(nueva);
    }

    this.isReviewMode.set(true);
  }
}
