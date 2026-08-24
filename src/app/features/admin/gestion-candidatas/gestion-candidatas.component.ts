import { Component, EventEmitter, inject, Input, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';

import { CandidataService } from '../gestion-elecciones/candidata.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata, CategoriaParticipante } from '../../../core/models/candidata.model';

@Component({
  selector: 'app-gestion-candidatas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestion-candidatas.component.html',
  styleUrls: ['./gestion-candidatas.component.scss']
})
export class GestionCandidatasComponent implements OnInit {
  @Input({ required: true }) eleccion!: Eleccion;
  @Output() closeModal = new EventEmitter<void>();

  private candidataService = inject(CandidataService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);

  // Signals de estado
  participantes = signal<Candidata[]>([]);
  categoriaFiltro = signal<'Todas' | CategoriaParticipante>('Todas');

  isFormVisible = signal(false);
  isEditing = signal(false);
  editingCandidataId = signal<string | null>(null);
  imagePreviews = signal<string[]>([]);

  candidataForm: FormGroup;

  // Lista filtrada por categoría y siempre ordenada por número de pasada (1, 2, 3...)
  participantesFiltrados = computed(() => {
    let lista = [...this.participantes()];
    if (this.categoriaFiltro() !== 'Todas') {
      lista = lista.filter(p => p.categoria === this.categoriaFiltro());
    }
    return lista.sort((a, b) => (a.numero || 0) - (b.numero || 0));
  });

  constructor() {
    this.candidataForm = this.fb.group({
      numero: [1, [Validators.required, Validators.min(1)]],
      categoria: ['Embajadora' as CategoriaParticipante, Validators.required],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      dni: ['', Validators.required],
      cursoDivision: ['', Validators.required],
      fotosURL: this.fb.array([]),
      nuevasImagenes: this.fb.array([]),
      camposPersonalizados: this.fb.group({})
    });
  }

  ngOnInit(): void {
    if (!this.eleccion?.id) {
      this.notificationService.showAlertError('Error', 'No se especificó la elección a gestionar.');
      this.closeModal.emit();
      return;
    }
    this.cargarParticipantes();
  }

  cargarParticipantes(): void {
    this.candidataService.getCandidatasPorEleccion(this.eleccion.id!).subscribe({
      next: (data) => this.participantes.set(data),
      error: () => this.notificationService.showAlertError('Error', 'No se pudieron cargar los participantes.')
    });
  }

  get camposPersonalizadosGroup(): FormGroup {
    return this.candidataForm.get('camposPersonalizados') as FormGroup;
  }

  buildDynamicFormFields(): void {
    const camposGroup = this.camposPersonalizadosGroup;
    Object.keys(camposGroup.controls).forEach(key => camposGroup.removeControl(key));
    this.eleccion.camposCandidata?.forEach(campo => {
      camposGroup.addControl(campo, this.fb.control(''));
    });
  }

  openCreateForm(): void {
    this.isEditing.set(false);
    this.editingCandidataId.set(null);

    // Sugerir automáticamente el siguiente número de pasada disponible
    const siguienteNumero = this.participantes().length + 1;

    this.candidataForm.reset({
      numero: siguienteNumero,
      categoria: 'Embajadora',
      nombre: '',
      apellido: '',
      dni: '',
      cursoDivision: ''
    });

    this.buildDynamicFormFields();
    (this.candidataForm.get('fotosURL') as FormArray).clear();
    (this.candidataForm.get('nuevasImagenes') as FormArray).clear();
    this.imagePreviews.set([]);
    this.isFormVisible.set(true);
  }

  openEditForm(candidata: Candidata): void {
    this.isEditing.set(true);
    this.editingCandidataId.set(candidata.id!);
    this.buildDynamicFormFields();

    this.candidataForm.patchValue({
      numero: candidata.numero || 1,
      categoria: candidata.categoria || 'Embajadora',
      nombre: candidata.nombre,
      apellido: candidata.apellido,
      dni: candidata.dni,
      cursoDivision: candidata.cursoDivision || '',
      camposPersonalizados: candidata.camposPersonalizados || {}
    });

    const fotosUrlArray = this.candidataForm.get('fotosURL') as FormArray;
    fotosUrlArray.clear();
    (candidata.fotosURL || []).forEach(url => fotosUrlArray.push(this.fb.control(url)));

    (this.candidataForm.get('nuevasImagenes') as FormArray).clear();
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
    previews.splice(index, 1);
    this.imagePreviews.set(previews);

    const nuevasImagenesArray = this.candidataForm.get('nuevasImagenes') as FormArray;
    if (index < nuevasImagenesArray.length) {
      nuevasImagenesArray.removeAt(index);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.candidataForm.invalid) {
      this.notificationService.showAlertWarning('Formulario Incompleto', 'Por favor completá los campos requeridos.');
      return;
    }

    const formValue = this.candidataForm.value;
    const finalFotosURL = [...formValue.fotosURL, ...formValue.nuevasImagenes];

    const data: Omit<Candidata, 'id'> = {
      eleccionId: this.eleccion.id!,
      numero: Number(formValue.numero),
      categoria: formValue.categoria,
      nombre: formValue.nombre,
      apellido: formValue.apellido,
      dni: formValue.dni,
      cursoDivision: formValue.cursoDivision,
      fotosURL: finalFotosURL,
      camposPersonalizados: formValue.camposPersonalizados || {},
      puntuacionPorCriterio: {},
      puntuacionTotal: 0,
      cantidadDeVotos: 0,
    };

    try {
      if (this.isEditing() && this.editingCandidataId()) {
        const anterior = this.participantes().find(p => p.id === this.editingCandidataId());
        data.puntuacionTotal = anterior?.puntuacionTotal || 0;
        data.cantidadDeVotos = anterior?.cantidadDeVotos || 0;
        data.puntuacionPorCriterio = anterior?.puntuacionPorCriterio || {};

        await this.candidataService.updateCandidata(this.editingCandidataId()!, data);
        this.notificationService.showSuccessToast('Participante actualizado/a');
      } else {
        await this.candidataService.createCandidata(data);
        this.notificationService.showSuccessToast('Participante inscripto/a');
      }
      this.hideForm();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar en la base de datos.');
    }
  }

  async confirmDelete(candidata: Candidata): Promise<void> {
    if (candidata.cantidadDeVotos > 0) {
      this.notificationService.showAlertError('Acción Bloqueada', 'No se puede eliminar un participante que ya tiene votos registrados.');
      return;
    }

    const result = await this.notificationService.showConfirm(
      '¿Eliminar Participante?',
      `Se eliminará a ${candidata.nombre} ${candidata.apellido} (N° ${candidata.numero}) de la elección.`,
      'Sí, eliminar'
    );
    if (result.isConfirmed) {
      await this.candidataService.deleteCandidata(candidata.id!);
      this.notificationService.showSuccessToast('Participante eliminado');
    }
  }
}
