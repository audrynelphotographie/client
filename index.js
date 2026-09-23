const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

initializeApp();
const db = getFirestore();

// Update this if the live domain ever changes.
const SITE = "https://client.audrynel.com";
const DEFAULT_TITLE = "Client Galleries | Audry Nel Photography";
const DEFAULT_DESC = "Private client galleries by Audry Nel Photography.";
const DEFAULT_IMAGE = SITE + "/cover.jpg";

const TEMPLATE = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

function toAbsolute(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return SITE + (url.startsWith("/") ? url : "/" + url);
}

exports.gallery = onRequest(async (req, res) => {
  const slug = decodeURIComponent((req.path || "/").replace(/^\/+|\/+$/g, ""));

  let title = DEFAULT_TITLE;
  let desc = DEFAULT_DESC;
  let image = DEFAULT_IMAGE;

  if (slug) {
    try {
      const snap = await db.collection("clients").doc(slug).get();
      if (snap.exists) {
        const c = snap.data();
        title = (c.name ? c.name + " · " : "") + "Private Gallery | Audry Nel Photography";
        desc = [c.event, c.date].filter(Boolean).join(" · ") || "Private client gallery.";
        image = toAbsolute(c.cover || (Array.isArray(c.photos) && c.photos[0] && (c.photos[0].url || c.photos[0]))) || DEFAULT_IMAGE;
      }
    } catch (e) {
      console.error("gallery meta lookup failed for slug:", slug, e);
    }
  }

  const html = TEMPLATE
    .split("__TITLE__").join(escapeHtml(title))
    .split("__DESC__").join(escapeHtml(desc))
    .split("__IMAGE__").join(image)
    .split("__URL__").join(SITE + "/" + slug);

  res.set("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(html);
});
