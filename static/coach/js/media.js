// Foto's bij een blok. Die zijn te groot voor localStorage, dus ze staan in
// IndexedDB (ook in de browser, ook alleen op dit toestel). Een blok bewaart
// alleen het nummer van zijn foto (`photoId`).

const DB = "coach-timer-media";
const STORE = "photos";

let opened;
function db() {
  opened ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opened;
}

function run(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  }));
}

export const putPhoto = (id, blob) => run("readwrite", (s) => s.put(blob, id));
export const getPhoto = (id) => run("readonly", (s) => s.get(id));
const deletePhoto = (id) => run("readwrite", (s) => s.delete(id));
const allIds = () => run("readonly", (s) => s.getAllKeys());

/** Verkleint een foto tot hooguit `max` pixels breed of hoog, als JPEG. */
export async function compress(file, max = 1600, quality = 0.75) {
  let source;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Deze afbeelding kan ik niet openen."));
      img.src = URL.createObjectURL(file);
    });
  }
  const w = source.width, h = source.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

const urls = new Map();

/** Een adres om de foto te tonen, of null als ze er niet (meer) is. */
export async function photoURL(id) {
  if (urls.has(id)) return urls.get(id);
  const blob = await getPhoto(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

/** Vult elke <img data-photo="…"> in dit stuk van de pagina. */
export function hydrate(root) {
  for (const img of root.querySelectorAll("img[data-photo]")) {
    photoURL(img.dataset.photo).then((url) => { if (url) img.src = url; }).catch(() => {});
  }
}

/** Ruimt foto's op die bij geen enkel blok meer horen. */
export async function prune(keep) {
  try {
    for (const id of await allIds()) {
      if (!keep.has(id)) {
        await deletePhoto(id);
        urls.delete(id);
      }
    }
  } catch { /* opruimen mag mislukken */ }
}

// MARK: - Voor de back-up

const toDataURL = (blob) => new Promise((resolve) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.readAsDataURL(blob);
});

export async function exportPhotos(ids) {
  const out = {};
  for (const id of ids) {
    const blob = await getPhoto(id).catch(() => null);
    if (blob) out[id] = await toDataURL(blob);
  }
  return out;
}

export async function importPhotos(media) {
  for (const [id, dataURL] of Object.entries(media ?? {})) {
    const blob = await (await fetch(dataURL)).blob();
    await putPhoto(id, blob);
    urls.delete(id);
  }
}
