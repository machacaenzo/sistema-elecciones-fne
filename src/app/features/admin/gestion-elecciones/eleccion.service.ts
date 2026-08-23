import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Eleccion, EstadoEleccion } from '../../../core/models/eleccion.model';
import { DocumentReference, Timestamp, where, QueryConstraint } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class EleccionService {
  private firestoreService: FirestoreService = inject(FirestoreService);
  private collectionPath = 'elecciones';

    getElecciones(): Observable<Eleccion[]> {
    return this.firestoreService.getCollection<Eleccion>(this.collectionPath);
  }

  createEleccion(data: Omit<Eleccion, 'id'>): Promise<DocumentReference> {
    return this.firestoreService.addDocument(this.collectionPath, data);
  }

  updateEleccion(id: string, data: Partial<Eleccion>): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, id, data);
  }

  deleteEleccion(id: string): Promise<void> {
    return this.firestoreService.deleteDocument(this.collectionPath, id);
  }

   getEleccionActiva(): Observable<Eleccion[]> {
    const now = Timestamp.now();
    const constraints: QueryConstraint[] = [
      where('estado', 'in', ['Activa', 'Finalizada']),
      where('fechaInicio', '<=', now)
    ];

    return this.firestoreService.getCollectionByFilterWithQueries<Eleccion>(this.collectionPath, constraints);
  }

  startEleccion(id: string): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, id, { estado: 'Activa' as EstadoEleccion });
  }


  finishEleccion(id: string): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, id, { estado: 'Finalizada' as EstadoEleccion });
  }
  getEleccionById(id: string): Promise<Eleccion | undefined> {
    return this.firestoreService.getDocumentById<Eleccion>(this.collectionPath, id);
  }

 
  publishEleccion(id: string): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, id, { estado: 'Publicada' as EstadoEleccion });
  }
}
