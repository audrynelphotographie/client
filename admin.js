/*
  AUDRY NEL PHOTOGRAPHY
  ADMIN PORTAL

  Simple frontend-only admin for the first version.
  Username: Audrynel
  Code: carly62652177

  IMPORTANT:
  This is NOT server-side security. The credentials are visible
  to anyone who can inspect the frontend JavaScript.
*/

const ADMIN_USERNAME = "Audrynel";
const ADMIN_CODE = "carly62652177";

const STORAGE_KEY = "audryNelClientsV1";
const ACTIVITY_KEY = "audryNelActivityV1";
const ADMIN_SESSION_KEY = "audryNelAdminSessionV1";

const $ = (s) => document.querySelector(s);

function loadClients() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLIENTS));
  return JSON.parse(JSON.stringify(DEFAULT_CLIENTS));
}

function saveClients(clients) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function getActivity() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY)) || [];
  } catch {
    return [];
  }
}

function addActivity(type, clientId = "", label = "") {
  const activity = getActivity();
  activity.unshift({
    type,
    clientId,
    label,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 100)));
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
  return new Date(date).toLocaleString();
}

function renderStats() {
  const clients = loadClients();
  const photos = clients.reduce((sum, c) => sum + (c.photos?.length || 0), 0);
  const activity = getActivity();

  $("#statClients").textContent = clients.length;
  $("#statGalleries").textContent = clients.length;
  $("#statPhotos").textContent = photos;
  $("#statActivity").textContent = activity.length;
}

function renderActivity(targetId, limit = 20) {
  const target = $(targetId);
  if (!target) return;

  const clients = loadClients();
  const activity = getActivity().slice(0, limit);

  if (!activity.length) {
    target.innerHTML = `<div class="activity-item"><strong>No activity yet.</strong><span>—</span></div>`;
    return;
  }

  target.innerHTML = activity.map(item => {
    const client = clients.find(c => c.id === item.clientId);
    const name = client?.name || item.label || "Admin";
    const readable = item.type.replaceAll("_", " ");
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

  const query = filter.trim().toLowerCase();
  const clients = loadClients().filter(c =>
    !query ||
    c.name.toLowerCase().includes(query) ||
    (c.event || "").toLowerCase().includes(query) ||
    c.id.toLowerCase().includes(query)
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
  $("#bulkStandardLinks").value = "";
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
  const client = loadClients().find(c => c.id === clientId);
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
    refreshDashboard();
  } else {
    $("#loginError").textContent = "Invalid username or admin code.";
  }
}

function refreshDashboard() {
  renderStats();
  renderActivity("#dashboardActivity", 8);
  renderActivity("#fullActivity", 100);
  renderClientList($("#clientFilter")?.value || "");
}

document.addEventListener("DOMContentLoaded", () => {
  const authenticated = sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";

  if (authenticated) {
    $("#loginScreen").classList.add("hidden");
    $("#adminApp").classList.remove("hidden");
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
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(v => /^https?:\/\/\S+$/i.test(v));

    if (!links.length) {
      alert("Shira link ya ImgBB HD, imwe kuri line.");
      return;
    }

    links.forEach(link => addPhotoRow({ hd: link, standard: link }));
    textarea.value = "";
    alert(`${links.length} HD photo link(s) added.`);
  });


  $("#addBulkLinksBtn").addEventListener("click", () => {
    const textarea = $("#bulkStandardLinks");
    const links = textarea.value.split(/\s+/).map(v => v.trim()).filter(Boolean);
    if (!links.length) {
      alert("Paste at least one ImgBB link.");
      return;
    }
    links.forEach(link => addPhotoRow({ hd: link, standard: link }));
    textarea.value = "";
  });

  $("#cancelEdit")?.addEventListener("click", resetForm);

  $("#clientForm")?.addEventListener("submit", e => {
    e.preventDefault();

    const clients = loadClients();
    const originalId = $("#editOriginalId").value.trim();
    const id = $("#clientSlug").value.trim().toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!id) {
      alert("Please enter a valid client slug.");
      return;
    }

    const client = {
      id,
      name: $("#clientName").value.trim(),
      event: $("#clientEvent").value.trim(),
      date: $("#clientDate").value.trim(),
      accessCode: $("#clientCode").value.trim(),
      cover: $("#clientCover").value.trim(),
      photos: readFormPhotos()
    };

    if (!client.name || !client.accessCode || !client.cover) {
      alert("Client name, access code and cover image are required.");
      return;
    }

    if (originalId && originalId !== id) {
      const index = clients.findIndex(c => c.id === originalId);
      if (index !== -1) clients.splice(index, 1);
      addActivity("gallery_updated", id, client.name);
    } else if (originalId) {
      addActivity("gallery_updated", id, client.name);
    } else {
      addActivity("gallery_created", id, client.name);
    }

    const existingIndex = clients.findIndex(c => c.id === id);
    if (existingIndex >= 0) clients[existingIndex] = client;
    else clients.unshift(client);

    saveClients(clients);
    alert("Gallery saved successfully.");
    resetForm();
    refreshDashboard();
    setSection("clients");
  });

  $("#adminClientList")?.addEventListener("click", e => {
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
      const clients = loadClients();
      const client = clients.find(c => c.id === del.dataset.delete);
      if (!client) return;

      if (confirm(`Delete ${client.name}? This removes the local gallery data.`)) {
        saveClients(clients.filter(c => c.id !== client.id));
        addActivity("gallery_deleted", client.id, client.name);
        refreshDashboard();
      }
    }
  });

  if (!authenticated) {
    // Login screen only.
  } else {
    resetForm();
    refreshDashboard();
  }
});
