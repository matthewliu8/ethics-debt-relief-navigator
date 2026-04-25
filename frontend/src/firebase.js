// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC6mflyotH1SR6eijvBc1lCEM9BnsQuQuM",
  authDomain: "junior-academy-4279b.firebaseapp.com",
  projectId: "junior-academy-4279b",
  storageBucket: "junior-academy-4279b.firebasestorage.app",
  messagingSenderId: "751287431961",
  appId: "1:751287431961:web:27415347ca262a96a8cb88",
  measurementId: "G-WB0Z368JHR"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, signInWithPopup, signOut, db };

