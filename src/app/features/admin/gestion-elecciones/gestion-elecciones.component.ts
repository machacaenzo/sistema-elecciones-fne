import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

import { EleccionService } from './eleccion.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Eleccion, EstadoEleccion } from '../../../core/models/eleccion.model';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GestionCandidatasComponent } from '../gestion-candidatas/gestion-candidatas.component';
import { ResultadosEleccionComponent } from '../../voting/resultados-eleccion/resultados-eleccion.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gestion-elecciones',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, DatePipe, MatTableModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatTooltipModule, GestionCandidatasComponent
  ],
  templateUrl: './gestion-elecciones.component.html',
  styleUrls: ['./gestion-elecciones.component.scss']
})
export class GestionEleccionesComponent implements OnInit {
  private eleccionService = inject(EleccionService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  isCandidatasModalOpen = signal(false);
  selectedEleccion = signal<Eleccion | null>(null);
  dataSource = new MatTableDataSource<Eleccion>();
  displayedColumns: string[] = ['nombre', 'fechaInicio', 'fechaFin', 'estado', 'acciones'];
  eleccionForm: FormGroup;
  isModalOpen = signal(false);
  isEditing = signal(false);
  editingEleccionId = signal<string | null>(null);


  constructor() {
    this.eleccionForm = this.fb.group({
      nombre: ['', Validators.required],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      puestos: this.fb.array([]),
      criterios: this.fb.array([]),
      camposCandidata: this.fb.array([]),
      nuevoPuesto: [''],
      nuevoCriterio: [''],
      nuevoCampoCandidata: ['']
    });
  }

  ngOnInit(): void {
    this.eleccionService.getElecciones().subscribe(elecciones => {
      this.dataSource.data = elecciones.sort((a, b) => b.fechaInicio.toMillis() - a.fechaInicio.toMillis());
    });
  }

  get puestosArray(): FormArray { return this.eleccionForm.get('puestos') as FormArray; }
  get criteriosArray(): FormArray { return this.eleccionForm.get('criterios') as FormArray; }
  get camposCandidataArray(): FormArray { return this.eleccionForm.get('camposCandidata') as FormArray; }

  addPuesto(): void {
    const control = this.eleccionForm.get('nuevoPuesto');
    if (control) { const value = control.value?.trim(); if (value) { this.puestosArray.push(this.fb.control(value)); control.reset(); } }
  }
  removePuesto(index: number): void { this.puestosArray.removeAt(index); }

  addCriterio(): void {
    const control = this.eleccionForm.get('nuevoCriterio');
    if (control) { const value = control.value?.trim(); if (value) { this.criteriosArray.push(this.fb.control(value)); control.reset(); } }
  }
  removeCriterio(index: number): void { this.criteriosArray.removeAt(index); }

  addCampoCandidata(): void {
    const control = this.eleccionForm.get('nuevoCampoCandidata');
    if (control) { const value = control.value?.trim(); if (value) { this.camposCandidataArray.push(this.fb.control(value)); control.reset(); } }
  }
  removeCampoCandidata(index: number): void { this.camposCandidataArray.removeAt(index); }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingEleccionId.set(null);
    this.eleccionForm.reset();
    this.puestosArray.clear();
    this.criteriosArray.clear();
    this.camposCandidataArray.clear();
    this.eleccionForm.patchValue({ nuevoPuesto: '', nuevoCriterio: '', nuevoCampoCandidata: '' });
    this.isModalOpen.set(true);
  }

  openEditModal(eleccion: Eleccion): void {
    this.isEditing.set(true);
    this.editingEleccionId.set(eleccion.id!);
    const datePipe = new DatePipe('en-US');
    const fechaInicio = datePipe.transform(eleccion.fechaInicio.toDate(), 'yyyy-MM-dd', 'UTC');
    const fechaFin = datePipe.transform(eleccion.fechaFin.toDate(), 'yyyy-MM-dd', 'UTC');
    this.puestosArray.clear();
    this.criteriosArray.clear();
    this.camposCandidataArray.clear();
    (eleccion.puestos || []).forEach(p => this.puestosArray.push(this.fb.control(p)));
    (eleccion.criterios || []).forEach(c => this.criteriosArray.push(this.fb.control(c)));
    (eleccion.camposCandidata || []).forEach(cc => this.camposCandidataArray.push(this.fb.control(cc)));
    this.eleccionForm.patchValue({ nombre: eleccion.nombre, fechaInicio: fechaInicio, fechaFin: fechaFin });
    this.isModalOpen.set(true);
  }

  closeModal(): void { this.isModalOpen.set(false); }

  async onSubmit(): Promise<void> {
    if (this.eleccionForm.invalid) return;
    const formValue = this.eleccionForm.value;
    const fechaInicio = new Date(formValue.fechaInicio.replace(/-/g, '/'));
    const fechaFin = new Date(formValue.fechaFin.replace(/-/g, '/'));

    const eleccionData = {
      nombre: formValue.nombre,
      fechaInicio: Timestamp.fromDate(fechaInicio),
      fechaFin: Timestamp.fromDate(fechaFin),
      puestos: formValue.puestos || [],
      criterios: formValue.criterios || [],
      camposCandidata: formValue.camposCandidata || [],
    };
    try {
      if (this.isEditing() && this.editingEleccionId()) {
        await this.eleccionService.updateEleccion(this.editingEleccionId()!, eleccionData);
        this.notificationService.showSuccessToast('Elección actualizada');
      } else {
        const dataToCreate = { ...eleccionData, estado: 'Configuracion' as EstadoEleccion };
        await this.eleccionService.createEleccion(dataToCreate);
        this.notificationService.showSuccessToast('Elección creada');
      }
      this.closeModal();
    } catch (error) { this.notificationService.showAlertError('Error', 'No se pudo guardar la elección.'); }
  }

  openCandidatasModal(eleccion: Eleccion): void { this.selectedEleccion.set(eleccion); this.isCandidatasModalOpen.set(true); }
  closeCandidatasModal(): void { this.isCandidatasModalOpen.set(false); }

 openResultados(eleccion: Eleccion): void {
    if (eleccion.id) {
      this.router.navigate(['/dashboard/resultados', eleccion.id]);
    }
  }

  async iniciarVotacion(eleccion: Eleccion): Promise<void> {
    const result = await this.notificationService.showConfirm('¿Iniciar Votación?', `La elección "${eleccion.nombre}" se activará.`, 'Sí, iniciar');
    if (result.isConfirmed) { await this.eleccionService.startEleccion(eleccion.id!); this.notificationService.showSuccessToast('La votación ha comenzado.'); }
  }
  async finalizarVotacion(eleccion: Eleccion): Promise<void> {
    const result = await this.notificationService.showConfirm('¿Finalizar Votación?', `La elección "${eleccion.nombre}" se cerrará.`, 'Sí, finalizar');
    if (result.isConfirmed) { await this.eleccionService.finishEleccion(eleccion.id!); this.notificationService.showSuccessToast('La votación ha finalizado.'); }
  }
   async publishEleccion(eleccion: Eleccion): Promise<void> {
    if (!eleccion.id) return;

    const result = await this.notificationService.showConfirm(
      '¿Publicar Resultados?',
      `Los resultados de "${eleccion.nombre}" serán visibles para todos. Esta acción no se puede deshacer.`,
      'Sí, publicar'
    );
    if (result.isConfirmed) {
      try {
        await this.eleccionService.publishEleccion(eleccion.id);
        this.notificationService.showSuccessToast('Resultados publicados correctamente.');
      } catch (error) {
        this.notificationService.showAlertError('Error', 'No se pudieron publicar los resultados.');
      }
    }
  }
}
