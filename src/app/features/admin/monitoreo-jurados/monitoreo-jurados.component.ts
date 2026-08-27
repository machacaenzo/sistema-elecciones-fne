import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { collection, collectionData, Firestore, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import { Eleccion } from '../../../core/models/eleccion.model';
import { User } from '../../../core/models/user.model';
import { Candidata } from '../../../core/models/candidata.model';
import { UserService } from '../../../core/services/user.service';
import { CandidataService } from '../gestion-elecciones/candidata.service';

export interface JuradoEstadoMonitoreo {
  uid: string;
  nombre: string;
  apellido: string;
  email: string;
  fotoURL?: string;
  firmoEmbajadora: boolean;
  actaEmbajadora?: any;
  firmoEmbajador: boolean;
  actaEmbajador?: any;
  estadoGeneral: 'COMPLETO' | 'PARCIAL' | 'PENDIENTE';
}

@Component({
  selector: 'app-monitoreo-jurados',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './monitoreo-jurados.component.html',
  styleUrls: ['./monitoreo-jurados.component.scss']
})
export class MonitoreoJuradosComponent implements OnInit {
  @Input({ required: true }) eleccion!: Eleccion;
  @Output() closeModal = new EventEmitter<void>();

  private firestore = inject(Firestore);
  private userService = inject(UserService);
  private candidataService = inject(CandidataService);

  jurados = signal<User[]>([]);
  candidatas = signal<Candidata[]>([]);
  actasFirmadas = signal<any[]>([]);
  isLoading = signal(true);

  // Modal para inspeccionar el acta de un jurado específico
  selectedDetalleActa = signal<{
    jurado: JuradoEstadoMonitoreo;
    categoria: 'Embajadora' | 'Embajador';
    acta: any;
  } | null>(null);

  isActaModalOpen = signal(false);

  // Lista procesada de jurados con sus actas vinculadas
  juradosEstado = computed<JuradoEstadoMonitoreo[]>(() => {
    const actas = this.actasFirmadas();
    const listaJurados = this.jurados();

    return listaJurados.map(jurado => {
      const actaChicas = actas.find(a => a.juradoUid === jurado.uid && a.categoria === 'Embajadora');
      const actaChicos = actas.find(a => a.juradoUid === jurado.uid && a.categoria === 'Embajador');

      const firmoEmbajadora = !!actaChicas;
      const firmoEmbajador = !!actaChicos;

      let estadoGeneral: 'COMPLETO' | 'PARCIAL' | 'PENDIENTE' = 'PENDIENTE';
      if (firmoEmbajadora && firmoEmbajador) {
        estadoGeneral = 'COMPLETO';
      } else if (firmoEmbajadora || firmoEmbajador) {
        estadoGeneral = 'PARCIAL';
      }

      return {
        uid: jurado.uid,
        nombre: jurado.nombre,
        apellido: jurado.apellido,
        email: jurado.email,
        fotoURL: jurado.fotoURL,
        firmoEmbajadora,
        actaEmbajadora: actaChicas,
        firmoEmbajador,
        actaEmbajador: actaChicos,
        estadoGeneral
      };
    });
  });

  completadosCount = computed(() => this.juradosEstado().filter(j => j.estadoGeneral === 'COMPLETO').length);
  parcialesCount = computed(() => this.juradosEstado().filter(j => j.estadoGeneral === 'PARCIAL').length);
  pendientesCount = computed(() => this.juradosEstado().filter(j => j.estadoGeneral === 'PENDIENTE').length);

  porcentajeProgreso = computed(() => {
    const total = this.juradosEstado().length;
    if (total === 0) return 0;
    return Math.round((this.completadosCount() / total) * 100);
  });

  ngOnInit(): void {
    if (!this.eleccion?.id) {
      this.closeModal.emit();
      return;
    }
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.isLoading.set(true);

    // 1. Cargar participantes para tener sus nombres y fotos
    this.candidataService.getCandidatasPorEleccion(this.eleccion.id!).pipe(first()).subscribe(cands => {
      this.candidatas.set(cands);
    });

    // 2. Cargar jurados asignados
    this.userService.getAllUsers().pipe(first()).subscribe(users => {
      const asignadosIds = this.eleccion.juradosAsignados || [];
      let juradosFiltrados: User[] = [];

      if (asignadosIds.length > 0) {
        juradosFiltrados = users.filter(u => asignadosIds.includes(u.uid));
      } else {
        juradosFiltrados = users.filter(u => u.rol === 'Jurado' && u.EsActivo);
      }

      this.jurados.set(juradosFiltrados);
    });

    // 3. Escuchar en tiempo real las actas firmadas
    const votosRef = collection(this.firestore, 'votos_jurados');
    const q = query(votosRef, where('eleccionId', '==', this.eleccion.id));

    (collectionData(q, { idField: 'id' }) as Observable<any[]>).subscribe({
      next: (actas) => {
        this.actasFirmadas.set(actas);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al monitorear actas:', err);
        this.isLoading.set(false);
      }
    });
  }

  // Abrir modal de inspección de la planilla de un jurado
  verDetalleActa(jurado: JuradoEstadoMonitoreo, categoria: 'Embajadora' | 'Embajador'): void {
    const acta = (categoria === 'Embajadora') ? jurado.actaEmbajadora : jurado.actaEmbajador;
    if (!acta) return;

    this.selectedDetalleActa.set({
      jurado,
      categoria,
      acta
    });
    this.isActaModalOpen.set(true);
  }

  cerrarDetalleActa(): void {
    this.isActaModalOpen.set(false);
    this.selectedDetalleActa.set(null);
  }

  getCandidata(candidataId: string): Candidata | undefined {
    return this.candidatas().find(c => c.id === candidataId);
  }

  getCriteriosKeys(puntajesObj: any): string[] {
    return puntajesObj ? Object.keys(puntajesObj) : [];
  }
}
