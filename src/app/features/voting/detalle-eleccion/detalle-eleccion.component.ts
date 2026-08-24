import { Component, EventEmitter, inject, Input, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';

import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

@Component({
  selector: 'app-detalle-eleccion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-eleccion.component.html'
})
export class DetalleEleccionComponent implements OnInit {
  @Input({ required: true }) eleccion!: Eleccion;
  @Input() haVotado: boolean = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() iniciarVotacion = new EventEmitter<void>();

  private candidataService = inject(CandidataService);
  private notificationService = inject(NotificacionService);

  candidatas = signal<Candidata[]>([]);
  isLoading = signal(true);
  selectedCandidata = signal<Candidata | null>(null);
  selectedPhotoIndex = signal<number>(0);

  // Filtro por Categoría: 'Todas' | 'Embajadora' | 'Paje'
  selectedCategory = signal<'Todas' | 'Embajadora' | 'Embajador'>('Todas');

  // Candidatas filtradas según la pestaña activa
  candidatasFiltradas = computed(() => {
    const list = this.candidatas();
    const cat = this.selectedCategory();
    if (cat === 'Todas') return list;
    return list.filter((c: any) => (c.categoria || 'Embajadora') === cat);
  });

  isGalleryOpen = signal(false);
  today = new Date();

  ngOnInit(): void {
    if (!this.eleccion || !this.eleccion.id) {
      this.notificationService.showAlertError('Error', 'No se ha podido cargar la información de la elección.');
      this.closeModal.emit();
      return;
    }

    this.candidataService.getCandidatasPorEleccion(this.eleccion.id).pipe(first()).subscribe({
      next: (candidatasData) => {
        // Ordenamos por número de pasada
        const ordenadas = candidatasData.sort((a: any, b: any) => (a.numero || a.numeroCandidata || 0) - (b.numero || b.numeroCandidata || 0));
        this.candidatas.set(ordenadas);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar las candidatas:', err);
        this.notificationService.showAlertError('Error de Carga', 'No se pudieron cargar las candidatas.');
        this.isLoading.set(false);
      }
    });
  }

  setCategory(cat: 'Todas' | 'Embajadora' | 'Embajador'): void {
    this.selectedCategory.set(cat);
  }

  getNumeroPasada(candidata: any, index: number = 0): string {
    const num = candidata?.numero || candidata?.numeroCandidata || (index + 1);
    return num < 10 ? `0${num}` : `${num}`;
  }

  openGallery(candidata: Candidata): void {
    this.selectedCandidata.set(candidata);
    this.selectedPhotoIndex.set(0);
    this.isGalleryOpen.set(true);
  }

  closeGallery(): void {
    this.isGalleryOpen.set(false);
  }

  selectPhoto(index: number): void {
    this.selectedPhotoIndex.set(index);
  }

  onVotarClick(): void {
    if (this.candidatas().length === 0) {
      this.notificationService.showAlertWarning('Sin Candidatas', 'Aún no hay candidatas inscritas en esta elección.');
      return;
    }
    this.iniciarVotacion.emit();
  }
}