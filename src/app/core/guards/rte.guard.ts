// src/app/core/guards/rte.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, filter } from 'rxjs';
import { NotificacionService } from '../services/notificacion.service';

export const rteGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificacionService);

  return toObservable(authService.currentUser).pipe(
    filter(user => user !== undefined),
    map(user => {
      if (user && (user.rol === 'RTE' || user.rol === 'Administrador')) {
        return true;
      } else {
        notificationService.showAlertError('Acceso Denegado', 'No tienes los permisos necesarios para esta sección.');
        router.navigate(['/dashboard']);
        return false;
      }
    })
  );
};
