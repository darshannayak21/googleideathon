  import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzuTEaCJc__qCKBj_331Wbu5FF2f0dx8w",
  authDomain: "darshanideathon.firebaseapp.com",
  projectId: "darshanideathon",
  storageBucket: "darshanideathon.firebasestorage.app",
  messagingSenderId: "1030590724516",
  appId: "1:1030590724516:web:adab8189a0b41683442931",
  measurementId: "G-0PZWBT22N5",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
