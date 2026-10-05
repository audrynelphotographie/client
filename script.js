/* PUBLIC CLIENT PORTAL — FIRESTORE */
import { getAllClients, getClient, addActivity } from "/firebase-data.js";

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

  window.location.assign(`${window.location.origin}/${encodeURIComponent(clientId)}`);
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
      <a class="brand" href="/">
        <span class="brand-name">AUDRY NEL</span>
        <span class="brand-sub">PHOTOGRAPHY</span>
      </a>
      <nav class="main-nav">
        <a href="/">GALLERIES</a>
        <a class="admin-link" href="/admin.html">⚙ ADMIN PORTAL</a>
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
  const photos = client.photos || [];
  const selectedIndexes = new Set();

  /* ---- Instagram-style lazy loading: 10 photos per batch ---- */
  const BATCH = 10;
  const conn = navigator.connection || {};
  const slow = !!conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || "");
  // Grid uses the lighter "standard" image (saves data on 3G); HD is used only for download.
  const gridSrc = (p) => p.standard || p.hd || "";
  let rendered = 0;

  const sentinel = document.createElement("div");
  sentinel.className = "photo-sentinel";
  grid.after(sentinel);

  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) loadMore();
      }, { rootMargin: slow ? "300px 0px" : "900px 0px" })
    : null;

  function finishIfDone() {
    if (rendered >= photos.length) {
      io?.disconnect();
      sentinel.remove();
      return true;
    }
    return false;
  }

  function renderBatch() {
    const end = Math.min(rendered + BATCH, photos.length);
    const frag = document.createDocumentFragment();
    let pending = end - rendered;

    const settle = () => {
      pending--;
      // Next batch is only requested once this one has finished downloading.
      if (pending <= 0 && !finishIfDone() && io) {
        io.unobserve(sentinel);
        io.observe(sentinel);
      }
    };

    for (let index = rendered; index < end; index++) {
      const src = gridSrc(photos[index]);
      const card = document.createElement("article");
      card.className = "client-card selectable-photo is-loading" + (selectedIndexes.has(index) ? " selected" : "");
      card.innerHTML = `
        <div class="card-cover">
          <img class="lazy-img" alt="Photo ${index + 1}" decoding="async">
          <span class="photo-loader" aria-hidden="true"></span>
          <button class="photo-retry" type="button">⟳ RETRY</button>
          <label class="photo-select" title="Select photo">
            <input type="checkbox" data-photo-index="${index}" ${selectedIndexes.has(index) ? "checked" : ""}>
            <span></span>
          </label>
          <button class="photo-open" type="button" aria-label="Open photo">VIEW</button>
        </div>
      `;
      const img = card.querySelector("img");
      let tries = 0, done = false;
      const end1 = () => { if (!done) { done = true; settle(); } };
      img.addEventListener("load", () => {
        img.classList.add("loaded");
        card.classList.remove("is-loading", "is-error");
        end1();
      });
      img.addEventListener("error", () => {
        // Weak network: retry up to 2 times before showing the RETRY button.
        if (tries++ < 2) {
          setTimeout(() => { img.removeAttribute("src"); img.src = src; }, 1500 * tries);
        } else {
          card.classList.remove("is-loading");
          card.classList.add("is-error");
          end1();
        }
      });
      card.querySelector(".photo-retry").addEventListener("click", (e) => {
        e.stopPropagation();
        tries = 0;
        card.classList.remove("is-error");
        card.classList.add("is-loading");
        img.removeAttribute("src");
        img.src = src;
      });
      img.src = src;
      card.querySelector(".photo-open").addEventListener("click", () => openLightbox(index));
      img.addEventListener("click", () => openLightbox(index));
      frag.appendChild(card);
    }
    rendered = end;
    grid.appendChild(frag);
  }

  function loadMore() {
    if (finishIfDone()) return;
    io?.unobserve(sentinel); // wait until current batch settles
    renderBatch();
  }

  if (io) {
    loadMore();
  } else {
    // Very old browsers: render everything.
    while (rendered < photos.length) renderBatch();
  }

  function openLightbox(index) {
    if (!client.photos?.length) return;
    currentIndex = (index + client.photos.length) % client.photos.length;
    const photo = client.photos[currentIndex];
    const lb = $("#lightboxImage");
    const shownIndex = currentIndex;
    lb.src = photo.standard || photo.hd;
    if (!slow && photo.hd && photo.standard && photo.hd !== photo.standard) {
      const hi = new Image();
      hi.onload = () => { if (currentIndex === shownIndex) lb.src = photo.hd; };
      hi.src = photo.hd;
    }
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
    const allSelected = selectedIndexes.size === photos.length;
    selectedIndexes.clear();
    if (!allSelected) photos.forEach((_, i) => selectedIndexes.add(i));
    grid.querySelectorAll("[data-photo-index]").forEach(box => {
      const on = selectedIndexes.has(Number(box.dataset.photoIndex));
      box.checked = on;
      box.closest(".selectable-photo")?.classList.toggle("selected", on);
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
