import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { first } from 'rxjs/operators';

import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { CandidataService } from '../../admin/gestion-elecciones/candidata.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-detalle-eleccion',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './detalle-eleccion.component.html',
  styleUrls: ['./detalle-eleccion.component.scss']
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
        this.candidatas.set(candidatasData);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar las candidatas:', err);
        this.notificationService.showAlertError('Error de Carga', 'No se pudieron cargar las candidatas para esta elección.');
        this.isLoading.set(false);
      }
    });
  }

  openGallery(candidata: Candidata): void {
    this.selectedCandidata.set(candidata);
    this.isGalleryOpen.set(true);
  }

  closeGallery(): void {
    this.isGalleryOpen.set(false);
  }

  onVotarClick(): void {
    if (this.candidatas().length === 0) {
        this.notificationService.showAlertWarning('Sin Candidatas', 'Aún no hay candidatas inscritas en esta elección.');
      return;
    }
    this.iniciarVotacion.emit();
  }
}
