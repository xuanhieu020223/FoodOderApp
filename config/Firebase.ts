// Import các function cần thiết từ Firebase SDK
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Cấu hình Firebase 
const firebaseConfig = {
  apiKey: 'AIzaSyDENpoUZ7bvbYUw58QVOk0F6d2ZTYARXEw',
  authDomain: 'myfoodapp-412bd.firebaseapp.com',
  projectId: 'myfoodapp-412bd',
  storageBucket: 'myfoodapp-412bd.appspot.com',
  messagingSenderId: '1065217426765',
  appId: '1:1065217426765:web:6bf3f4511ef23aa6bd2304',
  measurementId: 'G-SSTPZP1D6P', 
};

// Khởi tạo app
const app = initializeApp(firebaseConfig);

// Khởi tạo các service
const auth = getAuth(app);
const db = getFirestore(app);

// Xuất ra để dùng trong app
export { auth, db };
