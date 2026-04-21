import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const DEFAULT_BUCKET = "data-ok-b4091.firebasestorage.app";

function normalizeBucket(bucketInput) {
  const raw = String(bucketInput || "").trim();
  if (!raw) return "";
  return raw.replace(/^gs:\/\//, "");
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getServiceAccountFromEnv() {
  const directJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;
  if (directJson) {
    const parsed = parseJsonSafe(directJson);
    if (parsed) return parsed;
  }

  const base64Json = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Json) {
    const decoded = Buffer.from(base64Json, "base64").toString("utf8");
    const parsed = parseJsonSafe(decoded);
    if (parsed) return parsed;
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath) {
    try {
      const absolutePath = filePath.startsWith("/")
        ? filePath
        : resolve(process.cwd(), filePath);
      const fileContent = readFileSync(absolutePath, "utf8");
      const parsed = parseJsonSafe(fileContent);
      if (parsed) return parsed;
    } catch {
      // ignore path errors; fallback to field-based env
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  return null;
}

const storageBucket = normalizeBucket(
  process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    DEFAULT_BUCKET,
);

const databaseURL =
  process.env.FIREBASE_DATABASE_URL ||
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  process.env.VITE_FIREBASE_DATABASE_URL ||
  "";

const serviceAccount = getServiceAccountFromEnv();
const hasFirebaseAdminConfig = Boolean(serviceAccount && storageBucket);

function getFirebaseAdminApp() {
  if (!hasFirebaseAdminConfig) return null;
  if (getApps().length > 0) return getApps()[0];

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket,
    ...(databaseURL ? { databaseURL } : {}),
  });
}

function getFirebaseAdminStorageBucket() {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return getStorage(app).bucket(storageBucket);
}

const firebaseAdminConfig = {
  hasFirebaseAdminConfig,
  storageBucket,
  databaseURL,
};

export {
  firebaseAdminConfig,
  getFirebaseAdminApp,
  getFirebaseAdminStorageBucket,
  hasFirebaseAdminConfig,
};
