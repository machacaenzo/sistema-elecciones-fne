import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Candidata } from '../../../core/models/candidata.model';
import { DocumentReference } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class CandidataService {
  private firestoreService: FirestoreService = inject(FirestoreService);
  private collectionPath = 'candidatas';

  getCandidatasPorEleccion(eleccionId: string): Observable<Candidata[]> {
    return this.firestoreService.getCollectionByFilter<Candidata>(this.collectionPath, 'eleccionId', eleccionId);
  }


  createCandidata(data: Omit<Candidata, 'id'>): Promise<DocumentReference> {
    return this.firestoreService.addDocument(this.collectionPath, data);
  }

  updateCandidata(id: string, data: Partial<Candidata>): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, id, data);
  }

  deleteCandidata(id: string): Promise<void> {
    return this.firestoreService.deleteDocument(this.collectionPath, id);
  }
}
