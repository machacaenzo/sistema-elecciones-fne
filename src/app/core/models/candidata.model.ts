export type CategoriaParticipante = 'Embajadora' | 'Embajador' | 'Paje';

export interface Candidata {
  id?: string;
  eleccionId: string;
  
  // Número de pasada (#01, #02) y Categoría
  numero?: number;
  numeroCandidata?: number; // Para compatibilidad
  categoria?: CategoriaParticipante;
  
  nombre: string;
  apellido: string;
  dni?: string;
  cursoDivision?: string;
  fotosURL?: string[];

  // Campos personalizados (Hobbies, proyectos)
  camposPersonalizados?: { [key: string]: string };

  // Puntuaciones
  puntuacionPorCriterio?: { [key: string]: number };
  puntuacionTotal: number;
  cantidadDeVotos: number;
}