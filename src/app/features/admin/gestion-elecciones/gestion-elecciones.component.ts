import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';

import { EleccionService } from './eleccion.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Eleccion, EstadoEleccion } from '../../../core/models/eleccion.model';
import { GestionCandidatasComponent } from '../gestion-candidatas/gestion-candidatas.component';

@Component({
  selector: 'app-gestion-elecciones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    GestionCandidatasComponent
  ],
  templateUrl: './gestion-elecciones.component.html',
  styleUrls: ['./gestion-elecciones.component.scss']
})
export class GestionEleccionesComponent implements OnInit {
  private eleccionService = inject(EleccionService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Signals de estado
  elecciones = signal<Eleccion[]>([]);
  isModalOpen = signal(false);
  isCandidatasModalOpen = signal(false);
  selectedEleccion = signal<Eleccion | null>(null);
  isEditing = signal(false);
  editingEleccionId = signal<string | null>(null);

  eleccionForm: FormGroup;

  constructor() {
    this.eleccionForm = this.fb.group({
      nombre: ['', Validators.required],
      fechaEvento: ['', Validators.required],
      puestosFemeninos: this.fb.array([]),
      puestosMasculinos: this.fb.array([]),
      criteriosFemeninos: this.fb.array([]),
      criteriosMasculinos: this.fb.array([]),
      camposCandidata: this.fb.array([]),
      nuevoPuestoFemenino: [''],
      nuevoPuestoMasculino: [''],
      nuevoCriterioFemenino: [''],
      nuevoCriterioMasculino: [''],
      nuevoCampoCandidata: ['']
    });
  }

  ngOnInit(): void {
    this.cargarElecciones();
  }

  cargarElecciones(): void {
    this.eleccionService.getElecciones().subscribe(data => {
      this.elecciones.set(data.sort((a, b) => {
        const fechaA = a.fechaEvento || a.fechaInicio;
        const fechaB = b.fechaEvento || b.fechaInicio;
        return (fechaB?.toMillis() || 0) - (fechaA?.toMillis() || 0);
      }));
    });
  }

  // Getters para los FormArrays
  get puestosFemeninosArray(): FormArray { return this.eleccionForm.get('puestosFemeninos') as FormArray; }
  get puestosMasculinosArray(): FormArray { return this.eleccionForm.get('puestosMasculinos') as FormArray; }
  get criteriosFemeninosArray(): FormArray { return this.eleccionForm.get('criteriosFemeninos') as FormArray; }
  get criteriosMasculinosArray(): FormArray { return this.eleccionForm.get('criteriosMasculinos') as FormArray; }
  get camposCandidataArray(): FormArray { return this.eleccionForm.get('camposCandidata') as FormArray; }

  // Métodos para Puestos Femeninos
  addPuestoFemenino(): void {
    const control = this.eleccionForm.get('nuevoPuestoFemenino');
    const val = control?.value?.trim();
    if (val) {
      this.puestosFemeninosArray.push(this.fb.control(val));
      control?.reset();
    }
  }
  removePuestoFemenino(index: number): void { this.puestosFemeninosArray.removeAt(index); }

  // Métodos para Puestos Masculinos
  addPuestoMasculino(): void {
    const control = this.eleccionForm.get('nuevoPuestoMasculino');
    const val = control?.value?.trim();
    if (val) {
      this.puestosMasculinosArray.push(this.fb.control(val));
      control?.reset();
    }
  }
  removePuestoMasculino(index: number): void { this.puestosMasculinosArray.removeAt(index); }

  // Métodos para Criterios Femeninos
  addCriterioFemenino(): void {
    const control = this.eleccionForm.get('nuevoCriterioFemenino');
    const val = control?.value?.trim();
    if (val) {
      this.criteriosFemeninosArray.push(this.fb.control(val));
      control?.reset();
    }
  }
  removeCriterioFemenino(index: number): void { this.criteriosFemeninosArray.removeAt(index); }

  // Métodos para Criterios Masculinos
  addCriterioMasculino(): void {
    const control = this.eleccionForm.get('nuevoCriterioMasculino');
    const val = control?.value?.trim();
    if (val) {
      this.criteriosMasculinosArray.push(this.fb.control(val));
      control?.reset();
    }
  }
  removeCriterioMasculino(index: number): void { this.criteriosMasculinosArray.removeAt(index); }

  // Métodos para Campos de Perfil
  addCampoCandidata(): void {
    const control = this.eleccionForm.get('nuevoCampoCandidata');
    const val = control?.value?.trim();
    if (val) {
      this.camposCandidataArray.push(this.fb.control(val));
      control?.reset();
    }
  }
  removeCampoCandidata(index: number): void { this.camposCandidataArray.removeAt(index); }

  // Abrir Modal de Creación con pre-cargas individuales oficiales
  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingEleccionId.set(null);
    this.eleccionForm.reset();

    this.puestosFemeninosArray.clear();
    this.puestosMasculinosArray.clear();
    this.criteriosFemeninosArray.clear();
    this.criteriosMasculinosArray.clear();
    this.camposCandidataArray.clear();

    // 1. Títulos Femeninos pre-cargados
    ['Embajadora', '1ra Princesa', '2da Princesa', '1ra Dama de Honor', '2da Dama de Honor', 'Miss Elegancia', 'Miss Simpatía']
      .forEach(p => this.puestosFemeninosArray.push(this.fb.control(p)));

    // 2. Títulos Masculinos pre-cargados
    ['Embajador', '1er Paje', '2do Paje', 'Paje Elegancia', 'Paje Simpatía']
      .forEach(p => this.puestosMasculinosArray.push(this.fb.control(p)));

    // 3. Criterios Femeninos individuales
    ['Elegancia', 'Porte', 'Simpatía', 'Pasarela']
      .forEach(c => this.criteriosFemeninosArray.push(this.fb.control(c)));

    // 4. Criterios Masculinos individuales
    ['Actitud', 'Desenvolvimiento', 'Simpatía', 'Pasarela']
      .forEach(c => this.criteriosMasculinosArray.push(this.fb.control(c)));

    // 5. Preguntas del Perfil
    ['Hobbies', 'Mensaje a la Juventud']
      .forEach(cc => this.camposCandidataArray.push(this.fb.control(cc)));

    this.isModalOpen.set(true);
  }

  // Abrir Modal de Edición
  openEditModal(eleccion: Eleccion): void {
    this.isEditing.set(true);
    this.editingEleccionId.set(eleccion.id!);

    const datePipe = new DatePipe('en-US');
    const fechaRef = eleccion.fechaEvento || eleccion.fechaInicio;
    const fecha = datePipe.transform(fechaRef.toDate(), 'yyyy-MM-dd', 'UTC');

    this.puestosFemeninosArray.clear();
    this.puestosMasculinosArray.clear();
    this.criteriosFemeninosArray.clear();
    this.criteriosMasculinosArray.clear();
    this.camposCandidataArray.clear();

    const fem = eleccion.puestosFemeninos || eleccion.puestos || ['Embajadora', '1ra Princesa', '2da Princesa'];
    fem.forEach(p => this.puestosFemeninosArray.push(this.fb.control(p)));

    const masc = eleccion.puestosMasculinos || ['Embajador', '1er Paje'];
    masc.forEach(p => this.puestosMasculinosArray.push(this.fb.control(p)));

    const critFem = eleccion.criteriosFemeninos || eleccion.criterios || ['Elegancia', 'Simpatía', 'Pasarela'];
    critFem.forEach(c => this.criteriosFemeninosArray.push(this.fb.control(c)));

    const critMasc = eleccion.criteriosMasculinos || eleccion.criterios || ['Actitud', 'Simpatía', 'Pasarela'];
    critMasc.forEach(c => this.criteriosMasculinosArray.push(this.fb.control(c)));

    (eleccion.camposCandidata || ['Hobbies', 'Mensaje a la Juventud']).forEach(cc => this.camposCandidataArray.push(this.fb.control(cc)));

    this.eleccionForm.patchValue({
      nombre: eleccion.nombre,
      fechaEvento: fecha
    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async onSubmit(): Promise<void> {
    if (this.eleccionForm.invalid) {
      this.notificationService.showAlertWarning('Formulario Incompleto', 'Por favor ingresá el nombre y la fecha del evento.');
      return;
    }

    const formValue = this.eleccionForm.value;
    const fecha = new Date(formValue.fechaEvento.replace(/-/g, '/'));
    const timestampFecha = Timestamp.fromDate(fecha);

    const eleccionData: Omit<Eleccion, 'id'> = {
      nombre: formValue.nombre,
      fechaEvento: timestampFecha,
      estado: 'Configuracion' as EstadoEleccion,
      puestosFemeninos: formValue.puestosFemeninos || [],
      puestosMasculinos: formValue.puestosMasculinos || [],
      criteriosFemeninos: formValue.criteriosFemeninos || [],
      criteriosMasculinos: formValue.criteriosMasculinos || [],
      camposCandidata: formValue.camposCandidata || [],
      // Campos de compatibilidad
      fechaInicio: timestampFecha,
      fechaFin: timestampFecha,
      puestos: formValue.puestosFemeninos || [],
      criterios: formValue.criteriosFemeninos || []
    };

    try {
      if (this.isEditing() && this.editingEleccionId()) {
        await this.eleccionService.updateEleccion(this.editingEleccionId()!, eleccionData);
        this.notificationService.showSuccessToast('Evento actualizado');
      } else {
        await this.eleccionService.createEleccion(eleccionData);
        this.notificationService.showSuccessToast('Evento creado con éxito');
      }
      this.closeModal();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar la información.');
    }
  }

  openCandidatasModal(eleccion: Eleccion): void {
    this.selectedEleccion.set(eleccion);
    this.isCandidatasModalOpen.set(true);
  }

  closeCandidatasModal(): void {
    this.isCandidatasModalOpen.set(false);
  }

  openResultados(eleccion: Eleccion): void {
    if (eleccion.id) {
      this.router.navigate(['/dashboard/resultados', eleccion.id]);
    }
  }

  async iniciarVotacion(eleccion: Eleccion): Promise<void> {
    const result = await this.notificationService.showConfirm(
      '¿Abrir Votación en Vivo?',
      `Los jurados ya podrán empezar a calificar a los participantes de "${eleccion.nombre}".`,
      'Sí, Abrir Votación'
    );
    if (result.isConfirmed) {
      await this.eleccionService.startEleccion(eleccion.id!);
      this.notificationService.showSuccessToast('Votación habilitada en vivo.');
    }
  }

  async finalizarVotacion(eleccion: Eleccion): Promise<void> {
    const result = await this.notificationService.showConfirm(
      '¿Cerrar Votación?',
      `Se cerrará la recepción de votos de los jurados para "${eleccion.nombre}".`,
      'Sí, Cerrar Votación'
    );
    if (result.isConfirmed) {
      await this.eleccionService.finishEleccion(eleccion.id!);
      this.notificationService.showSuccessToast('Votación finalizada.');
    }
  }

  async publishEleccion(eleccion: Eleccion): Promise<void> {
    if (!eleccion.id) return;
    const result = await this.notificationService.showConfirm(
      '¿Proclamar Resultados Oficiales?',
      `Los resultados de "${eleccion.nombre}" se mostrarán en la pantalla del escenario.`,
      'Sí, Proclamar'
    );
    if (result.isConfirmed) {
      try {
        await this.eleccionService.publishEleccion(eleccion.id);
        this.notificationService.showSuccessToast('Resultados proclamados en escenario.');
      } catch (error) {
        this.notificationService.showAlertError('Error', 'No se pudieron publicar los resultados.');
      }
    }
  }
}
