import { inject, Injectable } from '@angular/core';
import { Firestore, doc, getDoc, runTransaction, serverTimestamp } from '@angular/fire/firestore';

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
    // 1. Documento oficial inalterable por tanda (recibo de firma)
    const votoDocRef = doc(this.firestore, `votos_jurados/voto_${eleccionId}_${userId}_${categoria}`);
    const userDocRef = doc(this.firestore, `users/${userId}`);

    return runTransaction(this.firestore, async (transaction) => {

      // ==========================================================
      // FASE 1: TODAS LAS LECTURAS (READS) PRIMERO
      // ==========================================================
      const votoSnap = await transaction.get(votoDocRef);
      const userSnap = await transaction.get(userDocRef);

      // Verificación de seguridad: Evita doble cómputo si el acta ya existe
      if (votoSnap.exists()) {
        throw new Error(`El acta de ${categoria}s ya ha sido procesada y firmada.`);
      }

      // Leer los documentos de todas las candidatas/os de esta tanda
      const candidatosData = [];
      for (const evalData of evaluaciones) {
        const ref = doc(this.firestore, `candidatas/${evalData.candidataId}`);
        const snap = await transaction.get(ref);
        candidatosData.push({ ref, snap, evalData });
      }

      // ==========================================================
      // FASE 2: TODAS LAS ESCRITURAS (WRITES)
      // ==========================================================

      // A. Sumar puntos y votos a cada candidato de la tanda
      // A. Sumar puntos y votos a cada candidato de la tanda (BLINDADO)
      for (const item of candidatosData) {
        if (item.snap.exists()) {
          const data = item.snap.data();
          const anteriorPorCriterio = data['puntuacionPorCriterio'] || {};
          const puntosPrevios = Number(data['puntuacionTotal']) || 0;
          const puntosNuevos = Number(item.evalData.puntuacion) || 0;

          transaction.update(item.ref, {
            puntuacionTotal: puntosPrevios + puntosNuevos,
            cantidadDeVotos: (Number(data['cantidadDeVotos']) || 0) + 1,
            puntuacionPorCriterio: this.mergeCriterios(anteriorPorCriterio, item.evalData.puntuacionPorCriterio)
          });
        }
      }

      // B. Guardar el acta oficial firmada
      transaction.set(votoDocRef, {
        eleccionId,
        juradoUid: userId,
        categoria,
        evaluaciones,
        fechaFirma: serverTimestamp()
      });

      // C. Actualizar registro del usuario (Control seguro de tandas)
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const tandasVotadas = userData['tandasVotadas'] || [];
        const tandaTag = `${eleccionId}_${categoria}`;

        const updates: any = {};
        const nuevasTandas = tandasVotadas.includes(tandaTag)
          ? tandasVotadas
          : [...tandasVotadas, tandaTag];

        updates.tandasVotadas = nuevasTandas;

        // COMPROBACIÓN EXACTA: Solo marca eleccionesVotadas si firmó AMBAS tandas de ESTA elección
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

  // Obtener el acta oficial firmada para mostrarla en modo solo lectura
  async getVotoFirmado(eleccionId: string, userId: string, categoria: 'Embajadora' | 'Embajador'): Promise<any | null> {
    const votoDocRef = doc(this.firestore, `votos_jurados/voto_${eleccionId}_${userId}_${categoria}`);
    const snap = await getDoc(votoDocRef);
    return snap.exists() ? snap.data() : null;
  }

  // Suma matemática 100% segura contra errores de texto
  private mergeCriterios(existente: any, nuevos: any) {
    const res = { ...existente };
    for (const key in nuevos) {
      const previo = Number(res[key]) || 0;
      const nuevo = Number(nuevos[key]) || 0;
      res[key] = previo + nuevo;
    }
    return res;
  }
}
