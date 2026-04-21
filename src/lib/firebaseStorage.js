import { getApp, getApps, initializeApp } from "firebase/app";
import { getDownloadURL, getStorage, list, ref } from "firebase/storage";

const DEFAULT_BUCKET_URL = "gs://data-ok-b4091.firebasestorage.app";

const bucketEnv =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  process.env.VITE_FIREBASE_STORAGE_BUCKET ||
  DEFAULT_BUCKET_URL;
const bucketName = String(bucketEnv || "")
  .replace(/^gs:\/\//, "")
  .trim();
const bucketUrl = bucketName ? `gs://${bucketName}` : "";
const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  bucketName.split(".")[0] ||
  "";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    "",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "",
  projectId,
  storageBucket: bucketName,
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.VITE_FIREBASE_APP_ID ||
    "",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "",
};

const hasFirebaseStorageConfig = Boolean(bucketName);

let cachedStorage = null;

function getFirebaseStorageClient() {
  if (!hasFirebaseStorageConfig) return null;
  if (cachedStorage) return cachedStorage;

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  cachedStorage = getStorage(app, bucketUrl);
  return cachedStorage;
}

async function listFirebaseStorageImages({ path = "", maxResults = 80, pageToken } = {}) {
  const storage = getFirebaseStorageClient();
  if (!storage) {
    return { items: [], nextPageToken: null };
  }

  const normalizedPath = String(path || "").replace(/^\/+/, "");
  const listRef = ref(storage, normalizedPath);
  const response = await list(listRef, { maxResults, pageToken });

  const items = (
    await Promise.all(
      response.items.map(async (item) => {
        const fullPath = item.fullPath || item.name || "";
        if (!fullPath) return null;
        try {
          const imageSrc = await getDownloadURL(item);
          return {
            id: `firebase-${fullPath}`,
            name: item.name || fullPath,
            imageSrc,
            fullPath,
            createdAt: null,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter(Boolean);

  return {
    items,
    nextPageToken: response.nextPageToken || null,
  };
}

const firebaseStorageConfig = {
  ...firebaseConfig,
  bucketName,
  bucketUrl,
};

export { firebaseStorageConfig, hasFirebaseStorageConfig, listFirebaseStorageImages };
