import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type CategoryDoc = {
  id: string;
  name?: string;
  icon?: string;
  priority?: number;
};

export const fetchCategories = async (): Promise<CategoryDoc[]> => {
  const snap = await getDocs(query(collection(db, 'categories'), orderBy('priority', 'asc')));
  return snap.docs.map((docSnap) => ({
    ...(docSnap.data() as CategoryDoc),
    id: docSnap.id,
  }));
};

export const getCategoryById = async (id: string): Promise<CategoryDoc | null> => {
  const snap = await getDoc(doc(db, 'categories', id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as CategoryDoc), id: snap.id };
};

export const createCategory = async (data: Omit<CategoryDoc, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'categories'), data);
  return docRef.id;
};

export const updateCategory = async (id: string, data: Partial<CategoryDoc>): Promise<void> => {
  await updateDoc(doc(db, 'categories', id), data);
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'categories', id));
};

