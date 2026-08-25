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

  async submitVoto(
    eleccionId: string,
    userId: string,
    categoria: 'Embajadora' | 'Embajador',
    evaluaciones: EvaluacionPayload[],
    esUltimaTanda: boolean = false
  ): Promise<void> {
    // 1. Documento oficial del acta firmada por tanda
    const votoDocRef = doc(this.firestore, `votos_jurados/voto_${eleccionId}_${userId}_${categoria}`);
    const userDocRef = doc(this.firestore, `users/${userId}`);

    return runTransaction(this.firestore, async (transaction) => {

      // ==========================================================
      // FASE 1: TODAS LAS LECTURAS (READS) PRIMERO
      // ==========================================================
      const votoSnap = await transaction.get(votoDocRef);
      const userSnap = await transaction.get(userDocRef);

      // Verificación de seguridad: Si ya firmó esta tanda, frena
      if (votoSnap.exists()) {
        throw new Error(`Ya has firmado y enviado el acta oficial de ${categoria}s.`);
      }

      // Leer los documentos de todos los candidatos evaluados en esta tanda
      const candidatosData = [];
      for (const evalData of evaluaciones) {
        const ref = doc(this.firestore, `candidatas/${evalData.candidataId}`);
        const snap = await transaction.get(ref);
        candidatosData.push({ ref, snap, evalData });
      }

      // ==========================================================
      // FASE 2: TODAS LAS ESCRITURAS (WRITES)
      // ==========================================================

      // A. Sumar puntos y votos a cada candidata/o
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

      // B. Guardar el acta oficial inalterable con fecha y firma digital
      transaction.set(votoDocRef, {
        eleccionId,
        juradoUid: userId,
        categoria,
        evaluaciones,
        fechaFirma: serverTimestamp()
      });

     // C. Actualizar el registro del usuario
if (userSnap.exists()) {
  const userData = userSnap.data();
  const tandasVotadas = userData['tandasVotadas'] || [];
  const tandaTag = `${eleccionId}_${categoria}`;

  const updates: any = {};
  const nuevasTandas = tandasVotadas.includes(tandaTag)
    ? tandasVotadas
    : [...tandasVotadas, tandaTag];

  updates.tandasVotadas = nuevasTandas;

  // COMPROBACIÓN REAL: Solo si ya firmó Embajadora Y Embajador se agrega a eleccionesVotadas
  const tieneAmbas = nuevasTandas.includes(`${eleccionId}_Embajadora`) &&
                     nuevasTandas.includes(`${eleccionId}_Embajador`);

  if (tieneAmbas || esUltimaTanda) {
    const eleccionesVotadas = userData['eleccionesVotadas'] || [];
    if (!eleccionesVotadas.includes(eleccionId)) {
      updates.eleccionesVotadas = [...eleccionesVotadas, eleccionId];
    }
  }

  transaction.update(userDocRef, updates);
}
    });
  }

  // Suma los puntajes de cada criterio de forma segura
  private mergeCriterios(existente: any, nuevos: any) {
    const res = { ...existente };
    for (const key in nuevos) {
      res[key] = (res[key] || 0) + (nuevos[key] || 0);
    }
    return res;
  }


}
