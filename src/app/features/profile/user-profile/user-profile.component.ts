import { Component, WritableSignal, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private notificationService = inject(NotificacionService);

  currentUser = this.authService.currentUser;
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
    if (this.profileForm.invalid || !this.profileForm.dirty) return;
    this.isSubmitting.set(true);
    const user = this.currentUser();
    if (!user) return;

    try {
      const formValue = this.profileForm.getRawValue();
      await this.userService.updateUser(user.uid, {
        nombre: formValue.nombre,
        apellido: formValue.apellido,
        fotoURL: formValue.fotoURL
      });
      await this.authService.refreshUserProfile();
      this.notificationService.showAlertSuccess('¡Perfil Actualizado!', 'Los cambios se guardaron con éxito.');
      this.profileForm.markAsPristine();
    } catch (e) {
      this.notificationService.showAlertError('Error', 'No se pudieron guardar los cambios.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}