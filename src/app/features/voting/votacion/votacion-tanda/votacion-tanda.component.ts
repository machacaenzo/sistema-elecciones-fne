import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-votacion-tanda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './votacion-tanda.component.html'
})
export class VotacionTandaComponent {
  private authService = inject(AuthService);

  @Input({ required: true }) eleccionId!: string;

  @Output() tandaSeleccionada = new EventEmitter<'Embajadora' | 'Embajador'>();

  tandaFirmada(categoria: 'Embajadora' | 'Embajador'): boolean {
    const user = this.authService.currentUser();
    if (!user || !this.eleccionId) return false;
    const tandas = (user as any).tandasVotadas || [];
    return tandas.includes(`${this.eleccionId}_${categoria}`);
  }
}
