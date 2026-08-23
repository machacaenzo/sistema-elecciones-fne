import { inject, Injectable } from '@angular/core';
import { Firestore, doc, runTransaction, DocumentReference, increment } from '@angular/fire/firestore';
import { User } from '../../core/models/user.model';
import { Candidata } from '../../core/models/candidata.model';


export interface EvaluacionPayload {
  candidataId: string;
  puntuacion: number;
  puntuacionPorCriterio: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class VotacionService {
  private firestore: Firestore = inject(Firestore);

  async submitVoto(eleccionId: string, userId: string, evaluaciones: EvaluacionPayload[]): Promise<void> {

    const userRef = doc(this.firestore, `users/${userId}`);

    return runTransaction(this.firestore, async (transaction) => {

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("El usuario no existe.");
      }
      const userData = userDoc.data() as User;
      if (userData.eleccionesVotadas?.includes(eleccionId)) {
        throw new Error("Este usuario ya ha votado en esta elección.");
      }


      const nuevasEleccionesVotadas = [...(userData.eleccionesVotadas || []), eleccionId];
      transaction.update(userRef, { eleccionesVotadas: nuevasEleccionesVotadas });

      for (const evaluacion of evaluaciones) {
        const candidataRef = doc(this.firestore, `candidatas/${evaluacion.candidataId}`);


        const updates: { [key: string]: any } = {
          puntuacionTotal: increment(evaluacion.puntuacion),
          cantidadDeVotos: increment(1)
        };

        for (const criterio in evaluacion.puntuacionPorCriterio) {
          updates[`puntuacionPorCriterio.${criterio}`] = increment(evaluacion.puntuacionPorCriterio[criterio]);
        }

        transaction.update(candidataRef, updates);
      }
    });
  }
}
