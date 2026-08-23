import { Timestamp } from '@angular/fire/firestore';

export interface VotoJurado {
  id?: string;
  eleccionId: string;
  juradoUid: string;
  juradoNombre: string;
  candidataId: string;
  candidataNumero: number;

  // Puntajes otorgados por criterio. Ej: { "Elegancia": 9, "Simpatía": 10 }
  puntajes: { [criterio: string]: number };
  totalPuntos: number;

  fecha: Timestamp;
}
