// src/app/core/guards/public.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, filter } from 'rxjs'; // <-- Importa 'filter'

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    filter(user => user !== undefined),

    map(user => {
      if (user) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};
