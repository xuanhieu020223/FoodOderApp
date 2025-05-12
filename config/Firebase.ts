// Import các function cần thiết từ Firebase SDK
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Cấu hình Firebase 
const firebaseConfig = {
  apiKey: "AIzaSyCzMpCWZDpy62MSCgHGHxHMHIJZZOsyEyY",
  authDomain: "myfooddoor.firebaseapp.com",
  projectId: "myfooddoor",
  storageBucket: "myfooddoor.firebasestorage.app",
  messagingSenderId: "650981005430",
  appId: "1:650981005430:web:4db8e1ba373e002c862757",
  measurementId: "G-5J0LXT65PZ"
};

// Khởi tạo app
const app = initializeApp(firebaseConfig);

// Khởi tạo các service
const auth = getAuth(app);
const db = getFirestore(app);

// Xuất ra để dùng trong app
export { auth, db };
