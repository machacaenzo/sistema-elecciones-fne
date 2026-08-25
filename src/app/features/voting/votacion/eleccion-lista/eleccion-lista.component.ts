import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Eleccion } from '../../../../core/models/eleccion.model';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-eleccion-lista',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './eleccion-lista.component.html'
})
export class EleccionListaComponent {
  private authService = inject(AuthService);

  @Input({ required: true }) todasLasElecciones: Eleccion[] = [];

  @Output() verDetalle    = new EventEmitter<Eleccion>();
  @Output() ingresarVotar = new EventEmitter<Eleccion>();

  haVotado(eleccionId: string): boolean {
    const user = this.authService.currentUser() as any;
    if (!user) return false;

    // 1. Si el usuario ya completó ambas tandas oficialmente en la base de datos
    const elecciones = user.eleccionesVotadas || [];
    if (elecciones.includes(eleccionId)) return true;

    // 2. Si tiene registradas ambas tandas en su perfil
    const tandas = user.tandasVotadas || [];
    const firmoChicas = tandas.includes(`${eleccionId}_Embajadora`);
    const firmoChicos  = tandas.includes(`${eleccionId}_Embajador`);

    return firmoChicas && firmoChicos;
  }
}
