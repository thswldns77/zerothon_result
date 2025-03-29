import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore,increment } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBcYRqmRjtNtLcbXYv2pZ9RXxKciqrN2Pg",
    authDomain: "cafecup-c2ef5.firebaseapp.com",
    projectId: "cafecup-c2ef5",
    storageBucket: "cafecup-c2ef5.firebasestorage.app",
    messagingSenderId: "821150674766",
    appId: "1:821150674766:web:64ed5ead979503ee6c781f",
    measurementId: "G-TRT0C4DDC2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {auth, db};