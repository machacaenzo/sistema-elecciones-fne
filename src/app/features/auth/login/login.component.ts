import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service'; 
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificacionService } from '../../../core/services/notificacion.service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificacionService);

  isSubmitting = signal(false);
  passwordVisible = signal(false);

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notificationService.showAlertWarning('Datos incompletos', 'Por favor, ingresá tu correo y contraseña.');
      return;
    }
    this.isSubmitting.set(true);
    try {
      await this.authService.login(this.loginForm.value);
    } catch (error) {
      // El error ya lo maneja el AuthService con NotificacionService
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async loginWithGoogle(): Promise<void> {
    await this.authService.loginWithGoogle();
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}