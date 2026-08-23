import { Component, WritableSignal, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { User } from '../../../core/models/user.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private notificationService = inject(NotificacionService);

  currentUser: WritableSignal<User | null | undefined> = this.authService.currentUser;
  profileForm: FormGroup;

  previewImg = signal<string | null>(null);
  isSubmitting = signal(false);

  constructor() {
    this.profileForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      fotoURL: [''] 
    });

    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.profileForm.patchValue(user);
        this.previewImg.set(user.fotoURL || null);
        this.profileForm.markAsPristine();
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        this.notificationService.showAlertError('Archivo muy grande', 'La imagen no debe superar 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        this.previewImg.set(result);
        this.profileForm.patchValue({ fotoURL: result });
        this.profileForm.markAsDirty();
      };
    }
  }

  removePhoto(): void {
    this.previewImg.set(null);
    this.profileForm.patchValue({ fotoURL: null });
    this.profileForm.markAsDirty();
  }

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid || !this.profileForm.dirty) {
      return;
    }
    const user = this.currentUser();
    if (!user) return;

    this.isSubmitting.set(true);

    const formValue = this.profileForm.getRawValue();
    const dataToUpdate: Partial<User> = {};

    if (formValue.nombre !== user.nombre) {
      dataToUpdate.nombre = formValue.nombre;
    }
    if (formValue.apellido !== user.apellido) {
      dataToUpdate.apellido = formValue.apellido;
    }
    if (formValue.fotoURL !== user.fotoURL) {
      dataToUpdate.fotoURL = formValue.fotoURL; 
    }
    
    try {
      if (Object.keys(dataToUpdate).length > 0) {
        await this.userService.updateUser(user.uid, dataToUpdate);
        await this.authService.refreshUserProfile();

        this.notificationService.showAlertSuccess('Perfil Actualizado', 'Tus datos se guardaron correctamente.');
        this.profileForm.markAsPristine();
      } else {

        this.notificationService.showAlertWarning('Sin cambios', 'No se detectaron cambios para guardar.');
      }
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      this.notificationService.showAlertError('Error', 'Hubo un problema al actualizar tu perfil.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}