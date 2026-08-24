import { inject, Injectable } from '@angular/core';
import { Firestore, doc, runTransaction, serverTimestamp } from '@angular/fire/firestore';

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

  async submitVoto(eleccionId: string, userId: string, evaluaciones: EvaluacionPayload[]) {
    const votoDocRef = doc(this.firestore, `votos_jurados/voto_${eleccionId}_${userId}`);
    const userDocRef = doc(this.firestore, `users/${userId}`);

    // Ejecutamos la transacción
    return runTransaction(this.firestore, async (transaction) => {
      
      // ==========================================================
      // PASO 1: TODAS LAS LECTURAS (READS) PRIMERO
      // ==========================================================
      
      // 1. Leer el documento de votos del jurado
      const votoSnap = await transaction.get(votoDocRef);
      
      // 2. Leer el documento del usuario
      const userSnap = await transaction.get(userDocRef);

      // 3. Leer los documentos de TODOS los candidatos de esta tanda
      const candidatosData = [];
      for (const evalData of evaluaciones) {
        const ref = doc(this.firestore, `candidatas/${evalData.candidataId}`);
        const snap = await transaction.get(ref);
        candidatosData.push({ ref, snap, evalData });
      }

      // ==========================================================
      // PASO 2: TODAS LAS ESCRITURAS (WRITES) AL FINAL
      // ==========================================================

      // A. Actualizar puntajes de candidatos
      for (const item of candidatosData) {
        if (item.snap.exists()) {
          const data = item.snap.data();
          const anteriorPorCriterio = data['puntuacionPorCriterio'] || {};
          
          transaction.update(item.ref, {
            puntuacionTotal: (data['puntuacionTotal'] || 0) + item.evalData.puntuacion,
            cantidadDeVotos: (data['cantidadDeVotos'] || 0) + 1,
            puntuacionPorCriterio: this.mergeCriterios(anteriorPorCriterio, item.evalData.puntuacionPorCriterio)
          });
        }
      }

      // B. Actualizar el registro del jurado (Unir tandas)
      if (!votoSnap.exists()) {
        transaction.set(votoDocRef, {
          eleccionId,
          juradoUid: userId,
          evaluaciones: evaluaciones,
          fecha: serverTimestamp()
        });
      } else {
        const evaluacionesPrevias = votoSnap.data()['evaluaciones'] || [];
        transaction.update(votoDocRef, {
          evaluaciones: [...evaluacionesPrevias, ...evaluaciones],
          fechaActualizacion: serverTimestamp()
        });
      }

      // C. Marcar elección como votada en el usuario
      if (userSnap.exists()) {
        const eleccionesVotadas = userSnap.data()['eleccionesVotadas'] || [];
        if (!eleccionesVotadas.includes(eleccionId)) {
          transaction.update(userDocRef, {
            eleccionesVotadas: [...eleccionesVotadas, eleccionId]
          });
        }
      }
    });
  }

  private mergeCriterios(existente: any, nuevos: any) {
    const res = { ...existente };
    for (const key in nuevos) {
      res[key] = (res[key] || 0) + nuevos[key];
    }
    return res;
  }
}