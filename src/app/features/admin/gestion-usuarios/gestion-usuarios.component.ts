import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { UserService } from '../../../core/services/user.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { User, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.scss']
})
export class GestionUsuariosComponent implements OnInit {
  private userService = inject(UserService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);

  // Signals de Datos y Filtros
  users = signal<User[]>([]);
  isLoading = signal(true);
  searchText = signal<string>('');
  rolFilter = signal<UserRole | ''>('');
  showInactive = signal<boolean>(false);

  // Signals de Modal y Formulario
  isModalVisible = signal(false);
  isEditMode = signal(false);
  selectedUserId = signal<string | null>(null);
  imagePreview = signal<string | null>(null);

  userForm: FormGroup;

  // Lista Reactiva Filtrada por Búsqueda, Rol y Estado Activo
  filteredUsers = computed(() => {
    const query = this.searchText().toLowerCase().trim();
    const rol = this.rolFilter();
    const verInactivos = this.showInactive();

    return this.users().filter(user => {
      // Filtro de activos / inactivos
      if (!verInactivos && !user.EsActivo) return false;

      // Filtro por Rol
      if (rol && user.rol !== rol) return false;

      // Filtro por Nombre, Apellido o Email
      if (query) {
        const nombreCompleto = `${user.nombre} ${user.apellido}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return nombreCompleto.includes(query) || email.includes(query);
      }

      return true;
    });
  });

  constructor() {
    this.userForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      rol: ['Jurado' as UserRole, Validators.required],
      fotoURL: [''],
      imagenBase64: [null],
      EsActivo: [true]
    });
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showAlertError('Error', 'No se pudieron cargar los usuarios.');
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
  }

  onRolChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as UserRole | '';
    this.rolFilter.set(value);
  }

  toggleShowInactive(): void {
    this.showInactive.update(val => !val);
  }

  openEditModal(user: User): void {
    this.isEditMode.set(true);
    this.selectedUserId.set(user.uid);
    this.userForm.reset(user);
    this.userForm.get('email')?.disable();
    this.imagePreview.set(user.fotoURL || 'assets/user-default.jpg');
    this.isModalVisible.set(true);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        this.imagePreview.set(result);
        this.userForm.patchValue({ imagenBase64: result, fotoURL: '' });
        this.userForm.markAsDirty();
      };
    }
  }

  removeImage(): void {
    this.imagePreview.set('assets/user-default.jpg');
    this.userForm.patchValue({
      imagenBase64: null,
      fotoURL: ''
    });
    this.userForm.markAsDirty();
  }

  closeModal(): void {
    this.isModalVisible.set(false);
    this.imagePreview.set(null);
    this.userForm.get('imagenBase64')?.setValue(null);
  }

  async saveChanges(): Promise<void> {
    if (this.userForm.invalid) {
      this.notificationService.showAlertWarning('Formulario Incompleto', 'Por favor completá los campos requeridos.');
      return;
    }

    const formData = this.userForm.getRawValue();
    const userId = this.selectedUserId();
    if (!userId) return;

    try {
      let finalFotoURL = formData.fotoURL;
      if (formData.imagenBase64) {
        finalFotoURL = this.imagePreview();
      }

      const userData: Partial<User> = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        rol: formData.rol,
        EsActivo: formData.EsActivo,
        fotoURL: finalFotoURL
      };

      await this.userService.updateUser(userId, userData);
      this.notificationService.showSuccessToast('Usuario actualizado con éxito');
      this.closeModal();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudieron guardar los cambios.');
    }
  }

  async toggleUserStatus(user: User): Promise<void> {
    const nuevoEstado = !user.EsActivo;
    const accion = nuevoEstado ? 'habilitar' : 'deshabilitar';

    const result = await this.notificationService.showConfirm(
      `¿${nuevoEstado ? 'Habilitar' : 'Deshabilitar'} acceso?`,
      `El usuario ${user.nombre} ${user.apellido} quedará ${nuevoEstado ? 'activo para votar' : 'inactivo'}.`,
      `Sí, ${accion}`
    );

    if (result.isConfirmed) {
      try {
        await this.userService.updateUser(user.uid, { EsActivo: nuevoEstado });
        this.notificationService.showSuccessToast(`Usuario ${nuevoEstado ? 'habilitado' : 'deshabilitado'}`);
      } catch (error) {
        this.notificationService.showAlertError('Error', `No se pudo ${accion} al usuario.`);
      }
    }
  }
}
