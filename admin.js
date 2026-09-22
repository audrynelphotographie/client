/*
  AUDRY NEL PHOTOGRAPHY
  ADMIN PORTAL (Firebase Firestore Version)

  Username: Audrynel
  Code: carly62652177
*/

// 1. IMPORTATION DES MODULES FIREBASE VIA CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. VOTRE CONFIGURATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDpwM-DZfZnZRE1UGAEm52f6Fm3f2NoHAs",
  authDomain: "audrygalleries.firebaseapp.com",
  projectId: "audrygalleries",
  storageBucket: "audrygalleries.firebasestorage.app",
  messagingSenderId: "483605558937",
  appId: "1:483605558937:web:eaccccc23b8ebe7bf3ea08",
  measurementId: "G-PC0FP1BV57"
};

// Initialisation de Firebase et Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_USERNAME = "Audrynel";
const ADMIN_CODE = "carly62652177";
const ADMIN_SESSION_KEY = "audryNelAdminSessionV1";

// Cache local pour la synchronisation en temps réel
let localClientsCache = [];
let localActivityCache = [];

const $ = (s) => document.querySelector(s);

// Écouteur en temps réel pour l'activité
function subscribeToActivity() {
  const q = query(collection(db, "activity"), orderBy("timestamp", "desc"), limit(100));
  onSnapshot(q, (snapshot) => {
    localActivityCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderStats();
    renderActivity("#dashboardActivity", 8);
    renderActivity("#fullActivity", 100);
  });
}

// Écouteur en temps réel pour les clients
function subscribeToClients() {
  const clientsRef = collection(db, "clients");
  onSnapshot(clientsRef, (snapshot) => {
    localClientsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderStats();
    renderClientList($("#clientFilter")?.value || "");
  });
}

async function addActivity(type, clientId = "", label = "") {
  try {
    await addDoc(collection(db, "activity"), {
      type,
      clientId,
      label,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Erreur lors de l'enregistrement de l'activité :", e);
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function setSection(name) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.add("hidden"));
  $(`#section-${name}`)?.classList.remove("hidden");

  const titles = {
    dashboard: "Dashboard",
    clients: "Clients",
    create: "Create Gallery",
    activity: "Activity"
  };
  $("#pageTitle").textContent = titles[name] || "Dashboard";

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === name);
  });

  $("#sidebar")?.classList.remove("open");
}

function formatDate(date) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString();
}

function renderStats() {
  const photos = localClientsCache.reduce((sum, c) => sum + (c.photos?.length || 0), 0);

  $("#statClients").textContent = localClientsCache.length;
  $("#statGalleries").textContent = localClientsCache.length;
  $("#statPhotos").textContent = photos;
  $("#statActivity").textContent = localActivityCache.length;
}

function renderActivity(targetId, limitVal = 20) {
  const target = $(targetId);
  if (!target) return;

  const activity = localActivityCache.slice(0, limitVal);

  if (!activity.length) {
    target.innerHTML = `<div class="activity-item"><strong>No activity yet.</strong><span>—</span></div>`;
    return;
  }

  target.innerHTML = activity.map(item => {
    const client = localClientsCache.find(c => c.id === item.clientId);
    const name = client?.name || item.label || "Admin";
    const readable = (item.type || "").replaceAll("_", " ");
    return `
      <div class="activity-item">
        <strong>${escapeHTML(name)} — ${escapeHTML(readable)}</strong>
        <span>${escapeHTML(formatDate(item.timestamp))}</span>
      </div>
    `;
  }).join("");
}

function renderClientList(filter = "") {
  const target = $("#adminClientList");
  if (!target) return;

  const queryStr = filter.trim().toLowerCase();
  const clients = localClientsCache.filter(c =>
    !queryStr ||
    (c.name || "").toLowerCase().includes(queryStr) ||
    (c.event || "").toLowerCase().includes(queryStr) ||
    (c.id || "").toLowerCase().includes(queryStr)
  );

  if (!clients.length) {
    target.innerHTML = `<div class="activity-item"><strong>No clients found.</strong><span>—</span></div>`;
    return;
  }

  target.innerHTML = clients.map(c => `
    <article class="admin-client">
      <img src="${escapeHTML(c.cover || "")}" alt="${escapeHTML(c.name)}">
      <div>
        <h3>${escapeHTML(c.name)}</h3>
        <p>${escapeHTML(c.event || "Photography")} · ${escapeHTML(c.date || "")}</p>
        <p>${c.photos?.length || 0} photos · ${escapeHTML(c.id)}</p>
      </div>
      <div class="actions">
        <button class="ghost-btn" data-view="${escapeHTML(c.id)}">VIEW</button>
        <button class="ghost-btn" data-edit="${escapeHTML(c.id)}">EDIT</button>
        <button class="ghost-btn" data-copy="${escapeHTML(c.id)}">COPY LINK</button>
        <button class="danger" data-delete="${escapeHTML(c.id)}">DELETE</button>
      </div>
    </article>
  `).join("");
}

function resetForm() {
  $("#clientForm").reset();
  $("#editOriginalId").value = "";
  $("#formTitle").textContent = "Create Gallery";
  $("#photoRows").innerHTML = "";
  if ($("#bulkStandardLinks")) $("#bulkStandardLinks").value = "";
  addPhotoRow();
}

function addPhotoRow(photo = {hd:"", standard:""}) {
  const row = document.createElement("div");
  row.className = "photo-row";
  const url = photo.hd || photo.standard || "";
  row.innerHTML = `
    <input class="photo-hd" placeholder="ImgBB HD URL" value="${escapeHTML(url)}">
    <button type="button" class="photo-remove">REMOVE</button>
  `;
  row.querySelector(".photo-remove").onclick = () => row.remove();
  $("#photoRows").appendChild(row);
}

function readFormPhotos() {
  return [...document.querySelectorAll(".photo-row")]
    .map(row => {
      const url = row.querySelector(".photo-hd")?.value.trim();
      return url ? { hd: url, standard: url } : null;
    })
    .filter(Boolean);
}

function fillEdit(clientId) {
  const client = localClientsCache.find(c => c.id === clientId);
  if (!client) return;

  $("#editOriginalId").value = client.id;
  $("#clientName").value = client.name || "";
  $("#clientEvent").value = client.event || "";
  $("#clientDate").value = client.date || "";
  $("#clientSlug").value = client.id || "";
  $("#clientCode").value = client.accessCode || "";
  $("#clientCover").value = client.cover || "";
  $("#formTitle").textContent = "Edit Gallery";
  $("#photoRows").innerHTML = "";
  (client.photos || []).forEach(addPhotoRow);
  if (!client.photos?.length) addPhotoRow();

  setSection("create");
}

function galleryLink(clientId) {
  const url = new URL("./index.html", window.location.href);
  url.searchParams.set("client", clientId);
  return url.toString();
}

function handleLogin(e) {
  e.preventDefault();
  const username = $("#adminUsername").value.trim();
  const code = $("#adminCode").value;

  if (username === ADMIN_USERNAME && code === ADMIN_CODE) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    $("#loginScreen").classList.add("hidden");
    $("#adminApp").classList.remove("hidden");
    addActivity("admin_login", "", "Admin");
    initFirebaseListeners();
  } else {
    $("#loginError").textContent = "Invalid username or admin code.";
  }
}

function initFirebaseListeners() {
  subscribeToClients();
  subscribeToActivity();
}

document.addEventListener("DOMContentLoaded", () => {
  const authenticated = sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";

  if (authenticated) {
    $("#loginScreen").classList.add("hidden");
    $("#adminApp").classList.remove("hidden");
    initFirebaseListeners();
  }

  $("#loginForm")?.addEventListener("submit", handleLogin);

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => setSection(btn.dataset.section));
  });

  document.querySelectorAll("[data-go-section]").forEach(btn => {
    btn.addEventListener("click", () => setSection(btn.dataset.goSection));
  });

  $("#menuToggle")?.addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  $("#logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.reload();
  });

  $("#clientFilter")?.addEventListener("input", e => renderClientList(e.target.value));

  $("#addPhotoBtn")?.addEventListener("click", () => addPhotoRow());

  $("#addBulkLinksBtn")?.addEventListener("click", () => {
    const textarea = $("#bulkStandardLinks");
    if (!textarea) return;

    const links = textarea.value
      .split(/\s+/)
      .map(v => v.trim())
      .filter(v => /^https?:\/\/\S+$/i.test(v));

    if (!links.length) {
      alert("Shira link ya ImgBB HD, imwe kuri line.");
      return;
    }

    links.forEach(link => addPhotoRow({ hd: link, standard: link }));
    textarea.value = "";
  });

  $("#cancelEdit")?.addEventListener("click", resetForm);

  // SAUVEGARDE ET MISE À JOUR DANS FIRESTORE
  $("#clientForm")?.addEventListener("submit", async e => {
    e.preventDefault();

    const originalId = $("#editOriginalId").value.trim();
    const id = $("#clientSlug").value.trim().toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!id) {
      alert("Please enter a valid client slug.");
      return;
    }

    const clientData = {
      id,
      name: $("#clientName").value.trim(),
      event: $("#clientEvent").value.trim(),
      date: $("#clientDate").value.trim(),
      accessCode: $("#clientCode").value.trim(),
      cover: $("#clientCover").value.trim(),
      photos: readFormPhotos(),
      updatedAt: serverTimestamp()
    };

    if (!clientData.name || !clientData.accessCode || !clientData.cover) {
      alert("Client name, access code and cover image are required.");
      return;
    }

    try {
      if (originalId && originalId !== id) {
        await deleteDoc(doc(db, "clients", originalId));
        await addActivity("gallery_updated", id, clientData.name);
      } else if (originalId) {
        await addActivity("gallery_updated", id, clientData.name);
      } else {
        await addActivity("gallery_created", id, clientData.name);
      }

      await setDoc(doc(db, "clients", id), clientData);

      alert("Gallery saved successfully to Firebase!");
      resetForm();
      setSection("clients");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde : ", error);
      alert("Failed to save gallery. Check browser console.");
    }
  });

  // SUPPRESSION D'UN CLIENT
  $("#adminClientList")?.addEventListener("click", async e => {
    const view = e.target.closest("[data-view]");
    const edit = e.target.closest("[data-edit]");
    const copy = e.target.closest("[data-copy]");
    const del = e.target.closest("[data-delete]");

    if (view) {
      window.open(galleryLink(view.dataset.view), "_blank", "noopener");
      return;
    }

    if (edit) {
      fillEdit(edit.dataset.edit);
      return;
    }

    if (copy) {
      navigator.clipboard?.writeText(galleryLink(copy.dataset.copy))
        .then(() => alert("Gallery link copied."));
      return;
    }

    if (del) {
      const clientId = del.dataset.delete;
      const client = localClientsCache.find(c => c.id === clientId);
      if (!client) return;

      if (confirm(`Delete ${client.name}? This removes the gallery data permanently.`)) {
        try {
          await deleteDoc(doc(db, "clients", clientId));
          await addActivity("gallery_deleted", clientId, client.name);
          alert("Gallery deleted.");
        } catch (error) {
          console.error("Erreur lors de la suppression : ", error);
          alert("Failed to delete gallery.");
        }
      }
    }
  });

  if (authenticated) {
    resetForm();
  }
});
