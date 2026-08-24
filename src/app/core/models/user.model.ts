export type UserRole = 'Administrador' | 'Jurado' | 'Pendiente';

export interface User {
  uid: string;
  email: string;
  nombre: string;
  apellido: string;
  fotoURL?: string;
  emailVerificado?: boolean;
  rol: UserRole;
  EsActivo?: boolean;
  dni?: string;
  eleccionesVotadas?: string[];
}
