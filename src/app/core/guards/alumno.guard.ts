import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, filter } from 'rxjs/operators'; // <-- Importar 'filter'
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';

export const alumnoGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    // *** INICIO DE LA CORRECCIÓN ***
    // 1. Usamos 'filter' para ignorar el estado inicial 'undefined'.
    // El flujo del pipe se pausará aquí hasta que currentUser sea 'null' o un objeto 'User'.
    filter(user => user !== undefined),
    // *** FIN DE LA CORRECCIÓN ***

    map(user => {
      // 2. Ahora, cuando 'map' se ejecuta, estamos seguros de que 'user' no es 'undefined'.
      if (user && user.rol === 'Alumno') {
        return true; // Acceso permitido
      }

      // Si no es 'Alumno' o no está logueado, redirigir y denegar.
      router.navigate(['/dashboard/home']);
      return false;
    })
  );
};