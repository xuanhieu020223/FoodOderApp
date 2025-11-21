import { collection, getDocs, orderBy, query } from 'firebase/firestore';
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

