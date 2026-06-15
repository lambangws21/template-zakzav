import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCwN90oQItu1fx88mFwR11zA6f_Egz8sgU",
  authDomain: "data-ok-b4091.firebaseapp.com",
  projectId: "data-ok-b4091",
  storageBucket: "data-ok-b4091.firebasestorage.app",
  messagingSenderId: "525002375108",
  appId: "1:525002375108:web:8f54dfaa2526b1e795ae91",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
