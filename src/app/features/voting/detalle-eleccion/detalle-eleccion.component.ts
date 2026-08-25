import { Component, EventEmitter, inject, Input, OnInit, OnDestroy, Output, signal, computed } from '@angular/core';
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
  templateUrl: './detalle-eleccion.component.html',
  styleUrls: ['./detalle-eleccion.component.scss']
})
export class DetalleEleccionComponent implements OnInit, OnDestroy {
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
  
  // Timer para el carrusel automático
  private autoplayInterval: any;

  selectedCategory = signal<'Todas' | 'Embajadora' | 'Embajador'>('Todas');

  candidatasFiltradas = computed(() => {
    const list = this.candidatas();
    const cat = this.selectedCategory();
    if (cat === 'Todas') return list;
    return list.filter((c: any) => (c.categoria || 'Embajadora') === cat);
  });

  isGalleryOpen = signal(false);
  today = new Date();

  ngOnInit(): void {
    if (!this.eleccion?.id) {
      this.notificationService.showAlertError('Error', 'No se ha podido cargar la información.');
      this.closeModal.emit();
      return;
    }

    this.candidataService.getCandidatasPorEleccion(this.eleccion.id).pipe(first()).subscribe({
      next: (data) => {
        const ordenadas = data.sort((a: any, b: any) => (a.numero || 0) - (b.numero || 0));
        this.candidatas.set(ordenadas);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Limpieza al destruir el componente
  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  setCategory(cat: 'Todas' | 'Embajadora' | 'Embajador'): void {
    this.selectedCategory.set(cat);
  }

  formatNumero(num: any): string {
    const n = num ?? 0;
    return n < 10 ? `0${n}` : `${n}`;
  }

  getNumeroPasada(candidata: any, index: number = 0): string {
    const num = candidata?.numero || (index + 1);
    return this.formatNumero(num);
  }

  openGallery(candidata: Candidata): void {
    this.selectedCandidata.set(candidata);
    this.selectedPhotoIndex.set(0);
    this.isGalleryOpen.set(true);
    this.startAutoplay(); // Inicia el carrusel
  }

  closeGallery(): void {
    this.isGalleryOpen.set(false);
    this.stopAutoplay(); // Detiene el carrusel
  }

  // Métodos del Carrusel Automático
  private startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      const photos = this.selectedCandidata()?.fotosURL || [];
      if (photos.length > 1) {
        // Incrementa el índice de forma circular (0, 1, 2, 0...)
        this.selectedPhotoIndex.update(idx => (idx + 1) % photos.length);
      }
    }, 4000); // Cambia cada 4 segundos
  }

  private stopAutoplay(): void {
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
  }

  onVotarClick(): void {
    if (this.candidatas().length === 0) {
      this.notificationService.showAlertWarning('Atención', 'No hay participantes registrados.');
      return;
    }
    this.iniciarVotacion.emit();
  }
}