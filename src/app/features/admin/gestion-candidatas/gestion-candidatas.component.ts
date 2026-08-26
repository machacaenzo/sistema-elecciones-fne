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

  participantes = signal<Candidata[]>([]);
  categoriaFiltro = signal<'Todas' | CategoriaParticipante>('Todas');

  isFormVisible = signal(false);
  isEditing = signal(false);
  editingCandidataId = signal<string | null>(null);
  imagePreviews = signal<string[]>([]);
  isProcessingImages = signal(false);
  isSubmitting = signal(false);

  candidataForm: FormGroup;

  participantesFiltrados = computed(() => {
    let lista = [...this.participantes()];
    if (this.categoriaFiltro() !== 'Todas') {
      lista = lista.filter(p => (p.categoria || 'Embajadora') === this.categoriaFiltro());
    }
    return lista.sort((a, b) => (a.numero || 0) - (b.numero || 0));
  });

  constructor() {
    this.candidataForm = this.fb.group({
      numero: [1, [Validators.required, Validators.min(1)]],
      categoria: ['Embajadora' as CategoriaParticipante, Validators.required],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      cursoDivision: ['', Validators.required],
      fotosURL: this.fb.array([]),
      nuevasImagenes: this.fb.array([]),
      camposPersonalizados: this.fb.group({})
    });

    this.candidataForm.get('categoria')?.valueChanges.subscribe((nuevaCat: CategoriaParticipante) => {
      if (!this.isEditing() && this.isFormVisible()) {
        const sigNum = this.calcularSiguienteNumero(nuevaCat);
        this.candidataForm.patchValue({ numero: sigNum }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    if (!this.eleccion?.id) {
      this.notificationService.showAlertError('Error', 'No se especificó la elección.');
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

  calcularSiguienteNumero(categoria: CategoriaParticipante): number {
    const listaCat = this.participantes().filter(p => (p.categoria || 'Embajadora') === categoria);
    if (listaCat.length === 0) return 1;
    const maxNum = Math.max(...listaCat.map(p => p.numero || 0));
    return maxNum + 1;
  }

  get camposPersonalizadosGroup(): FormGroup {
    return this.candidataForm.get('camposPersonalizados') as FormGroup;
  }

  buildDynamicFormFields(): void {
    const camposGroup = this.camposPersonalizadosGroup;
    Object.keys(camposGroup.controls).forEach(key => camposGroup.removeControl(key));
    const campos = this.eleccion.camposCandidata || [];
    campos.forEach(campo => {
      camposGroup.addControl(campo, this.fb.control(''));
    });
  }

  openCreateForm(): void {
    this.isEditing.set(false);
    this.editingCandidataId.set(null);
    this.isSubmitting.set(false);

    const catInicial: CategoriaParticipante = (this.categoriaFiltro() === 'Embajador') ? 'Embajador' : 'Embajadora';
    const siguienteNumero = this.calcularSiguienteNumero(catInicial);

    this.candidataForm.reset({
      numero: siguienteNumero,
      categoria: catInicial,
      nombre: '',
      apellido: '',
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
    this.isSubmitting.set(false);
    this.buildDynamicFormFields();

    this.candidataForm.patchValue({
      numero: candidata.numero || 1,
      categoria: candidata.categoria || 'Embajadora',
      nombre: candidata.nombre,
      apellido: candidata.apellido,
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
    this.isSubmitting.set(false);
  }

  private compressImage(file: File, maxWidth = 600, quality = 0.65): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/webp', quality));
        };
        img.onerror = err => reject(err);
      };
      reader.onerror = err => reject(err);
    });
  }

  async onFileSelected(event: any): Promise<void> {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      this.isProcessingImages.set(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const compressed = await this.compressImage(file, 600, 0.65);
          this.imagePreviews.update(current => [...current, compressed]);
          (this.candidataForm.get('nuevasImagenes') as FormArray).push(this.fb.control(compressed));
        }
      } catch (error) {
        this.notificationService.showAlertError('Error', 'No se pudieron procesar las imágenes.');
      } finally {
        this.isProcessingImages.set(false);
      }
    }
  }

  removeImage(index: number): void {
    const previews = [...this.imagePreviews()];
    previews.splice(index, 1);
    this.imagePreviews.set(previews);

    const fotosUrlArray = this.candidataForm.get('fotosURL') as FormArray;
    const nuevasImagenesArray = this.candidataForm.get('nuevasImagenes') as FormArray;

    if (index < fotosUrlArray.length) {
      fotosUrlArray.removeAt(index);
    } else {
      nuevasImagenesArray.removeAt(index - fotosUrlArray.length);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;

    if (this.candidataForm.invalid) {
      this.notificationService.showAlertWarning('Formulario Incompleto', 'Por favor completá los campos requeridos.');
      return;
    }

    const formValue = this.candidataForm.value;
    const num = Number(formValue.numero);
    const cat = formValue.categoria as CategoriaParticipante;
    const editId = this.editingCandidataId();

    const existeDuplicado = this.participantes().some(p => {
      const mismaCat = (p.categoria || 'Embajadora') === cat;
      const mismoNumero = Number(p.numero) === num;
      const esOtroParticipante = p.id !== editId;
      return mismaCat && mismoNumero && esOtroParticipante;
    });

    if (existeDuplicado) {
      this.notificationService.showAlertWarning(
        'Número Duplicado',
        `Ya existe un/a participante con el N° ${num} en la categoría "${cat}". Elegí otro número.`
      );
      return;
    }

    this.isSubmitting.set(true);
    const finalFotosURL = [...formValue.fotosURL, ...formValue.nuevasImagenes];

    const data: Omit<Candidata, 'id'> = {
      eleccionId: this.eleccion.id!,
      numero: num,
      categoria: cat,
      nombre: formValue.nombre.trim(),
      apellido: formValue.apellido.trim(),
      cursoDivision: formValue.cursoDivision.trim(),
      fotosURL: finalFotosURL,
      camposPersonalizados: formValue.camposPersonalizados || {},
      puntuacionPorCriterio: {},
      puntuacionTotal: 0,
      cantidadDeVotos: 0,
    };

    try {
      if (this.isEditing() && editId) {
        const anterior = this.participantes().find(p => p.id === editId);
        data.puntuacionTotal = anterior?.puntuacionTotal || 0;
        data.cantidadDeVotos = anterior?.cantidadDeVotos || 0;
        data.puntuacionPorCriterio = anterior?.puntuacionPorCriterio || {};

        await this.candidataService.updateCandidata(editId, data);
        this.notificationService.showSuccessToast('Ficha actualizada correctamente');
      } else {
        await this.candidataService.createCandidata(data);
        this.notificationService.showSuccessToast('Participante inscripto/a con éxito');
      }
      this.hideForm();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar la ficha en la base de datos.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async confirmDelete(candidata: Candidata): Promise<void> {
    if (candidata.cantidadDeVotos > 0) {
      this.notificationService.showAlertError('Acción Bloqueada', 'No se puede eliminar un participante que ya tiene votos registrados.');
      return;
    }

    const result = await this.notificationService.showConfirm(
      '¿Eliminar Participante?',
      `Se eliminará a ${candidata.nombre} ${candidata.apellido} (N° ${candidata.numero}) de la nómina.`,
      'Sí, eliminar'
    );
    if (result.isConfirmed) {
      await this.candidataService.deleteCandidata(candidata.id!);
      this.notificationService.showSuccessToast('Participante eliminado/a');
    }
  }
}
