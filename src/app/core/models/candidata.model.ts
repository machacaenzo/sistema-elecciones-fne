export type CategoriaParticipante = 'Embajadora' | 'Embajador' ;

export interface Candidata {
  id?: string;
  eleccionId: string;

  // Datos clave de pasarela FNE
  numero: number;                     // N° de Pasada (1, 2, 3...)
  categoria: CategoriaParticipante;   // 'Embajadora' o 'Embajador'
  nombre: string;
  apellido: string;
  dni: string;
  cursoDivision: string;              // Ej: "5to 1ra Humanidades"
  fotosURL?: string[];

  // Preguntas del perfil (Hobbies, proyecto, etc.)
  camposPersonalizados?: { [key: string]: string };

  // Puntuación acumulada de jurados
  puntuacionPorCriterio?: { [key: string]: number };
  puntuacionTotal: number;
  cantidadDeVotos: number;
}
