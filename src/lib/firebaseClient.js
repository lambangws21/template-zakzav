import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !String(value || "").trim())
  .map(([key]) => key);

export let firebaseClientError = missingConfig.length > 0
  ? `Konfigurasi Firebase client belum lengkap: ${missingConfig.join(", ")}`
  : null;

// Client Components are also imported during prerender. Auth starts only in the browser.
export let auth = null;
export let db = null;
if (typeof window !== "undefined" && !firebaseClientError) {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    auth = null;
    db = null;
    firebaseClientError = `Firebase client gagal diinisialisasi: ${error.message}`;
  }
}

export function requireFirebaseAuth() {
  if (!auth || !db) {
    throw new Error(firebaseClientError || "Firebase Auth hanya tersedia di browser.");
  }
  return auth;
}
