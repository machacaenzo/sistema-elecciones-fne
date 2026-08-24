import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // --- RUTA PÚBLICA PRINCIPAL (Cualquiera entra con QR o link sin login) ---
  {
    path: '',
    loadComponent: () => import('./features/public/gala-portal/gala-portal.component').then(c => c.GalaPortalComponent)
  },

  // --- Rutas de Autenticación ---
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(c => c.RegisterComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(c => c.VerifyEmailComponent)
  },

  // --- Panel Privado (Dashboard / Admin / Jurados) ---
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/dashboard/home/home.component').then(c => c.HomeComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/user-profile/user-profile.component').then(c => c.UserProfileComponent)
      },
      {
        path: 'votacion',
        loadComponent: () => import('./features/voting/votacion/votacion.component').then(c => c.VotacionComponent)
      },
      {
        path: 'resultados/:id',
        loadComponent: () => import('./features/voting/resultados-eleccion/resultados-eleccion.component').then(c => c.ResultadosEleccionComponent)
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./features/admin/gestion-usuarios/gestion-usuarios.component').then(c => c.GestionUsuariosComponent),
        canActivate: [roleGuard],
        data: { roles: ['Administrador'] }
      },
      {
        path: 'admin/elections',
        loadComponent: () => import('./features/admin/gestion-elecciones/gestion-elecciones.component').then(c => c.GestionEleccionesComponent),
        canActivate: [roleGuard],
        data: { roles: ['Administrador'] }
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },

  // Redirección si la ruta no existe
  { path: '**', redirectTo: '' }
];
