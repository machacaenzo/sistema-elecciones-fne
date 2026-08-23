
import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { User, UserRole } from '../models/user.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestoreService: FirestoreService = inject(FirestoreService);
  private collectionPath = 'users';

  createUser(user: User): Promise<void> {
    return this.firestoreService.setDocument(this.collectionPath, user.uid, user);
  }
  getUserById(uid: string): Promise<User | undefined> {
    return this.firestoreService.getDocumentById<User>(this.collectionPath, uid);
  }

  updateUser(uid: string, data: Partial<User>): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, uid, data);
  }

  deleteUser(uid: string): Promise<void> {
    return this.firestoreService.deleteDocument(this.collectionPath, uid);
  }

  getAllUsers(): Observable<User[]> {
    return this.firestoreService.getCollection<User>(this.collectionPath);
  }

  getAssignableUsers(): Observable<User[]> {
    return this.firestoreService.getCollectionByFilterArray(
      this.collectionPath,
      'rol', 
      ['Docente', 'Administrador'] 
    );
  }
  getUsersByRole(role: UserRole): Observable<User[]> {
    return this.firestoreService.getCollectionByFilter(this.collectionPath, 'rol', role);
  }
}
