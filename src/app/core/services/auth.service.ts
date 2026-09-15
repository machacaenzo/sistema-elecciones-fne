import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { UserService } from './user.service';
import { NotificacionService } from './notificacion.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private userService: UserService = inject(UserService);
  private notificationService: NotificacionService = inject(NotificacionService);

  currentUser: WritableSignal<User | null | undefined> = signal(undefined);

 constructor() {
    onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
      // 👈 Solo valida que el usuario exista en Firebase
      if (firebaseUser) {
        const userProfile = await this.userService.getUserById(firebaseUser.uid);
        this.currentUser.set(userProfile || null);
      } else {
        this.currentUser.set(null);
      }
    });
  } 

  public getAuth(): Auth {
    return this.auth;
  }

  // REGISTRO CON CORREO: Nace como "Pendiente" y "Deshabilitado"
  // REGISTRO CON CORREO: Nace como "Pendiente" y "Deshabilitado" (Seguridad Institucional)
  async register(data: any): Promise<void> {
    try {
      const { email, password, nombre, apellido } = data;
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const { user: firebaseUser } = userCredential;

      // 👈 Guarda el usuario pendiente de aprobación por el Administrador
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        nombre,
        apellido,
        rol: 'Pendiente',
        EsActivo: false
      };
      await this.userService.createUser(newUser);

      this.notificationService.showAlertSuccess(
        `¡Registro Exitoso, ${nombre}!`,
        'Tu cuenta fue creada. El Administrador deberá habilitarte desde el panel de control.'
      );

      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.notificationService.showAlertError('Email ya registrado', 'La dirección de correo electrónico ya está en uso.');
      } else {
        this.notificationService.showAlertError('Error de Registro', 'Ocurrió un problema inesperado.');
      }
      throw error;
    }
  }

  // REDIRECCIÓN SEGURA SEGÚN ROL Y ESTADO
  private redirectToDashboard(user: User): void {
    if (user.rol === 'Administrador') {
      this.router.navigate(['/dashboard/home']);
    } else if (user.rol === 'Jurado' && user.EsActivo) {
      this.router.navigate(['/dashboard/votacion']);
    } else {
      this.router.navigate(['/dashboard/home']);
    }
  }

  async login({ email, password }: { email: string; password: string }): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const userProfile = await this.userService.getUserById(userCredential.user.uid);

      // 👈 Valida directo el perfil en Firestore
      if (userProfile) {
        this.redirectToDashboard(userProfile);
      } else {
        await signOut(this.auth);
        this.notificationService.showAlertError('Error de Perfil', 'No se encontró tu perfil de usuario.');
      }
    } catch (error: any) {
      this.notificationService.showAlertError('Error al iniciar sesión', 'El correo o la contraseña son incorrectos.');
    }
  }

  // LOGIN CON GOOGLE: Nace como "Pendiente" y "Deshabilitado"
  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      const { user: firebaseUser } = userCredential;

      const existingUser = await this.userService.getUserById(firebaseUser.uid);

      if (existingUser) {
        this.currentUser.set(existingUser);
        this.redirectToDashboard(existingUser);
      } else {
        const [nombre, ...apellidoParts] = (firebaseUser.displayName || 'Sin Nombre').split(' ');
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          nombre,
          apellido: apellidoParts.join(' '),
          fotoURL: firebaseUser.photoURL || '',
          rol: 'Pendiente',
          EsActivo: false
        };

        await this.userService.createUser(newUser);
        this.currentUser.set(newUser);
        this.notificationService.showAlertSuccess(`¡Bienvenido, ${newUser.nombre}!`, 'Tu cuenta fue creada. El Administrador la acreditará.');
        this.redirectToDashboard(newUser);
      }
    } catch (error) {
      this.notificationService.showAlertError('Error de Conexión', 'No se pudo iniciar sesión con Google.');
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      this.notificationService.showAlertSuccess(
        'Correo Enviado',
        'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.'
      );
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.notificationService.showAlertError('Error al Enviar', 'Ocurrió un problema. Verifica el correo.');
      throw error;
    }
  }

  async resendVerificationEmail(): Promise<void> {
    const user = this.auth.currentUser;
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        this.notificationService.showAlertSuccess(
          'Correo Reenviado',
          'Hemos enviado un nuevo enlace de verificación a tu correo.'
        );
      } catch (error) {
        this.notificationService.showAlertError('Error', 'No se pudo reenviar el correo.');
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  public async refreshUserProfile(): Promise<void> {
    const user = this.currentUser();
    if (user && user.uid) {
      try {
        const updatedProfile = await this.userService.getUserById(user.uid);
        this.currentUser.set(updatedProfile || null);
      } catch (error) {
        console.error('Error al refrescar perfil:', error);
      }
    }
  }
}
