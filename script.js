/* PUBLIC CLIENT PORTAL — FIRESTORE */
import { getAllClients, getClient, addActivity } from "./firebase-data.js";

let clientsCache = [];

const $ = (selector) => document.querySelector(selector);

async function getClients() {
  if (clientsCache.length) return clientsCache;
  clientsCache = await getAllClients();
  return clientsCache;
}

async function refreshClients() {
  clientsCache = await getAllClients();
  return clientsCache;
}

async function saveActivity(type, clientId = "") {
  try { await addActivity(type, clientId); } catch {}
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function renderClients(filter = "") {
  const grid = $("#clientGrid");
  const empty = $("#emptyState");
  if (!grid) return;

  const query = filter.trim().toLowerCase();
  const clients = (await getClients()).filter(c =>
    !query ||
    c.name.toLowerCase().includes(query) ||
    (c.event || "").toLowerCase().includes(query)
  );

  grid.innerHTML = "";

  if (!clients.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  clients.forEach(client => {
    const card = document.createElement("article");
    card.className = "client-card";
    card.innerHTML = `
      <div class="card-cover">
        <img src="${escapeHTML(client.cover || "")}" alt="${escapeHTML(client.name)}" loading="lazy">
        <span class="photo-count">${client.photos?.length || 0} PHOTOS</span>
      </div>
      <div class="card-body">
        <h2>${escapeHTML(client.name)}</h2>
        <p class="card-meta">${escapeHTML(client.event || "Photography Session")}</p>
        <p class="card-meta">${escapeHTML(client.date || "")}</p>
        <div class="card-actions">
          <button class="gold-btn" data-client="${escapeHTML(client.id)}">VIEW GALLERY</button>
          <button class="ghost-btn" data-share="${escapeHTML(client.id)}">SHARE</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function openAccessModal(clientId) {
  const client = (await getClients()).find(c => c.id === clientId);
  if (!client) return;

  $("#modalClientName").textContent = client.name;
  $("#modalClientEvent").textContent = `${client.event || "Photography Session"} · ${client.date || ""}`;
  $("#modalCover").style.backgroundImage = `url("${client.cover || ""}")`;
  $("#accessCode").value = "";
  $("#accessError").textContent = "";

  $("#accessForm").dataset.clientId = clientId;
  $("#galleryModal").classList.remove("hidden");
  $("#galleryModal").setAttribute("aria-hidden", "false");
  setTimeout(() => $("#accessCode").focus(), 50);
}

function closeModal() {
  $("#galleryModal")?.classList.add("hidden");
  $("#galleryModal")?.setAttribute("aria-hidden", "true");
}

async function openGallery(clientId) {
  const client = (await getClients()).find(c => c.id === clientId);
  if (!client) return;

  sessionStorage.setItem(`audryGalleryAuth:${clientId}`, "1");
  saveActivity("gallery_access", clientId);

  window.location.href = new URL(`/${encodeURIComponent(clientId)}`, window.location.origin).toString();
}

async function shareClient(clientId) {
  const client = (await getClients()).find(c => c.id === clientId);
  const url = new URL(`/${encodeURIComponent(clientId)}`, window.location.origin);
  const title = `${client?.name || "Client"} — Audry Nel Photography`;

  if (navigator.share) {
    navigator.share({ title, text: "Private photo gallery", url: url.toString() }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url.toString()).then(() => alert("Gallery link copied."));
  }
}

async function downloadOne(url, filename) {
  if (!url) return;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "audry-nel-photo.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch {
    // Fallback: open the image URL if the host blocks CORS downloads.
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.download = filename || "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function photoFileName(clientName, index, suffix = "HD") {
  const safe = String(clientName || "Client")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe}-${String(index + 1).padStart(3, "0")}-${suffix}.jpg`;
}

async function renderGalleryPage(clientId) {
  const client = await getClient(clientId);
  if (!client) {
    document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:40px;background:#080808;color:#fff;font-family:Inter,sans-serif;text-align:center"><div><p style="letter-spacing:.18em;color:#c5a044">AUDRY NEL PHOTOGRAPHY</p><h1>Gallery not found</h1><p style="color:#aaa">This client gallery does not exist or is no longer available.</p><a href="/" style="color:#c5a044">Back to galleries</a></div></main>`;
    return false;
  }

  const authenticated = sessionStorage.getItem(`audryGalleryAuth:${clientId}`) === "1";

  if (!authenticated) {
    openAccessModal(clientId);
    return true;
  }

  document.body.innerHTML = `
    <header class="site-header">
      <a class="brand" href="./">
        <span class="brand-name">AUDRY NEL</span>
        <span class="brand-sub">PHOTOGRAPHY</span>
      </a>
      <nav class="main-nav">
        <a href="./">GALLERIES</a>
        <a class="admin-link" href="./admin.html">⚙ ADMIN PORTAL</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <p class="eyebrow">PRIVATE GALLERY</p>
        <h1>${escapeHTML(client.name)}</h1>
        <p>${escapeHTML(client.event || "Photography Session")} · ${escapeHTML(client.date || "")}</p>
        <div class="card-actions" style="justify-content:center;margin-top:24px">
          <button class="gold-btn" id="shareGallery">🔗 SHARE GALLERY</button>
          <button class="ghost-btn" id="lockGallery">LOCK GALLERY</button>
        </div>
      </section>

      <section class="gallery-section">
        <div class="gallery-toolbar">
          <div class="select-info"><span id="selectedCount">0</span> selected</div>
          <div class="gallery-tools">
            <button class="ghost-btn" id="selectAllPhotos">SELECT ALL</button>
            <button class="gold-btn" id="downloadSelected">DOWNLOAD SELECTED</button>
            <button class="gold-btn" id="downloadAll">DOWNLOAD ALL</button>
          </div>
        </div>
        <div class="client-grid" id="photoGrid"></div>
      </section>
    </main>

    <footer class="site-footer">© 2026 AUDRY NEL PHOTOGRAPHY · Gitega, Burundi</footer>

    <div id="lightbox" class="modal hidden" aria-hidden="true">
      <div class="modal-backdrop" id="closeLightbox"></div>
      <section class="client-modal" style="background:#050505;max-width:1100px">
        <button class="modal-close" id="closeLightboxBtn">×</button>
        <img id="lightboxImage" src="" alt="" style="width:100%;max-height:78vh;object-fit:contain;background:#000">
        <div class="modal-body" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <span id="photoCounter" class="muted"></span>
          <div class="card-actions" style="margin:0">
            <button class="ghost-btn" id="prevPhoto">← PREVIOUS</button>
            <button class="gold-btn" id="downloadPhoto">DOWNLOAD</button>
            <button class="ghost-btn" id="nextPhoto">NEXT →</button>
          </div>
        </div>
      </section>
    </div>
  `;

  const grid = $("#photoGrid");
  let currentIndex = 0;

  (client.photos || []).forEach((photo, index) => {
    const card = document.createElement("article");
    card.className = "client-card selectable-photo";
    card.innerHTML = `
      <div class="card-cover">
        <img src="${escapeHTML(photo.hd || photo.standard || "")}" alt="Photo ${index + 1}" loading="lazy" decoding="async">
        <label class="photo-select" title="Select photo">
          <input type="checkbox" data-photo-index="${index}">
          <span></span>
        </label>
        <button class="photo-open" type="button" aria-label="Open photo">VIEW</button>
      </div>
    `;
    card.querySelector(".photo-open").addEventListener("click", () => openLightbox(index));
    card.querySelector("img").addEventListener("click", () => openLightbox(index));
    grid.appendChild(card);
  });

  function openLightbox(index) {
    if (!client.photos?.length) return;
    currentIndex = (index + client.photos.length) % client.photos.length;
    const photo = client.photos[currentIndex];
    $("#lightboxImage").src = photo.hd || photo.standard;
    $("#lightboxImage").alt = `${client.name} photo ${currentIndex + 1}`;
    $("#photoCounter").textContent = `${currentIndex + 1} / ${client.photos.length}`;
    $("#lightbox").classList.remove("hidden");
  }

  function closeLightbox() {
    $("#lightbox").classList.add("hidden");
    $("#lightboxImage").src = "";
  }

  $("#closeLightbox").onclick = closeLightbox;
  $("#closeLightboxBtn").onclick = closeLightbox;
  $("#prevPhoto").onclick = () => openLightbox(currentIndex - 1);
  $("#nextPhoto").onclick = () => openLightbox(currentIndex + 1);
  $("#downloadPhoto").onclick = () => {
    const photo = client.photos[currentIndex];
    const url = photo.hd || photo.standard;
    downloadOne(url, photoFileName(client.name, currentIndex, "HD"));
  };

  const selectedIndexes = new Set();

  function updateSelectedUI() {
    $("#selectedCount").textContent = selectedIndexes.size;
  }

  grid.addEventListener("change", (e) => {
    const checkbox = e.target.closest("[data-photo-index]");
    if (!checkbox) return;
    const index = Number(checkbox.dataset.photoIndex);
    if (checkbox.checked) selectedIndexes.add(index);
    else selectedIndexes.delete(index);
    checkbox.closest(".selectable-photo")?.classList.toggle("selected", checkbox.checked);
    updateSelectedUI();
  });

  $("#selectAllPhotos").onclick = () => {
    const boxes = grid.querySelectorAll("[data-photo-index]");
    const allSelected = selectedIndexes.size === client.photos.length;
    boxes.forEach(box => {
      box.checked = !allSelected;
      const index = Number(box.dataset.photoIndex);
      if (box.checked) selectedIndexes.add(index);
      else selectedIndexes.delete(index);
      box.closest(".selectable-photo")?.classList.toggle("selected", box.checked);
    });
    updateSelectedUI();
  };

  async function downloadList(indexes) {
    for (const index of indexes) {
      const photo = client.photos[index];
      const url = photo?.hd || photo?.standard;
      await downloadOne(url, photoFileName(client.name, index, "HD"));
      // Small delay so browsers do not block multiple download requests.
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  $("#downloadSelected").onclick = async () => {
    const indexes = [...selectedIndexes].sort((a,b) => a-b);
    if (!indexes.length) {
      alert("Please select at least one photo.");
      return;
    }
    await downloadList(indexes);
  };

  $("#downloadAll").onclick = async () => {
    if (!client.photos?.length) return;
    await downloadList(client.photos.map((_, index) => index));
  };

  $("#shareGallery").onclick = () => shareClient(clientId);
  $("#lockGallery").onclick = () => {
    sessionStorage.removeItem(`audryGalleryAuth:${clientId}`);
    window.location.href = "/";
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") openLightbox(currentIndex - 1);
    if (e.key === "ArrowRight") openLightbox(currentIndex + 1);
  });

  return true;
}

document.addEventListener("DOMContentLoaded", async () => {
  const pathSlug = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, ""));
  const params = new URLSearchParams(window.location.search);
  const ignoredPaths = new Set(["admin.html", "404.html", "favicon.ico", "robots.txt", "sitemap.xml"]);
  const clientId = params.get("client") || (pathSlug && !ignoredPaths.has(pathSlug) && !pathSlug.includes(".") ? pathSlug : "");

  try {
    await refreshClients();
  } catch (error) {
    console.error(error);
    const grid = $("#clientGrid");
    if (grid) grid.innerHTML = `<div class="empty-state"><h2>Gallery service unavailable</h2><p>Firestore could not be loaded. Please try again.</p></div>`;
    return;
  }

  if (clientId) {
    await renderGalleryPage(clientId);
    return;
  }

  await renderClients();

  $("#clientSearch")?.addEventListener("input", e => renderClients(e.target.value));

  $("#clientGrid")?.addEventListener("click", async e => {
    const view = e.target.closest("[data-client]");
    const share = e.target.closest("[data-share]");
    if (view) await openAccessModal(view.dataset.client);
    if (share) await shareClient(share.dataset.share);
  });

  $("#accessForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const clientId = e.currentTarget.dataset.clientId;
    const client = (await getClients()).find(c => c.id === clientId);
    const entered = $("#accessCode").value.trim();

    if (client && entered === client.accessCode) {
      closeModal();
      await openGallery(clientId);
    } else {
      $("#accessError").textContent = "Incorrect access code.";
    }
  });

  document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));
});
