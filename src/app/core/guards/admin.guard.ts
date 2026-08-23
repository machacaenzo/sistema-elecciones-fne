import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, filter, first } from 'rxjs'; // <-- Importa 'first'
import { NotificacionService } from '../services/notificacion.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificacionService);

 
  return toObservable(authService.currentUser).pipe(
    
    
    filter(user => user !== undefined),
    first(),
    
    map(user => {
      console.log('Admin Guard | Estado del usuario recibido:', user);
      if (user) {
        console.log('Admin Guard | Rol del usuario:', user.rol);
      }
      
      if (user && user.rol?.toLowerCase() === 'administrador') {
        console.log('Admin Guard | Acceso PERMITIDO.');
        return true;
      } else {
        console.log('Admin Guard | Acceso DENEGADO.');
        notificationService.showAlertError('Acceso Denegado', 'No tienes los permisos necesarios para acceder a esta sección.');
        router.navigate(['/dashboard/my-tasks']);
        return false;
      }
    })
  );
};