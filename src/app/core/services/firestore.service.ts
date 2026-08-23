import { inject, Injectable } from '@angular/core';
import { addDoc, collection, collectionData, deleteDoc, doc, DocumentData, DocumentReference, Firestore, getDoc, getDocs, query, QueryConstraint, setDoc, updateDoc, where, WhereFilterOp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore:Firestore=inject(Firestore);

  getCollectionByFilterArray<T>(path: string, fieldName: string, values: any[], operator: WhereFilterOp = 'in'): Observable<T[]> {
    const collectionRef = collection(this.firestore, path);
    const q = query(collectionRef, where(fieldName, operator, values));
    return collectionData(q, { idField: 'uid' }) as Observable<T[]>; 
  }

  getCollection<T>(path:string):Observable<T[]>{
    const collectionRef = collection(this.firestore, path);
    return collectionData(collectionRef, {idField:'id'} ) as Observable<T[]>;
  }

  async getDocumentById<T extends DocumentData>(path:string, docId:string):Promise<T | undefined>{
    const docRef = doc(this.firestore, path, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()?({id:docSnap.id, ...docSnap.data()}as T &{id:string}):undefined; 
  }

  async getDocument<T>(path:string, docId:string):Promise<T | undefined>{
    const docRef = doc(this.firestore, path, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()? ({id:docSnap.id, ...docSnap.data()} as T):undefined;
  }

  addDocument<T extends DocumentData>(path:string, data:T):Promise<DocumentReference>{
    const collectionRef = collection(this.firestore, path);
    return addDoc(collectionRef, data);
  }

  setDocument<T extends DocumentData>(path:string, docId:string, data:T):Promise<void>{
    const docRef = doc(this.firestore, path, docId) as DocumentReference<T>;
    return setDoc(docRef, data);
  }

  updateDocument<T>(path:string, docId:string, data:Partial<T>):Promise<void>{
    const docRef = doc(this.firestore, path, docId);

    return updateDoc(docRef, data as {[key:string]:any});
  }
  deleteDocument(path:string, docId:string):Promise<void>{
    const docRef = doc(this.firestore, path, docId);
    return deleteDoc(docRef);
  }

  getCollectionByFilter<T>(path:string, fieldName:string, value: any):Observable<T[]>{ 
    const collectionRef = collection(this.firestore, path);
    const q = query(collectionRef, where(fieldName,"==",value));
    return collectionData(q,{idField:'id'})as Observable<T[]>
  }

  async checkFieldExists(path:string, fieldName:string, value:any, excludeId?:string):Promise<boolean>{
    const collectionRef = collection(this.firestore, path);
    const q = query(collectionRef, where(fieldName, '==', value));

    const querySnapshot = await getDocs(q);
    if(excludeId){
      return querySnapshot.docs.some(doc => doc.id !== excludeId)
    }
    return !querySnapshot.empty; 
  }
  constructor() { }

  // En FirestoreService
getCollectionByFilterWithQueries<T>(path: string, constraints: QueryConstraint[]): Observable<T[]> {
  const collectionRef = collection(this.firestore, path);
  const q = query(collectionRef, ...constraints);
  return collectionData(q, { idField: 'id' }) as Observable<T[]>;
}
}
