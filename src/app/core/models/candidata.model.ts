export interface Candidata {
  id?: string;
  eleccionId: string;
  numeroCandidata?: number;
  nombre: string;
  apellido: string;
  dni: string;
  cursoDivision?: string;
  fotosURL?: string[];

  // Objeto para campos personalizados (Ej: { "Hobby": "Danza" })
  camposPersonalizados: { [key: string]: string };

  // Objeto para puntuaciones acumuladas
  puntuacionPorCriterio: { [key: string]: number };

  puntuacionTotal: number;
  cantidadDeVotos: number;
}
