import { Component, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Eleccion } from '../../core/models/eleccion.model';
import { FullscreenService } from '../../core/services/fullscreen.service.ts.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  authService = inject(AuthService);

  fullscreenService = inject(FullscreenService);
  currentUser = this.authService.currentUser;

  // En celulares: Drawer abierto o cerrado
  isSidebarOpen = signal(false);

  // En PC/Laptops: Menú colapsado para ganar 100% de pantalla
  isSidebarCollapsed = signal(false);

  eleccionActiva = signal<Eleccion | null>(null);

  isAdmin = computed(() => this.currentUser()?.rol === 'Administrador');
  isJurado = computed(() => this.currentUser()?.rol === 'Jurado');

  toggleSidebar(): void {
    if (window.innerWidth >= 1024) {
      this.isSidebarCollapsed.update(v => !v);
    } else {
      this.isSidebarOpen.update(v => !v);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
