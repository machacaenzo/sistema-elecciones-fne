import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authState } from '@angular/fire/auth';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authState(authService.getAuth()).pipe(
    map(user => {
      if (user) {
        if (user.emailVerified) {
          return true;
        }
        else {
          router.navigate(['/verify-email']);
          return false;
        }
      }
      else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
