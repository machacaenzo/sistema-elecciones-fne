import { Timestamp } from '@angular/fire/firestore';


export type EstadoEleccion = 'Configuracion' | 'Activa' | 'Finalizada' | 'Publicada';

export interface Eleccion {
  id?: string;
  nombre: string;
  fechaInicio: Timestamp;
  fechaFin: Timestamp;
  estado: EstadoEleccion;


  // Guardará los nombres de los puestos a premiar. Ej: ["Reina", "1ra Princesa", "2da Princesa"]
  puestos: string[];

  // Guardará los criterios de evaluación. Ej: ["Belleza", "Elegancia", "Cultura General"]
  criterios: string[];

  // Guardará los campos extra para el perfil de la candidata. Ej: ["Hobby", "Frase Inspiradora"]
  camposCandidata: string[];
}
