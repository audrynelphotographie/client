import { db, collection, getDocs, getDoc, doc, setDoc, deleteDoc, serverTimestamp } from "./firebase-config.js";

const CLIENTS_COLLECTION = "clients";

function normalizeClient(raw = {}) {
  return {
    id: String(raw.id || "").trim().toLowerCase(),
    name: String(raw.name || ""),
    event: String(raw.event || ""),
    date: String(raw.date || ""),
    accessCode: String(raw.accessCode || ""),
    cover: String(raw.cover || ""),
    photos: Array.isArray(raw.photos) ? raw.photos.map(p => ({
      hd: String(p?.hd || p?.standard || ""),
      standard: String(p?.hd || p?.standard || "")
    })).filter(p => p.hd) : []
  };
}

export async function getAllClients() {
  const snap = await getDocs(collection(db, CLIENTS_COLLECTION));
  return snap.docs.map(item => normalizeClient({ id: item.id, ...item.data() }));
}

export async function getClient(clientId) {
  const id = String(clientId || "").trim().toLowerCase();
  if (!id) return null;
  const snap = await getDoc(doc(db, CLIENTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return normalizeClient({ id: snap.id, ...snap.data() });
}

export async function saveClient(client) {
  const normalized = normalizeClient(client);
  if (!normalized.id) throw new Error("Client slug is required.");
  await setDoc(doc(db, CLIENTS_COLLECTION, normalized.id), {
    ...normalized,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return normalized;
}

export async function removeClient(clientId) {
  const id = String(clientId || "").trim().toLowerCase();
  if (!id) return;
  await deleteDoc(doc(db, CLIENTS_COLLECTION, id));
}

export async function seedDefaultClients(defaultClients = []) {
  const existing = await getAllClients();
  if (existing.length || !Array.isArray(defaultClients) || !defaultClients.length) return existing;
  for (const client of defaultClients) await saveClient(client);
  return getAllClients();
}

export async function getActivity(limitCount = 100) {
  const snap = await getDocs(collection(db, "activity"));
  return snap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
    .slice(0, limitCount);
}

export async function addActivity(type, clientId = "", label = "") {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await setDoc(doc(db, "activity", id), {
    type,
    clientId,
    label,
    timestamp: new Date().toISOString(),
    createdAt: serverTimestamp()
  });
}
