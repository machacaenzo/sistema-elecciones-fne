import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { collection, collectionData, Firestore, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { Eleccion } from '../../../core/models/eleccion.model';
import { User } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';

export interface JuradoEstadoMonitoreo {
  uid: string;
  nombre: string;
  apellido: string;
  email: string;
  fotoURL?: string;
  firmoEmbajadora: boolean;
  fechaEmbajadora?: any;
  firmoEmbajador: boolean;
  fechaEmbajador?: any;
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

  jurados = signal<User[]>([]);
  actasFirmadas = signal<any[]>([]);
  isLoading = signal(true);

  // Lista procesada con el estado en tiempo real de cada jurado
  juradosEstado = computed<JuradoEstadoMonitoreo[]>(() => {
    const actas = this.actasFirmadas();
    const listaJurados = this.jurados();

    return listaJurados.map(jurado => {
      // Buscar actas firmadas por este jurado para esta elección
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
        fechaEmbajadora: actaChicas?.fechaFirma,
        firmoEmbajador,
        fechaEmbajador: actaChicos?.fechaFirma,
        estadoGeneral
      };
    });
  });

  // Métricas globales en tiempo real
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

    this.cargarJuradosYActas();
  }

  private cargarJuradosYActas(): void {
    this.isLoading.set(true);

    // 1. Cargar jurados asignados (o todos los jurados activos si no se especificaron)
    this.userService.getAllUsers().subscribe(users => {
      const asignadosIds = this.eleccion.juradosAsignados || [];
      let juradosFiltrados: User[] = [];

      if (asignadosIds.length > 0) {
        juradosFiltrados = users.filter(u => asignadosIds.includes(u.uid));
      } else {
        juradosFiltrados = users.filter(u => u.rol === 'Jurado' && u.EsActivo);
      }

      this.jurados.set(juradosFiltrados);
    });

    // 2. Escuchar en tiempo real las actas firmadas en /votos_jurados para esta elección
    const votosRef = collection(this.firestore, 'votos_jurados');
    const q = query(votosRef, where('eleccionId', '==', this.eleccion.id));

    (collectionData(q, { idField: 'id' }) as Observable<any[]>).subscribe({
      next: (actas) => {
        this.actasFirmadas.set(actas);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al monitorear actas de jurados:', err);
        this.isLoading.set(false);
      }
    });
  }
}
