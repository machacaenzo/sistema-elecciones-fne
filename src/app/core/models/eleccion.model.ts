import { Timestamp } from '@angular/fire/firestore';

export type EstadoEleccion = 'Configuracion' | 'Activa' | 'Finalizada' | 'Publicada';

export interface Eleccion {
  id?: string;
  nombre: string;                     // Ej: "Elección Representantes 2026"
  fechaEvento: Timestamp;             // Fecha única de la noche de gala
  estado: EstadoEleccion;

  // Puestos oficiales por categoría
  puestosFemeninos: string[];        // Ej: ["Embajadora", "1ra Princesa", "2da Princesa", "1ra Dama de Honor", "2da Dama de Honor", "Miss Elegancia", "Miss Simpatía"]
  puestosMasculinos: string[];       // Ej: ["Embajador", "1er Paje", "2do Paje", "Paje Elegancia", "Paje Simpatía"]

  // Criterios de evaluación individuales
  criteriosFemeninos: string[];      // Ej: ["Elegancia", "Porte", "Simpatía", "Pasarela"]
  criteriosMasculinos: string[];     // Ej: ["Actitud", "Desenvolvimiento", "Simpatía", "Pasarela"]

  // Preguntas de información adicional
  camposCandidata: string[];         // Ej: ["Hobbies", "Mensaje a la Juventud"]

  // Campos opcionales por compatibilidad
  fechaInicio?: Timestamp;
  fechaFin?: Timestamp;
  puestos?: string[];
  criterios?: string[];
}
