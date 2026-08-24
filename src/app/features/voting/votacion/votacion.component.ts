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
import { DetalleEleccionComponent } from '../detalle-eleccion/detalle-eleccion.component';

@Component({
  selector: 'app-votacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, DetalleEleccionComponent],
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
  carouselImageIndex = signal(0);
  
  // Nuevo: Control de flujo
  categoriaSeleccionada = signal<'Embajadora' | 'Embajador' | null>(null);

  wizardProgress = computed(() => {
    const totalSteps = this.candidatas().length;
    return totalSteps === 0 ? 0 : ((this.currentStep() + 1) / totalSteps) * 100;
  });

  isDetalleMode = signal(false);
  selectedEleccionParaDetalle = signal<Eleccion | null>(null);

  constructor() {
    this.votacionForm = this.fb.group({ evaluaciones: this.fb.array([]) });
  }

  get evaluacionesArray(): FormArray { return this.votacionForm.get('evaluaciones') as FormArray; }

  ngOnInit(): void { this.loadElecciones(); }

  loadElecciones(): void {
    this.isLoading.set(true);
    this.eleccionService.getElecciones().pipe(first()).subscribe({
      next: (elecciones) => {
        this.todasLasElecciones.set(elecciones.sort((a, b) => (b.fechaEvento?.toMillis() || 0) - (a.fechaEvento?.toMillis() || 0)));
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
    this.categoriaSeleccionada.set(null); // Resetear para que elija categoría al entrar
    this.evaluacionesArray.clear();

    this.candidataService.getCandidatasPorEleccion(eleccion.id!).pipe(first()).subscribe(candidatas => {
      this.candidatas.set(candidatas.sort((a, b) => (a.numero || 0) - (b.numero || 0)));
      this.buildCandidatasForm(eleccion);
      this.isVotingLoading.set(false);
    });
  }

  buildCandidatasForm(eleccion: Eleccion): void {
    this.candidatas().forEach(candidata => {
      const criteriaGroup: { [key: string]: any } = { candidataId: [candidata.id] };
      const criterios = this.getCriteriosParaCandidata(candidata, eleccion);
      criterios.forEach(c => {
        criteriaGroup[c] = [0, [Validators.required, Validators.min(0), Validators.max(10)]]; // INICIA EN 0
      });
      this.evaluacionesArray.push(this.fb.group(criteriaGroup));
    });
  }

  getCandidatasFiltradas() {
    return this.candidatas().filter(c => {
      if (this.categoriaSeleccionada() === 'Embajador') return c.categoria === 'Embajador' || c.categoria === 'Paje';
      return c.categoria === 'Embajadora';
    });
  }

  selectCandidate(candidata: Candidata) {
    const idx = this.candidatas().findIndex(c => c.id === candidata.id);
    this.currentStep.set(idx);
    this.carouselImageIndex.set(0);
  }

  updateSliderValue(index: number, controlName: string, event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    const control = this.evaluacionesArray.at(index).get(controlName);
    if (control) control.setValue(val);
  }

  getEvaluacionValue(index: number, controlName: string): number {
    return this.evaluacionesArray.at(index).get(controlName)?.value || 0;
  }

  calculateTotalScore(idx: number): number {
    const group = this.evaluacionesArray.at(idx) as FormGroup;
    const criterios = this.getCriteriosParaCandidata(this.candidatas()[idx], this.selectedEleccion()!);
    return criterios.reduce((acc, c) => acc + (group.get(c)?.value || 0), 0);
  }

  getCriteriosParaCandidata(c: Candidata, e: Eleccion): string[] {
    if (c.categoria === 'Embajador') return e.criteriosMasculinos || ['Actitud', 'Simpatía', 'Pasarela'];
    return e.criteriosFemeninos || ['Elegancia', 'Porte', 'Pasarela'];
  }

  

  openDetalleMode(e: Eleccion) { this.selectedEleccionParaDetalle.set(e); this.isDetalleMode.set(true); }
  closeDetalleMode() { this.isDetalleMode.set(false); }
  handleIniciarVotacion(e: Eleccion) { this.closeDetalleMode(); setTimeout(() => this.openVotingMode(e), 200); }
  closeVotingMode() {
  // Solo limpiar si el usuario realmente confirma salir o al terminar de votar
  // Para los botones "Volver", simplemente cambiamos los signals sin resetear el form.
  this.isVotingMode.set(false);
  this.isReviewMode.set(false);
  this.categoriaSeleccionada.set(null); 
  // No limpies el form aquí si quieres que al entrar de nuevo esté lo mismo (opcional)
  // this.evaluacionesArray.clear(); 
  this.loadElecciones();
}
  enterReviewMode() { this.isReviewMode.set(true); }
  openResultadosMode(e: Eleccion) { if (e.id) this.router.navigate(['/dashboard/resultados', e.id]); }
  haVotado(eleccionId: string): boolean {
  // Solo devolvemos TRUE si queremos que el botón "Ingresar a Votar" desaparezca.
  // Pero como queremos votar por separado, podrías dejar que entre SIEMPRE
  // mientras la elección esté activa.
  const user = this.authService.currentUser();
  if (!user || !user.eleccionesVotadas) return false;
  
  // OPCIONAL: Si quieres que el botón desaparezca solo después de que vote TODO, 
  // tendrías que comparar si la cantidad de evaluaciones en el doc de votos 
  // es igual a la cantidad total de candidatos. 
  // Por ahora, para que funcione, podrías simplemente retornar false si quieres seguir probando.
  return user.eleccionesVotadas.includes(eleccionId); 
}
  // Modificamos el método onSubmit en votacion.component.ts
async onSubmit(): Promise<void> {
  const cat = this.categoriaSeleccionada(); // 'Embajador' o 'Embajadora'
  
  if (!cat) return;

  const res = await this.notificationService.showConfirm(
    `¿Enviar Votos de ${cat}s?`,
    `Esta acción registrará oficialmente los puntajes de esta tanda. No podrás modificarlos luego.`,
    'Sí, Enviar Tanda'
  );

  if (res.isConfirmed) {
    try {
      // 1. Filtramos las evaluaciones: solo las que pertenecen a la categoría actual
      const evaluacionesCompletas = this.evaluacionesArray.value;
      const payloadFiltrado: EvaluacionPayload[] = [];

      this.candidatas().forEach((cand, index) => {
        // Verificamos si la candidata pertenece a la tanda actual
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
        this.notificationService.showAlertWarning('Atención', 'No hay votos para enviar en esta tanda.');
        return;
      }

      // 2. Enviamos solo los votos de esta tanda
      await this.votacionService.submitVoto(
        this.selectedEleccion()!.id!, 
        this.authService.currentUser()!.uid, 
        payloadFiltrado
      );

      this.notificationService.showSuccessToast(`Votos de ${cat}s registrados con éxito`);

      // 3. Después de enviar una tanda, volvemos a la selección de tanda
      this.isReviewMode.set(false);
      this.categoriaSeleccionada.set(null); 
      
      // Opcional: Refrescar para ver si ya votó todo
      await this.authService.refreshUserProfile();

    } catch (err) {
      console.error(err);
      this.notificationService.showAlertError('Error', 'No se pudieron registrar los votos de esta tanda.');
    }
  }
}
}