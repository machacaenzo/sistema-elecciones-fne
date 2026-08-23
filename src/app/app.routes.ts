import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { roleGuard } from './core/guards/role.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { HomeComponent } from './features/dashboard/home/home.component';

export const routes: Routes = [
  // --- Rutas Públicas (Autenticación) ---
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

  // --- Panel Principal (Usuarios autenticados) ---
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        component: HomeComponent
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/user-profile/user-profile.component').then(c => c.UserProfileComponent)
      },

      // --- Módulo de Votación y Resultados FNE ---
      {
        path: 'votacion',
        loadComponent: () => import('./features/voting/votacion/votacion.component').then(c => c.VotacionComponent)
      },
      {
        path: 'resultados/:id',
        loadComponent: () => import('./features/voting/resultados-eleccion/resultados-eleccion.component').then(c => c.ResultadosEleccionComponent)
      },

      // --- Panel de Control / Administración FNE ---
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

  // --- Redirecciones Globales ---
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
