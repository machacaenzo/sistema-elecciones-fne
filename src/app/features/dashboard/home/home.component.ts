import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Eleccion } from '../../../core/models/eleccion.model';
import { Candidata } from '../../../core/models/candidata.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);

  currentUser = this.authService.currentUser;

  // Signals de Datos FNE
  eleccionActiva = signal<Eleccion | null>(null);
  candidatasCount = signal<number>(0);
  juradosCount = signal<number>(0);
  totalVotosCount = signal<number>(0);

  // Computadas de permisos
  isAdmin = computed(() => this.currentUser()?.rol === 'Administrador');
  isJurado = computed(() => this.currentUser()?.rol === 'Jurado' || this.currentUser()?.rol === 'Docente');

  ngOnInit(): void {
    this.cargarDatosEleccion();
  }

  private cargarDatosEleccion(): void {
    // 1. Cargar Elecciones
    this.firestoreService.getCollection<Eleccion>('elecciones').subscribe(elecciones => {
      if (elecciones.length > 0) {
        // Buscamos una activa o tomamos la más reciente
        const activa = elecciones.find(e => e.estado === 'Activa') || elecciones[0];
        this.eleccionActiva.set(activa);

        if (activa && activa.id) {
          // 2. Cargar Candidatas de esta elección
          this.firestoreService.getCollectionByFilter<Candidata>('candidatas', 'eleccionId', activa.id)
            .subscribe(candidatas => {
              this.candidatasCount.set(candidatas.length);
              const votos = candidatas.reduce((sum, c) => sum + (c.cantidadDeVotos || 0), 0);
              this.totalVotosCount.set(votos);
            });
        }
      }
    });

    // 3. Cargar Jurados habilitados
    this.firestoreService.getCollection<User>('users').subscribe(users => {
      const jurados = users.filter(u => u.rol === 'Jurado' || u.rol === 'Docente');
      this.juradosCount.set(jurados.length);
    });
  }
}
