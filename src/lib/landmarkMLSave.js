"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { addDoc, collection, doc, getFirestore, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "data-ok-b4091.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Bangun objek JSON untuk ML dari data anotasi landmark.
 * Tambahkan koordinat ternormalisasi (0–1) agar model agnostik terhadap resolusi.
 */
export function buildMLPayload({ imageName, imageUrl, view, category, sideConditions, width, height, placed, effectiveLandmarks, notes, metadata = {} }) {
  const landmarks = {};

  effectiveLandmarks.forEach((lm) => {
    const coord = placed[lm.id];
    if (!coord) return;
    landmarks[lm.id] = {
      x:      coord.x,
      y:      coord.y,
      x_norm: width  > 0 ? parseFloat((coord.x / width ).toFixed(6)) : null,
      y_norm: height > 0 ? parseFloat((coord.y / height).toFixed(6)) : null,
      label:  lm.label,
      color:  lm.color ?? null,
    };
  });

  return {
    image:           imageName || "image.jpg",
    image_url:       imageUrl  || null,
    view,
    category,
    ...(sideConditions && { side_conditions: sideConditions }),
    image_size:      { width, height },
    landmarks,
    landmark_count:  Object.keys(landmarks).length,
    // ── ML Metadata ──────────────────────────────────────────────────────
    image_quality:     metadata.image_quality     ?? "bagus",
    patient_gender:    metadata.patient_gender     ?? "tidak_diketahui",
    patient_age_group: metadata.patient_age_group  ?? null,
    diagnoses:         metadata.diagnoses          ?? [],
    // ────────────────────────────────────────────────────────────────────
    notes:           (notes || "").trim(),
    annotated_at:    new Date().toISOString().split("T")[0],
  };
}

/**
 * Upload gambar X-ray ke Firebase Storage, lalu simpan payload ML ke Firestore.
 * Mengembalikan { docId, imageUrl }.
 */
export async function saveToFirebase({ imageSrc, imageName, mlPayload }) {
  const app  = getFirebaseApp();
  const auth = getAuth(app);

  // Login anonim otomatis agar memenuhi rule "request.auth != null"
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  const storage = getStorage(app);
  const db      = getFirestore(app);

  // ── 1. Upload gambar ke Storage ──────────────────────────────────────────
  let imageUrl = null;
  let storagePath = null;

  if (imageSrc) {
    // Fetch blob dari imageSrc (bisa data-URL, blob-URL, atau http URL)
    const resp = await fetch(imageSrc);
    const blob = await resp.blob();

    const ext      = (imageName || "image.jpg").split(".").pop() || "jpg";
    const baseName = (imageName || "image").replace(/\.[^.]+$/, "");
    const date     = new Date().toISOString().split("T")[0];
    storagePath    = `ml_landmarks/${mlPayload.view}/${date}/${baseName}_${Date.now()}.${ext}`;

    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType: blob.type || `image/${ext}` });
    imageUrl = await getDownloadURL(storageRef);
  }

  // ── 2. Simpan JSON ke Firestore ──────────────────────────────────────────
  const finalPayload = {
    ...mlPayload,
    image_url:    imageUrl,
    storage_path: storagePath,
    saved_at:     serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "ml_annotations"), finalPayload);

  return { docId: docRef.id, imageUrl };
}

/**
 * Update dokumen yang sudah ada di Firestore (mode edit).
 * Jika imageSrc baru diberikan, upload ulang ke Storage dan perbarui image_url.
 */
export async function updateFirebaseDoc({ docId, imageSrc, imageName, mlPayload }) {
  const app  = getFirebaseApp();
  const auth = getAuth(app);
  if (!auth.currentUser) await signInAnonymously(auth);

  const storage = getStorage(app);
  const db      = getFirestore(app);

  let imageUrl    = mlPayload.image_url ?? null;
  let storagePath = mlPayload.storage_path ?? null;

  if (imageSrc && !imageSrc.startsWith("https://firebasestorage")) {
    const resp = await fetch(imageSrc);
    const blob = await resp.blob();
    const ext      = (imageName || "image.jpg").split(".").pop() || "jpg";
    const baseName = (imageName || "image").replace(/\.[^.]+$/, "");
    const date     = new Date().toISOString().split("T")[0];
    storagePath    = `ml_landmarks/${mlPayload.view}/${date}/${baseName}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType: blob.type || `image/${ext}` });
    imageUrl = await getDownloadURL(storageRef);
  }

  const updates = {
    ...mlPayload,
    image_url:    imageUrl,
    storage_path: storagePath,
    updated_at:   serverTimestamp(),
  };

  await updateDoc(doc(db, "ml_annotations", docId), updates);
  return { docId, imageUrl };
}
