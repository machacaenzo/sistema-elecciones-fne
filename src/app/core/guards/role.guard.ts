import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, filter, first } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificacion.service';
import { UserRole } from '../models/user.model';

export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notificationService = inject(NotificacionService);

    return toObservable(authService.currentUser).pipe(
      filter(user => user !== undefined),
      first(),
      map(user => {
        if (user && allowedRoles.includes(user.rol)) {
          return true;
        } else {
          notificationService.showAlertError('Acceso Denegado', 'No tienes los permisos necesarios para acceder a esta sección.');
          router.navigate(['/dashboard/my-tasks']);
          return false;
        }
      })
    );
  };
}
