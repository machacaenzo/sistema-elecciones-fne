import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { User, UserRole } from '../../../core/models/user.model';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule, MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.scss']
})
export class GestionUsuariosComponent implements OnInit, AfterViewInit {
  private userService = inject(UserService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);

  dataSource = new MatTableDataSource<User>();
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  userForm: FormGroup;
  isModalVisible = false;
  isEditMode = false;
  selectedUserId: string | null = null;
  imagePreview: string | null = null;

  private allUsers$ = this.userService.getAllUsers();
  public searchText$ = new BehaviorSubject<string>('');
  public rolFilter$ = new BehaviorSubject<UserRole | ''>('');
  public showInactive$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.userForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rol: ['Docente' as UserRole, Validators.required],
      fotoURL: [''],
      imagenBase64: [null],
      EsActivo: [true]
    });
  }

  ngOnInit(): void {
    combineLatest([
      this.allUsers$,
      this.searchText$,
      this.rolFilter$,
      this.showInactive$ 
    ]).pipe(
      map(([users, searchText, rol, showInactive]) => {
        const lowerCaseSearch = searchText.toLowerCase();
        const activeUsers = showInactive ? users : users.filter(user => user.EsActivo);

        return activeUsers.filter(user => {
          const searchMatch = (
            user.nombre.toLowerCase().includes(lowerCaseSearch) ||
            user.apellido.toLowerCase().includes(lowerCaseSearch) ||
            user.email.toLowerCase().includes(lowerCaseSearch)
          );
          const rolMatch = rol ? user.rol === rol : true;
          return searchMatch && rolMatch;
        });
      })
    ).subscribe(filteredUsers => {
      this.dataSource.data = filteredUsers;
      this.isLoading = false;
      if (this.paginator) {
        this.paginator.firstPage();
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  onSearchChange(event: Event) {
    this.searchText$.next((event.target as HTMLInputElement).value);
  }
  onRolChange(rol: UserRole | '') {
    this.rolFilter$.next(rol);
  }
  onShowInactiveChange(checked: boolean) {
    this.showInactive$.next(checked);
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.selectedUserId = user.uid;
    this.userForm.reset(user);
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('email')?.disable();
    this.imagePreview = user.fotoURL || 'assets/user-default.jpg';
    this.isModalVisible = true;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedUserId = null;
    this.userForm.reset({ EsActivo: true, rol: 'Docente' });
    this.userForm.get('email')?.enable();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.imagePreview = 'assets/user-default.jpg';
    this.isModalVisible = true;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.userForm.patchValue({ imagenBase64: this.imagePreview, fotoURL: '' });
        this.userForm.markAsDirty();
      };
    }
  }

  removeImage(): void {
    this.imagePreview = 'assets/user-default.jpg';
    this.userForm.patchValue({
      imagenBase64: null,
      fotoURL: '' 
    });
    this.userForm.markAsDirty();
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.imagePreview = null;
    this.userForm.get('imagenBase64')?.setValue(null);
  }

  async saveChanges(): Promise<void> {
    if (this.userForm.invalid) {
      this.notificationService.showAlertError('Formulario Inválido', 'Por favor, completa los campos requeridos.');
      return;
    }

    const formData = this.userForm.getRawValue();
    try {
      let finalFotoURL = this.isEditMode && !formData.imagenBase64 ? formData.fotoURL : '';

      if (formData.imagenBase64) {
        this.notificationService.showSuccessToast('Imagen actualizada (simulación)');
        finalFotoURL = this.imagePreview!;
      }

      const userData: Partial<User> = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        rol: formData.rol,
        EsActivo: formData.EsActivo,
        fotoURL: finalFotoURL
      };

      if (this.isEditMode && this.selectedUserId) {
        await this.userService.updateUser(this.selectedUserId, userData);
        this.notificationService.showSuccessToast('Usuario actualizado con éxito');
      } else {
        this.notificationService.showAlertError(
          'Función Deshabilitada', 'La creación de usuarios debe implementarse con Cloud Functions.'
        );
      }
      this.closeModal();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar los cambios.');
      console.error(error);
    }
  }

  async deleteUser(user: User): Promise<void> {
    const actionText = user.EsActivo ? 'desactivar' : 'eliminar permanentemente';
    const confirmText = user.EsActivo ? `¿Desactivar a ${user.nombre}?` : `¿Eliminar a ${user.nombre}?`;
    const messageText = user.EsActivo
      ? `El usuario será marcado como inactivo.`
      : `Esta acción no se puede deshacer.`;

    const result = await this.notificationService.showConfirm(confirmText, messageText, `Sí, ${actionText}`);

    if (result.isConfirmed) {
      try {
        if (user.EsActivo) {
          await this.userService.updateUser(user.uid, { EsActivo: false });
          this.notificationService.showSuccessToast('Usuario desactivado');
        } else {
          await this.userService.deleteUser(user.uid);
          this.notificationService.showSuccessToast('Usuario eliminado permanentemente');
        }
      } catch (error) {
        this.notificationService.showAlertError('Error', `No se pudo ${actionText} al usuario.`);
      }
    }
  }

  async restoreUser(user: User): Promise<void> {
    await this.userService.updateUser(user.uid, { EsActivo: true });
    this.notificationService.showSuccessToast('Usuario reactivado');
  }
}
