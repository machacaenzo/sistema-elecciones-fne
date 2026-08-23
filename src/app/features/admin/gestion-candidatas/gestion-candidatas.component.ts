import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';

import { CandidataService } from '../gestion-elecciones/candidata.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-gestion-candidatas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './gestion-candidatas.component.html',
  styleUrls: ['./gestion-candidatas.component.scss']
})
export class GestionCandidatasComponent implements OnInit {
  @Input({ required: true }) eleccion!: Eleccion;
  @Output() closeModal = new EventEmitter<void>();

  private candidataService = inject(CandidataService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);

  dataSource = new MatTableDataSource<Candidata>();
  displayedColumns: string[] = ['foto', 'nombreCompleto', 'dni', 'acciones'];

  candidataForm: FormGroup;
  isFormVisible = signal(false);
  isEditing = signal(false);
  editingCandidataId = signal<string | null>(null);


  imagePreviews = signal<string[]>([]);

  constructor() {
    this.candidataForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      dni: ['', Validators.required],
      fotosURL: this.fb.array([]),
      nuevasImagenes: this.fb.array([]),
      camposPersonalizados: this.fb.group({})
    });
  }

  ngOnInit(): void {
    if (!this.eleccion || !this.eleccion.id) {
      this.notificationService.showAlertError('Error', 'No se ha especificado una elección para gestionar.');
      this.closeModal.emit();
      return;
    }

    this.buildDynamicFormFields();

    this.candidataService.getCandidatasPorEleccion(this.eleccion.id).subscribe({
      next: (candidatasData) => {
        this.dataSource.data = candidatasData;
      },
      error: (err) => {
        console.error('Error al cargar las candidatas:', err);
        this.notificationService.showAlertError('Error de Carga', 'No se pudieron cargar las candidatas.');
      }
    });
  }
  get camposPersonalizadosGroup(): FormGroup {
    return this.candidataForm.get('camposPersonalizados') as FormGroup;
  }

  buildDynamicFormFields(): void {
    const camposGroup = this.camposPersonalizadosGroup;
    Object.keys(camposGroup.controls).forEach(key => {
      camposGroup.removeControl(key);
    });
    this.eleccion.camposCandidata?.forEach(campo => {
      camposGroup.addControl(campo, this.fb.control('', Validators.required));
    });
  }

  openCreateForm(): void {
    this.isEditing.set(false);
    this.editingCandidataId.set(null);
    this.candidataForm.reset();
    this.buildDynamicFormFields();
    (this.candidataForm.get('fotosURL') as FormArray).clear();
    (this.candidataForm.get('nuevasImagenes') as FormArray).clear();
    this.imagePreviews.set([]);
    this.isFormVisible.set(true);
  }

  openEditForm(candidata: Candidata): void {
    this.isEditing.set(true);
    this.editingCandidataId.set(candidata.id!);
    this.candidataForm.reset();
    this.buildDynamicFormFields();
    (this.candidataForm.get('fotosURL') as FormArray).clear();
    (this.candidataForm.get('nuevasImagenes') as FormArray).clear();

    this.candidataForm.patchValue({
      nombre: candidata.nombre,
      apellido: candidata.apellido,
      dni: candidata.dni,
      camposPersonalizados: candidata.camposPersonalizados || {}
    });

    const fotosUrlArray = this.candidataForm.get('fotosURL') as FormArray;
    (candidata.fotosURL || []).forEach(url => fotosUrlArray.push(this.fb.control(url)));

    this.imagePreviews.set([...(candidata.fotosURL || [])]);
    this.isFormVisible.set(true);
  }

  hideForm(): void {
    this.isFormVisible.set(false);
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (const file of files) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          this.imagePreviews.update(current => [...current, result]);
          (this.candidataForm.get('nuevasImagenes') as FormArray).push(this.fb.control(result));
        };
      }
    }
  }

  removeImage(index: number): void {
    const previews = [...this.imagePreviews()];
    const removedPreview = previews.splice(index, 1)[0];
    this.imagePreviews.set(previews);

    const nuevasImagenesArray = this.candidataForm.get('nuevasImagenes') as FormArray;
    let foundInNew = false;
    for (let i = 0; i < nuevasImagenesArray.length; i++) {
      if (nuevasImagenesArray.at(i).value === removedPreview) {
        nuevasImagenesArray.removeAt(i);
        foundInNew = true;
        break;
      }
    }

    if (!foundInNew) {
      const fotosUrlArray = this.candidataForm.get('fotosURL') as FormArray;
      for (let i = 0; i < fotosUrlArray.length; i++) {
        if (fotosUrlArray.at(i).value === removedPreview) {
          fotosUrlArray.removeAt(i);
          break;
        }
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.candidataForm.invalid) return;

    const formValue = this.candidataForm.value;
    const finalFotosURL = [...formValue.fotosURL, ...formValue.nuevasImagenes];

    const puntuacionPorCriterio: { [key: string]: number } = {};
    this.eleccion.criterios?.forEach(criterio => {
      puntuacionPorCriterio[criterio] = 0;
    });

    const data: Omit<Candidata, 'id'> = {
      eleccionId: this.eleccion.id!,
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      dni: formValue.dni,
      fotosURL: finalFotosURL,
      camposPersonalizados: formValue.camposPersonalizados,
      puntuacionPorCriterio: this.isEditing() ? this.dataSource.data.find(c => c.id === this.editingCandidataId())!.puntuacionPorCriterio : puntuacionPorCriterio,
      puntuacionTotal: this.isEditing() ? this.dataSource.data.find(c => c.id === this.editingCandidataId())!.puntuacionTotal : 0,
      cantidadDeVotos: this.isEditing() ? this.dataSource.data.find(c => c.id === this.editingCandidataId())!.cantidadDeVotos : 0,
    };

    try {
      if (this.isEditing() && this.editingCandidataId()) {
        await this.candidataService.updateCandidata(this.editingCandidataId()!, data);
        this.notificationService.showSuccessToast('Candidata actualizada');
      } else {
        await this.candidataService.createCandidata(data);
        this.notificationService.showSuccessToast('Candidata inscrita');
      }
      this.hideForm();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar la candidata.');
    }
  }

  async confirmDelete(candidata: Candidata): Promise<void> {
    if (candidata.cantidadDeVotos > 0) {
      this.notificationService.showAlertError('Acción no permitida', 'No se puede eliminar una candidata que ya ha recibido votos.');
      return;
    }

    const result = await this.notificationService.showConfirm(
      '¿Eliminar Candidata?',
      `Se eliminará a ${candidata.nombre} ${candidata.apellido} de la elección.`,
      'Sí, eliminar'
    );
    if (result.isConfirmed) {
      await this.candidataService.deleteCandidata(candidata.id!);
      this.notificationService.showSuccessToast('Candidata eliminada');
    }
  }
}
