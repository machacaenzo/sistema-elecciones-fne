import { Timestamp } from '@angular/fire/firestore';

export type EstadoEleccion = 'Configuracion' | 'Activa' | 'Finalizada' | 'Publicada';

export interface Eleccion {
  id?: string;
  nombre: string;
  fechaEvento: Timestamp;
  estado: EstadoEleccion;

  // Puestos oficiales por categoría
  puestosFemeninos: string[];
  puestosMasculinos: string[];

  // Criterios de evaluación individuales
  criteriosFemeninos: string[];
  criteriosMasculinos: string[];

  // Preguntas de información adicional
  camposCandidata: string[];

  // Jurados habilitados específicamente para esta gala
  juradosAsignados?: string[];

  // Campos opcionales por compatibilidad
  fechaInicio?: Timestamp;
  fechaFin?: Timestamp;
  puestos?: string[];
  criterios?: string[];
}
