import { Component, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  // --- Inyección de Servicios ---
  authService = inject(AuthService);

  // --- Signals de Estado ---
  currentUser = this.authService.currentUser;
  isSidebarOpen = signal(false);

  // --- SIGNALS COMPUTADAS PARA ROLES FNE ---
  isAdmin = computed(() => {
    return this.currentUser()?.rol === 'Administrador';
  });

  isJurado = computed(() => {
    return this.currentUser()?.rol === 'Jurado';
  });



  toggleSidebar(): void {
    this.isSidebarOpen.update(isOpen => !isOpen);
  }

  logout(): void {
    this.authService.logout();
  }
}
