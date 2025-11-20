import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCzMpCWZDpy62MSCgHGHxHMHIJZZOsyEyY',
  authDomain: 'myfooddoor.firebaseapp.com',
  projectId: 'myfooddoor',
  storageBucket: 'myfooddoor.firebasestorage.app',
  messagingSenderId: '650981005430',
  appId: '1:650981005430:web:4db8e1ba373e002c862757',
  measurementId: 'G-5J0LXT65PZ',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

