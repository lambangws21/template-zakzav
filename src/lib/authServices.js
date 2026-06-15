import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseClient";

export { auth, db };

export async function signInWithEmail(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err) {
    return { user: null, error: err.message };
  }
}

export async function signUpWithEmail(email, password) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      status: "pending",
      createdAt: new Date(),
    });

    // Kirim notifikasi email ke admin (fire and forget)
    fetch("/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.uid, email: user.email }),
    }).catch(() => {});

    return { user, error: null };
  } catch (err) {
    return { user: null, error: err.message };
  }
}

export function logOut() {
  return signOut(auth);
}
