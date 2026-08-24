import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';

import { EleccionService } from '../../admin/gestion-elecciones/eleccion.service';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { EvaluacionPayload, VotacionService } from '../votacion.service';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DetalleEleccionComponent } from '../detalle-eleccion/detalle-eleccion.component';

@Component({
  selector: 'app-votacion',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, DatePipe, MatIconModule, MatButtonModule,
    MatTooltipModule, MatSliderModule, MatProgressSpinnerModule,
    MatProgressBarModule, DetalleEleccionComponent
  ],
  templateUrl: './votacion.component.html',
  styleUrls: ['./votacion.component.scss']
})
export class VotacionComponent implements OnInit {
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
  public cameFromReview = false;
  wizardProgress = computed(() => {
    const totalSteps = this.candidatas().length;
    if (totalSteps === 0) return 0;
    return ((this.currentStep() + 1) / totalSteps) * 100;
  });

  isDetalleMode = signal(false);
  selectedEleccionParaDetalle = signal<Eleccion | null>(null);

  carouselImageIndex = signal(0);

  constructor() {
    this.votacionForm = this.fb.group({
      evaluaciones: this.fb.array([])
    });
  }

  get evaluacionesArray(): FormArray { return this.votacionForm.get('evaluaciones') as FormArray; }

  ngOnInit(): void { this.loadElecciones(); }

  loadElecciones(): void {
    this.isLoading.set(true);
    this.eleccionService.getElecciones().pipe(first()).subscribe(elecciones => {
      // this.todasLasElecciones.set(elecciones.sort((a, b) => b.fechaInicio.toMillis() - a.fechaInicio.toMillis()));
      this.isLoading.set(false);
    });
  }

  openDetalleMode(eleccion: Eleccion): void { this.selectedEleccionParaDetalle.set(eleccion); this.isDetalleMode.set(true); }
  closeDetalleMode(): void { this.isDetalleMode.set(false); }
  handleIniciarVotacion(eleccion: Eleccion): void {
    this.closeDetalleMode();
    setTimeout(() => this.openVotingMode(eleccion), 150);
  }

  openResultadosMode(eleccion: Eleccion): void {
    if (eleccion.id) {
      this.router.navigate(['/dashboard/resultados', eleccion.id]);
    }
  }

  openVotingMode(eleccion: Eleccion): void {
    if ((eleccion.criterios || []).length === 0) {
      this.notificationService.showAlertWarning('No Configurada', 'Esta elección aún no tiene criterios de evaluación definidos.');
      return;
    }
    this.selectedEleccion.set(eleccion);
    this.isVotingMode.set(true);
    this.isVotingLoading.set(true);
    this.currentStep.set(0);
    this.evaluacionesArray.clear();
    this.candidataService.getCandidatasPorEleccion(eleccion.id!).pipe(first()).subscribe(candidatas => {
      if (candidatas.length === 0) {
        this.notificationService.showAlertWarning('Sin Candidatas', 'No hay candidatas inscritas para votar en esta elección.');
        this.isVotingMode.set(false);
        this.isVotingLoading.set(false);
        return;
      }
      this.candidatas.set(candidatas);
      this.buildCandidatasForm(eleccion);
      this.isVotingLoading.set(false);
    });
  }

  buildCandidatasForm(eleccion: Eleccion): void {
    this.candidatas().forEach(candidata => {
      const criteriaGroup: { [key: string]: any } = { candidataId: [candidata.id] };
      (eleccion.criterios || []).forEach(criterio => { criteriaGroup[criterio] = [1, Validators.required]; });
      this.evaluacionesArray.push(this.fb.group(criteriaGroup));
    });
  }

  nextStep(): void {
    if (this.cameFromReview) { this.enterReviewMode(); return; }
    if (this.currentStep() < this.candidatas().length - 1) {
      this.currentStep.update(i => i + 1);
      this.carouselImageIndex.set(0);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(i => i - 1);
      this.carouselImageIndex.set(0);
    }
  }

  goToStep(index: number): void {
    this.currentStep.set(index);
    this.isReviewMode.set(false);
    this.cameFromReview = true;
    this.carouselImageIndex.set(0);
  }


  nextImage(): void {
    const currentCandidata = this.candidatas()[this.currentStep()];
    const totalImages = currentCandidata.fotosURL?.length || 0;
    if (this.carouselImageIndex() < totalImages - 1) {
      this.carouselImageIndex.update(i => i + 1);
    }
  }

  previousImage(): void {
    if (this.carouselImageIndex() > 0) {
      this.carouselImageIndex.update(i => i - 1);
    }
  }
  enterReviewMode(): void {
    this.isReviewMode.set(true);
    this.cameFromReview = false;
  }

  closeVotingMode(): void {
    this.isVotingMode.set(false);
    this.isReviewMode.set(false);
    this.cameFromReview = false;
    this.selectedEleccion.set(null);
    this.candidatas.set([]);
    this.authService.refreshUserProfile();
    this.loadElecciones();
  }

  getEvaluacionGroup(index: number, controlName: string): AbstractControl | null {
    const formArray = this.votacionForm.get('evaluaciones') as FormArray;
    return (formArray && formArray.at(index)) ? formArray.at(index).get(controlName) : null;
  }

  updateSliderValue(index: number, controlName: string, newValue: number | null): void {
    if (newValue === null) return;
    const control = this.getEvaluacionGroup(index, controlName);
    if (control && control.value !== newValue) { control.setValue(newValue); }
  }

  calculateTotalScore(candidateIndex: number): number {
    const candidateGroup = this.evaluacionesArray.at(candidateIndex) as FormGroup;
    if (!candidateGroup) return 0;
    const criterios = this.selectedEleccion()?.criterios || [];
    let totalScore = 0;
    for (const criterio of criterios) { totalScore += candidateGroup.get(criterio)?.value || 0; }
    return totalScore;
  }

  async onSubmit(): Promise<void> {
    if (this.votacionForm.invalid) return;
    const result = await this.notificationService.showConfirm('¿Confirmar Voto?', 'Una vez enviado, tu voto no podrá ser modificado.', 'Sí, Enviar Mi Voto');
    if (result.isConfirmed) {
      const eleccionActual = this.selectedEleccion()!;
      const evaluacionesPayload: EvaluacionPayload[] = this.evaluacionesArray.value.map((evaluacion: any) => {
        let puntuacionTotal = 0;
        const puntuacionPorCriterio: { [key: string]: number } = {};
        (eleccionActual.criterios || []).forEach(criterio => {
          const valor = evaluacion[criterio] || 0;
          puntuacionTotal += valor;
          puntuacionPorCriterio[criterio] = valor;
        });
        return {
          candidataId: evaluacion.candidataId,
          puntuacion: puntuacionTotal,
          puntuacionPorCriterio: puntuacionPorCriterio
        };
      });

      try {
        await this.votacionService.submitVoto(eleccionActual.id!, this.authService.currentUser()!.uid, evaluacionesPayload);
        this.notificationService.showSuccessToast('¡Gracias por tu voto!');
        this.closeVotingMode();
      } catch (error: any) { this.notificationService.showAlertError('Error al Votar', error.message || 'No se pudo registrar tu voto.'); }
    }
  }

  haVotado(eleccionId: string): boolean { return this.authService.currentUser()?.eleccionesVotadas?.includes(eleccionId) ?? false; }
}
