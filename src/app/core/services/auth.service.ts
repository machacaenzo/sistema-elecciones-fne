
import { sendEmailVerification, sendPasswordResetEmail } from '@angular/fire/auth';
import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
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
     
      if (firebaseUser && firebaseUser.emailVerified) {
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

  async register(data: any): Promise<void> {
    try {
      const { email, password, nombre, apellido } = data;
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const { user: firebaseUser } = userCredential;

      await sendEmailVerification(firebaseUser);

      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        nombre,
        apellido,
        rol: 'Docente',
        EsActivo: true
      };
      await this.userService.createUser(newUser);

      this.notificationService.showAlertSuccess(
        `¡Registro Exitoso, ${nombre}!`,
        'Hemos enviado un enlace a tu correo. Por favor, verifica tu cuenta para poder iniciar sesión.'
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

  private redirectToDashboard(user: User): void {
    // Aquí está la lógica de redirección basada en el rol
    if (user.rol === 'Alumno') {
      this.router.navigate(['/dashboard/voting']);
    } else {
      // Para cualquier otro rol, los enviamos al 'home' principal del dashboard.
      this.router.navigate(['/dashboard/home']);
    }
  }
  async login({ email, password }: { email: string; password: string }): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // *** INICIO DE LA CORRECCIÓN ***
      // Después de un login exitoso, obtenemos el perfil del usuario para saber su rol.
      const userProfile = await this.userService.getUserById(userCredential.user.uid);

      if (userProfile && userCredential.user.emailVerified) {
        // Si el perfil existe y el email está verificado, llamamos a nuestra función de redirección.
        this.redirectToDashboard(userProfile);
      } else if (!userCredential.user.emailVerified) {
        // Si el usuario no está verificado, lo mandamos a la página de verificación.
        this.router.navigate(['/verify-email']);
      } else {
        // Caso raro: usuario autenticado pero sin perfil en la base de datos.
        await signOut(this.auth);
        this.notificationService.showAlertError('Error de Perfil', 'No se encontró tu perfil de usuario.');
      }
      // *** FIN DE LA CORRECCIÓN ***

    } catch (error: any) {
      this.notificationService.showAlertError('Error al iniciar sesión', 'El correo o la contraseña son incorrectos.');
    }
  }

   async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      const { user: firebaseUser } = userCredential;

      const existingUser = await this.userService.getUserById(firebaseUser.uid);

      if (existingUser) {
        if (existingUser.EsActivo) {
          this.currentUser.set(existingUser);
          this.notificationService.showAlertSuccess(`¡Hola de nuevo, ${existingUser.nombre}!`, 'Has iniciado sesión.');
       //   this.router.navigate(['/dashboard']);
           this.redirectToDashboard(existingUser);
        } else {
          await signOut(this.auth);
          this.notificationService.showAlertWarning('Acceso Denegado', 'Tu cuenta está desactivada.');
        }
      } else {
        const [nombre, ...apellidoParts] = (firebaseUser.displayName || 'Sin Nombre').split(' ');
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          nombre,
          apellido: apellidoParts.join(' '),
          fotoURL: firebaseUser.photoURL || '',
          rol: 'Docente',
          EsActivo: true
        };

        await this.userService.createUser(newUser);
        this.currentUser.set(newUser);
        this.notificationService.showAlertSuccess(`¡Bienvenido, ${newUser.nombre}!`, 'Tu cuenta ha sido creada.');
       // this.router.navigate(['/dashboard']);
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
      this.notificationService.showAlertError('Error al Enviar', 'Ocurrió un problema. Verifica el correo e inténtalo de nuevo.');
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
        console.error("Error al refrescar el perfil del usuario:", error);
      }
    }
  }
}
