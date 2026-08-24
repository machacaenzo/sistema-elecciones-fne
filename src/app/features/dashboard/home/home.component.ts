import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);

  currentUser = this.authService.currentUser;

  // Signals de Métricas en Vivo de la Noche
  eleccionActiva = signal<Eleccion | null>(null);
  embajadorasCount = signal<number>(0);
  embajadoresCount = signal<number>(0);
  juradosCount = signal<number>(0);
  totalVotosCount = signal<number>(0);

  // Permisos de usuario
  isAdmin = computed(() => this.currentUser()?.rol === 'Administrador');
  isJurado = computed(() => this.currentUser()?.rol === 'Jurado');

  ngOnInit(): void {
    this.cargarDatosGala();
  }

  private cargarDatosGala(): void {
    // 1. Cargar la Elección
    this.firestoreService.getCollection<Eleccion>('elecciones').subscribe(elecciones => {
      if (elecciones.length > 0) {
        const activa = elecciones.find(e => e.estado === 'Activa') || elecciones[0];
        this.eleccionActiva.set(activa);

        if (activa && activa.id) {
          // 2. Cargar Participantes
          this.firestoreService.getCollectionByFilter<Candidata>('candidatas', 'eleccionId', activa.id)
            .subscribe(candidatas => {
              const chicas = candidatas.filter((c: any) => c.categoria === 'Embajadora' || !c.categoria);
              const chicos = candidatas.filter((c: any) => c.categoria === 'Embajador' || c.categoria === 'Paje');

              this.embajadorasCount.set(chicas.length);
              this.embajadoresCount.set(chicos.length);

              const votos = candidatas.reduce((sum, c) => sum + (c.cantidadDeVotos || 0), 0);
              this.totalVotosCount.set(votos);
            });
        }
      }
    });

    // 3. Cargar Jurados (Solo si es Admin)
    if (this.isAdmin()) {
      this.firestoreService.getCollection<User>('users').subscribe(users => {
        const jurados = users.filter(u => u.rol === 'Jurado');
        this.juradosCount.set(jurados.length);
      });
    }
  }
}
