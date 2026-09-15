import { Component, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { EvaluacionPayload, VotacionService } from '../votacion.service';
import { DetalleEleccionComponent } from '../detalle-eleccion/detalle-eleccion.component';

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
  private formAutoSaveSub?: Subscription;

  categoriaSeleccionada = signal<'Embajadora' | 'Embajador' | null>(null);
  isDetalleMode = signal(false);
  selectedEleccionParaDetalle = signal<Eleccion | null>(null);

  constructor() {
    this.votacionForm = this.fb.group({ evaluaciones: this.fb.array([]) });
  }

  get evaluacionesArray(): FormArray {
    return this.votacionForm.get('evaluaciones') as FormArray;
  }

  @HostListener('window:beforeunload', ['$event'])
  prevenirCierreInvoluntario($event: BeforeUnloadEvent): void {
    const cat = this.categoriaSeleccionada();
    if (this.isVotingMode() && cat && !this.tandaFirmada(cat)) {
      $event.preventDefault();
      $event.returnValue = '';
    }
  }

  ngOnInit(): void {
    this.loadElecciones();
    this.iniciarPaseAutomaticoFotos();
  }

  ngOnDestroy(): void {
    if (this.photoSlideshowInterval) clearInterval(this.photoSlideshowInterval);
    if (this.formAutoSaveSub) this.formAutoSaveSub.unsubscribe();
  }

  getNombreCriterio(criterio: string): string {
    if (!criterio) return '';
    return criterio.includes(':') ? criterio.split(':')[0].trim() : criterio.trim();
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

    if (this.formAutoSaveSub) this.formAutoSaveSub.unsubscribe();

    this.candidataService.getCandidatasPorEleccion(eleccion.id!).pipe(first()).subscribe(candidatas => {
      const ordenadas = candidatas.sort((a, b) => (a.numero || 0) - (b.numero || 0));
      this.candidatas.set(ordenadas);
      this.buildCandidatasForm(eleccion);

      // Auto-guardado reactivo instantáneo
      this.formAutoSaveSub = this.votacionForm.valueChanges.subscribe(() => {
        this.guardarBorradorLocal();
      });

      this.isVotingLoading.set(false);
    });
  }

  buildCandidatasForm(eleccion: Eleccion): void {
    this.evaluacionesArray.clear();
    this.candidatas().forEach(candidata => {
      const criteriaGroup: { [key: string]: any } = { candidataId: [candidata.id] };
      const criterios = this.getCriteriosParaCandidata(candidata, eleccion);

      criterios.forEach(c => {
        const nombreClave = this.getNombreCriterio(c);
        criteriaGroup[nombreClave] = [5, [Validators.required, Validators.min(5), Validators.max(10)]];
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

  calculateTotalScore(idx: number): number {
    const group = this.evaluacionesArray.at(idx) as FormGroup;
    if (!group || !this.candidatas()[idx] || !this.selectedEleccion()) return 0;

    const criterios = this.getCriteriosParaCandidata(this.candidatas()[idx], this.selectedEleccion()!);
    const puntosPorPresentarse = 20;

    const puntosCriterios = criterios.reduce((total, criterio) => {
      const nombreClave = this.getNombreCriterio(criterio);
      const valor = Number(group.get(nombreClave)?.value ?? 5);
      return total + valor;
    }, 0);

    return puntosPorPresentarse + puntosCriterios;
  }

  getCriteriosParaCandidata(c: Candidata, e: Eleccion): string[] {
    if (c.categoria === 'Embajador') {
      return e.criteriosMasculinos || e.criterios || ['Actitud', 'Simpatía', 'Pasarela'];
    }
    return e.criteriosFemeninos || e.criterios || ['Elegancia', 'Porte', 'Pasarela'];
  }

  // =========================================================
  // 💾 MOTOR DE PERSISTENCIA DIRECTO (CERO DEPENDENCIA DE RED)
  // =========================================================
  private getDraftStorageKey(cat: string): string {
    const eleccionId = this.selectedEleccion()?.id || 'general';
    return `borrador_gala_${eleccionId}_${cat}`;
  }

  guardarBorradorLocal(): void {
    const cat = this.categoriaSeleccionada();
    const eleccion = this.selectedEleccion();
    if (!cat || !eleccion?.id) return;

    const key = this.getDraftStorageKey(cat);
    localStorage.setItem(key, JSON.stringify(this.evaluacionesArray.value));
  }

  private cargarBorradorLocal(cat: string): void {
    const key = this.getDraftStorageKey(cat);
    const saved = localStorage.getItem(key);
    if (!saved) return;

    try {
      const valores = JSON.parse(saved);
      if (!Array.isArray(valores)) return;

      this.evaluacionesArray.controls.forEach((groupControl) => {
        const group = groupControl as FormGroup;
        const candId = group.get('candidataId')?.value;
        const datosGuardados = valores.find((v: any) => v.candidataId === candId);

        if (datosGuardados) {
          const patchObj: any = {};
          for (const k in datosGuardados) {
            if (k !== 'candidataId') {
              const claveLimpia = this.getNombreCriterio(k);
              if (group.contains(claveLimpia)) {
                patchObj[claveLimpia] = Math.max(5, Math.min(10, Number(datosGuardados[k]) || 5));
              }
            }
          }
          group.patchValue(patchObj);
        }
      });
    } catch (e) {
      console.error('Error al restaurar borrador local:', e);
    }
  }

  private limpiarBorradorLocal(cat: string): void {
    const eleccionId = this.selectedEleccion()?.id;
    if (eleccionId) {
      localStorage.removeItem(this.getDraftStorageKey(cat));
    }
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
    return tandas.includes(`${eleccionId}_Embajadora`) && tandas.includes(`${eleccionId}_Embajador`);
  }

  async onSubmit(): Promise<void> {
    const cat = this.categoriaSeleccionada();
    if (!cat || this.isSubmitting()) return;

    const nombrePlural = cat === 'Embajador' ? 'Embajadores' : 'Embajadoras';
    const res = await this.notificationService.showConfirm(
      `¿Firmar Acta de ${nombrePlural}?`,
      `Esta acción enviará los puntajes oficiales de esta tanda de forma inalterable.`,
      'Confirmar Firma'
    );

    if (res.isConfirmed) {
      this.isSubmitting.set(true);
      try {
        const evaluacionesCompletas = this.evaluacionesArray.value;
        const payloadFiltrado: EvaluacionPayload[] = [];
        const puntosPorPresentarse = 20;

        this.candidatas().forEach((cand, idx) => {
          const esMismo = cat === 'Embajador'
            ? (cand.categoria === 'Embajador' || cand.categoria === 'Paje')
            : (cand.categoria === 'Embajadora' || !cand.categoria);

          if (esMismo) {
            const formValue = evaluacionesCompletas[idx];
            const criterios = this.getCriteriosParaCandidata(cand, this.selectedEleccion()!);
            const porCrit: { [key: string]: number } = {};
            let sumaCriterios = 0;

            criterios.forEach((cr: string) => {
              const nombreClave = this.getNombreCriterio(cr);
              const valor = Number(formValue[nombreClave]) || 5;
              porCrit[nombreClave] = valor;
              sumaCriterios += valor;
            });

            payloadFiltrado.push({
              candidataId: cand.id!,
              puntuacion: puntosPorPresentarse + sumaCriterios,
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
        this.notificationService.showSuccessToast(`Acta de ${nombrePlural} firmada con éxito`);

        this.categoriaSeleccionada.set(null);
        this.isReviewMode.set(false);
        await this.authService.refreshUserProfile();

      } catch (e: any) {
        this.notificationService.showAlertError('Error de Cómputo', e.message);
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  nextImage(candidata: Candidata): void {
    const total = candidata.fotosURL?.length || 0;
    if (total > 1) this.carouselImageIndex.update(i => (i + 1) % total);
  }

  previousImage(candidata: Candidata): void {
    const total = candidata.fotosURL?.length || 0;
    if (total > 1) this.carouselImageIndex.update(i => (i - 1 + total) % total);
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
            const formValues: any = { candidataId: cand.id };
            for (const k in evaluacion.puntuacionPorCriterio) {
              formValues[this.getNombreCriterio(k)] = evaluacion.puntuacionPorCriterio[k];
            }
            this.evaluacionesArray.at(idx)?.patchValue(formValues);
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
