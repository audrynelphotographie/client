/* AUDRY NEL PHOTOGRAPHY — FIRESTORE ADMIN PORTAL */
import {
  getAllClients,
  saveClient,
  removeClient,
  getActivity,
  addActivity,
  seedDefaultClients
} from "./firebase-data.js";

const ADMIN_USERNAME = "Audrynel";
const ADMIN_CODE = "carly62652177";
const ADMIN_SESSION_KEY = "audryNelAdminSessionV2";

const $ = (s) => document.querySelector(s);
let clientsCache = [];
let activityCache = [];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function formatDate(date) { return date ? new Date(date).toLocaleString() : "—"; }
function cleanSlug(value = "") {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}
function galleryLink(clientId) {
  return new URL(`/${encodeURIComponent(clientId)}`, window.location.origin).toString();
}

async function loadClients() {
  clientsCache = await getAllClients();
  clientsCache.sort((a,b) => a.name.localeCompare(b.name));
  return clientsCache;
}
async function refreshActivity() {
  activityCache = await getActivity(100);
  return activityCache;
}

function setBusy(isBusy, text = "Saving…") {
  document.body.classList.toggle("is-busy", isBusy);
  const button = document.querySelector('#clientForm button[type="submit"]');
  if (button) { button.disabled = isBusy; button.textContent = isBusy ? text : "Save Gallery"; }
}
function setSection(name) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.add("hidden"));
  $(`#section-${name}`)?.classList.remove("hidden");
  const titles = { dashboard:"Dashboard", clients:"Clients", create:"Create Gallery", activity:"Activity" };
  $("#pageTitle").textContent = titles[name] || "Dashboard";
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.section === name));
  $("#sidebar")?.classList.remove("open");
}
function renderStats() {
  const photos = clientsCache.reduce((sum,c) => sum + (c.photos?.length || 0), 0);
  $("#statClients").textContent = clientsCache.length;
  $("#statGalleries").textContent = clientsCache.length;
  $("#statPhotos").textContent = photos;
  $("#statActivity").textContent = activityCache.length;
}
function renderActivity(targetId, limit = 20) {
  const target = $(targetId); if (!target) return;
  const activity = activityCache.slice(0, limit);
  if (!activity.length) { target.innerHTML = `<div class="activity-item"><strong>No activity yet.</strong><span>—</span></div>`; return; }
  target.innerHTML = activity.map(item => {
    const client = clientsCache.find(c => c.id === item.clientId);
    const name = client?.name || item.label || "Admin";
    return `<div class="activity-item"><strong>${escapeHTML(name)} — ${escapeHTML(String(item.type || "").replaceAll("_"," "))}</strong><span>${escapeHTML(formatDate(item.timestamp))}</span></div>`;
  }).join("");
}
function renderClientList(filter = "") {
  const target = $("#adminClientList"); if (!target) return;
  const q = filter.trim().toLowerCase();
  const clients = clientsCache.filter(c => !q || c.name.toLowerCase().includes(q) || (c.event||"").toLowerCase().includes(q) || c.id.includes(q));
  if (!clients.length) { target.innerHTML = `<div class="activity-item"><strong>No clients found.</strong><span>—</span></div>`; return; }
  target.innerHTML = clients.map(c => `
    <article class="admin-client">
      <img src="${escapeHTML(c.cover || "")}" alt="${escapeHTML(c.name)}" loading="lazy">
      <div><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.event || "Photography")} · ${escapeHTML(c.date || "")}</p><p>${c.photos?.length || 0} photos · ${escapeHTML(c.id)}</p></div>
      <div class="actions">
        <button class="ghost-btn" data-view="${escapeHTML(c.id)}">VIEW</button>
        <button class="ghost-btn" data-edit="${escapeHTML(c.id)}">EDIT</button>
        <button class="ghost-btn" data-copy="${escapeHTML(c.id)}">COPY LINK</button>
        <button class="danger" data-delete="${escapeHTML(c.id)}">DELETE</button>
      </div>
    </article>`).join("");
}
function resetForm() {
  $("#clientForm")?.reset();
  $("#editOriginalId").value = "";
  $("#formTitle").textContent = "Create Gallery";
  $("#photoRows").innerHTML = "";
  $("#bulkStandardLinks").value = "";
  addPhotoRow();
}
function addPhotoRow(photo = {}) {
  const row = document.createElement("div"); row.className = "photo-row";
  const url = photo.hd || photo.standard || "";
  row.innerHTML = `<input class="photo-hd" placeholder="ImgBB HD URL" value="${escapeHTML(url)}"><button type="button" class="photo-remove">REMOVE</button>`;
  row.querySelector(".photo-remove").onclick = () => row.remove();
  $("#photoRows").appendChild(row);
}
function readFormPhotos() {
  return [...document.querySelectorAll(".photo-row")].map(row => {
    const url = row.querySelector(".photo-hd")?.value.trim();
    return url ? { hd:url, standard:url } : null;
  }).filter(Boolean);
}
function fillEdit(clientId) {
  const client = clientsCache.find(c => c.id === clientId); if (!client) return;
  $("#editOriginalId").value = client.id; $("#clientName").value = client.name || "";
  $("#clientEvent").value = client.event || ""; $("#clientDate").value = client.date || "";
  $("#clientSlug").value = client.id || ""; $("#clientCode").value = client.accessCode || "";
  $("#clientCover").value = client.cover || ""; $("#formTitle").textContent = "Edit Gallery";
  $("#photoRows").innerHTML = ""; (client.photos || []).forEach(addPhotoRow); if (!client.photos?.length) addPhotoRow();
  setSection("create");
}
async function handleLogin(e) {
  e.preventDefault();
  const username = $("#adminUsername").value.trim(), code = $("#adminCode").value;
  if (username !== ADMIN_USERNAME || code !== ADMIN_CODE) { $("#loginError").textContent = "Invalid username or admin code."; return; }
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1"); $("#loginScreen").classList.add("hidden"); $("#adminApp").classList.remove("hidden");
  try { await addActivity("admin_login", "", "Admin"); } catch {}
  await refreshDashboard();
}
async function refreshDashboard() {
  try { await loadClients(); await refreshActivity(); renderStats(); renderActivity("#dashboardActivity",8); renderActivity("#fullActivity",100); renderClientList($("#clientFilter")?.value || ""); }
  catch (error) { console.error(error); alert("Firestore could not be loaded. Check your Firestore rules and Firebase project."); }
}

document.addEventListener("DOMContentLoaded", async () => {
  const authenticated = sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  if (authenticated) { $("#loginScreen").classList.add("hidden"); $("#adminApp").classList.remove("hidden"); }
  $("#loginForm")?.addEventListener("submit", handleLogin);
  document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => setSection(btn.dataset.section)));
  document.querySelectorAll("[data-go-section]").forEach(btn => btn.addEventListener("click", () => setSection(btn.dataset.goSection)));
  $("#menuToggle")?.addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#logoutBtn")?.addEventListener("click", () => { sessionStorage.removeItem(ADMIN_SESSION_KEY); window.location.reload(); });
  $("#clientFilter")?.addEventListener("input", e => renderClientList(e.target.value));
  $("#addPhotoBtn")?.addEventListener("click", () => addPhotoRow());
  $("#addBulkLinksBtn")?.addEventListener("click", () => {
    const textarea = $("#bulkStandardLinks");
    const links = textarea.value.split(/\s+/).map(v=>v.trim()).filter(v => /^https?:\/\/\S+$/i.test(v));
    if (!links.length) return alert("Shira link ya ImgBB HD, imwe kuri line.");
    links.forEach(link => addPhotoRow({hd:link})); textarea.value = "";
  });
  $("#cancelEdit")?.addEventListener("click", resetForm);

  $("#clientForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const originalId = $("#editOriginalId").value.trim();
    const id = cleanSlug($("#clientSlug").value);
    const client = { id, name:$("#clientName").value.trim(), event:$("#clientEvent").value.trim(), date:$("#clientDate").value.trim(), accessCode:$("#clientCode").value.trim(), cover:$("#clientCover").value.trim(), photos:readFormPhotos() };
    if (!id) return alert("Please enter a valid client slug.");
    if (!client.name || !client.accessCode || !client.cover) return alert("Client name, access code and cover image are required.");
    setBusy(true);
    try {
      if (originalId && originalId !== id) await removeClient(originalId);
      await saveClient(client);
      await addActivity(originalId ? "gallery_updated" : "gallery_created", id, client.name);
      await refreshDashboard(); resetForm(); setSection("clients"); alert("Gallery saved successfully online.");
    } catch (error) { console.error(error); alert(`Save failed: ${error.message || error}`); }
    finally { setBusy(false); }
  });

  $("#adminClientList")?.addEventListener("click", async e => {
    const view=e.target.closest("[data-view]"), edit=e.target.closest("[data-edit]"), copy=e.target.closest("[data-copy]"), del=e.target.closest("[data-delete]");
    if (view) return window.open(galleryLink(view.dataset.view), "_blank", "noopener");
    if (edit) return fillEdit(edit.dataset.edit);
    if (copy) { await navigator.clipboard?.writeText(galleryLink(copy.dataset.copy)); return alert("Clean gallery link copied."); }
    if (del) {
      const client=clientsCache.find(c=>c.id===del.dataset.delete); if(!client) return;
      if(!confirm(`Delete ${client.name}? This removes the online gallery.`)) return;
      try { await removeClient(client.id); await addActivity("gallery_deleted",client.id,client.name); await refreshDashboard(); }
      catch(error){ alert(`Delete failed: ${error.message || error}`); }
    }
  });

  if (authenticated) {
    try {
      await seedDefaultClients(typeof DEFAULT_CLIENTS !== "undefined" ? DEFAULT_CLIENTS : []);
      await refreshDashboard(); resetForm();
    } catch (error) { console.error(error); alert("Firestore could not be loaded. Check Firestore rules."); }
  }
});
