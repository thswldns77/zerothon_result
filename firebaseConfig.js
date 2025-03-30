import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore,increment } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyA57xWbnBddcfuHGDOqKnzye_-X50EOW1o",
    authDomain: "recycup-62d45.firebaseapp.com",
    projectId: "recycup-62d45",
    storageBucket: "recycup-62d45.firebasestorage.app",
    messagingSenderId: "740536853370",
    appId: "1:740536853370:web:6c7c4f8c8c6d6fabe62cc3",
    measurementId: "G-49DT74QLSF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {auth, db};