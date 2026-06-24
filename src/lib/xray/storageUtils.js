// IDB storage utilities for XrayCalibrationWorkspace

const IMAGE_IDB_NAME = "zakzav_workspace";
const IMAGE_IDB_STORE = "last_image";
const IMAGE_IDB_KEY = "main";
const CUT_LAYER_IDB_STORE = "cut_layer_images";

export function openImageIDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no idb")); return; }
    const req = indexedDB.open(IMAGE_IDB_NAME, 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IMAGE_IDB_STORE)) {
        db.createObjectStore(IMAGE_IDB_STORE);
      }
      if (!db.objectStoreNames.contains(CUT_LAYER_IDB_STORE)) {
        db.createObjectStore(CUT_LAYER_IDB_STORE);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCutLayersToIDB(cutLayers) {
  try {
    const layers = (cutLayers || []).filter(
      (l) => l.kind === "free-cut" && l.imageSrc && l.imageSrc.startsWith("data:")
    );
    if (!layers.length) return;
    const db = await openImageIDB();
    await new Promise((resolve) => {
      const tx = db.transaction(CUT_LAYER_IDB_STORE, "readwrite");
      const store = tx.objectStore(CUT_LAYER_IDB_STORE);
      layers.forEach((l) => store.put({ imageSrc: l.imageSrc, maskPoints: l.maskPoints }, String(l.id)));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* silent fail */ }
}

export async function loadCutLayerFromIDB(layerId) {
  try {
    const db = await openImageIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CUT_LAYER_IDB_STORE, "readonly");
      const req = tx.objectStore(CUT_LAYER_IDB_STORE).get(String(layerId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function clearCutLayersFromIDB(keepIds) {
  try {
    const db = await openImageIDB();
    await new Promise((resolve) => {
      const tx = db.transaction(CUT_LAYER_IDB_STORE, "readwrite");
      const store = tx.objectStore(CUT_LAYER_IDB_STORE);
      const keep = new Set((keepIds || []).map(String));
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) return;
        if (!keep.has(String(cursor.key))) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* silent fail */ }
}

export async function saveImageToIDB(dataUrl, name) {
  try {
    const db = await openImageIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IMAGE_IDB_STORE, "readwrite");
      tx.objectStore(IMAGE_IDB_STORE).put({ dataUrl, name }, IMAGE_IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* silent fail */ }
}

export async function loadImageFromIDB() {
  try {
    const db = await openImageIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IMAGE_IDB_STORE, "readonly");
      const req = tx.objectStore(IMAGE_IDB_STORE).get(IMAGE_IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function clearImageFromIDB() {
  try {
    const db = await openImageIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IMAGE_IDB_STORE, "readwrite");
      tx.objectStore(IMAGE_IDB_STORE).delete(IMAGE_IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* silent fail */ }
}
