import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private notificationService = inject(NotificacionService);

  currentUser = this.authService.currentUser;

  profileForm: FormGroup;
  previewImg = signal<string | null>(null);
  isSubmitting = signal(false);
  nuevaFotoBase64: string | null = null;

  tipoCorona = signal<'REYNA' | 'REY'>('REYNA');

  constructor() {
    this.profileForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]]
    });

    // EFFECT: Pre-carga los datos de forma reactiva en cuanto Firebase responde
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.profileForm.patchValue({
          nombre: user.nombre || '',
          apellido: user.apellido || ''
        }, { emitEvent: false });

        if (!this.nuevaFotoBase64) {
          this.previewImg.set(user.fotoURL || null);
        }
      }
    });
  }

  ngOnInit(): void {
    const coronaGuardada = localStorage.getItem('user_emblema_corona') as 'REYNA' | 'REY';
    if (coronaGuardada) {
      this.tipoCorona.set(coronaGuardada);
    }
  }

  toggleCorona(): void {
    const nueva: 'REYNA' | 'REY' = (this.tipoCorona() === 'REYNA') ? 'REY' : 'REYNA';
    this.tipoCorona.set(nueva);
    localStorage.setItem('user_emblema_corona', nueva);
  }

  private compressImage(file: File, maxWidth = 500, quality = 0.75): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = err => reject(err);
      };
      reader.onerror = err => reject(err);
    });
  }

  async onFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressed = await this.compressImage(file, 500, 0.75);
        this.previewImg.set(compressed);
        this.nuevaFotoBase64 = compressed;
        this.profileForm.markAsDirty();
      } catch (error) {
        this.notificationService.showAlertError('Error', 'No se pudo procesar la foto.');
      }
    }
  }

  removePhoto(): void {
    this.previewImg.set(null);
    this.nuevaFotoBase64 = '';
    this.profileForm.markAsDirty();
  }

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid || this.isSubmitting()) return;

    const user = this.currentUser();
    if (!user || !user.uid) return;

    this.isSubmitting.set(true);

    try {
      const formVal = this.profileForm.value;
      const updates: Partial<User> = {
        nombre: formVal.nombre.trim(),
        apellido: formVal.apellido.trim()
      };

      if (this.nuevaFotoBase64 !== null) {
        updates.fotoURL = this.nuevaFotoBase64;
      }

      await this.userService.updateUser(user.uid, updates);
      await this.authService.refreshUserProfile();

      this.notificationService.showSuccessToast('Credencial actualizada con éxito');
      this.profileForm.markAsPristine();
      this.nuevaFotoBase64 = null;
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudieron guardar los cambios.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
