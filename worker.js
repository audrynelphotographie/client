/**
 * Audry Nel Client Gallery — Clean URL + Social Preview Worker
 *
 * Put this Worker in front of client.audrynel.com.
 *
 * What it does:
 *  - /diane-kevin stays a clean URL.
 *  - For WhatsApp/Facebook/crawlers, it fetches the client's Firestore document
 *    and injects Open Graph/Twitter metadata using the client's cover photo.
 *  - For normal visitors, it proxies the real GitHub Pages site.
 *
 * Required Worker variables:
 *   GITHUB_ORIGIN = your GitHub Pages origin, e.g.
 *                   https://YOUR-USER.github.io/YOUR-REPO
 *   FIREBASE_PROJECT_ID = clientaudrynel-44785
 *
 * Firestore document expected:
 *   collection: clients
 *   document id: diane-kevin
 *
 * Suggested fields:
 *   name: "Diane & Kevin"
 *   coverPhoto: "https://i.ibb.co/....jpg"
 *   photos: [{hd:"https://i.ibb.co/....jpg"}]
 *   status: "active"
 */

const BOT_UA = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|Googlebot|bingbot|Applebot|Pinterestbot/i;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanSlug(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return null;
  const slug = parts[0].toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) return null;
  if (["admin", "favicon.ico", "robots.txt", "sitemap.xml"].includes(slug)) return null;
  return slug;
}

function firstPhoto(data) {
  const p = Array.isArray(data?.photos) ? data.photos[0] : null;
  return data?.coverPhoto ||
         data?.cover ||
         data?.thumbnail ||
         p?.hd ||
         p?.standard ||
         "";
}

async function getClient(env, slug) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}` +
    `/databases/(default)/documents/clients/${encodeURIComponent(slug)}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const doc = await response.json();
  const fields = doc.fields || {};
  const value = (name) => {
    const f = fields[name];
    if (!f) return "";
    return f.stringValue ?? f.integerValue ?? f.doubleValue ?? "";
  };

  let photos = [];
  if (fields.photos?.arrayValue?.values) {
    photos = fields.photos.arrayValue.values.map(item => {
      const m = item.mapValue?.fields || {};
      return {
        hd: m.hd?.stringValue || "",
        standard: m.standard?.stringValue || ""
      };
    });
  }

  return {
    name: value("name") || value("title") || slug,
    coverPhoto: value("coverPhoto") || value("cover") || value("thumbnail") || "",
    status: value("status") || "active",
    photos
  };
}

function previewHtml({ url, name, image, origin }) {
  const title = `${name} | Audry Nel Photography`;
  const description = `Private photo gallery for ${name}.`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeImage = escapeHtml(image);
  const safeName = escapeHtml(name);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
<meta property="og:type" content="website">
<meta property="og:title" content="${safeName}">
<meta property="og:description" content="Private photo gallery by Audry Nel Photography.">
<meta property="og:url" content="${safeUrl}">
<meta property="og:site_name" content="Audry Nel Photography">
${image ? `<meta property="og:image" content="${safeImage}">` : ""}
${image ? `<meta property="og:image:secure_url" content="${safeImage}">` : ""}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${safeName}">
<meta name="twitter:description" content="Private photo gallery by Audry Nel Photography.">
${image ? `<meta name="twitter:image" content="${safeImage}">` : ""}
</head>
<body>
<h1>${safeName}</h1>
<p>Audry Nel Photography</p>
<a href="${safeUrl}">Open gallery</a>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const slug = cleanSlug(incoming.pathname);

    // Let normal static assets/admin/root go directly to GitHub Pages.
    if (!slug) {
      const origin = env.GITHUB_ORIGIN;
      if (!origin) return new Response("Missing GITHUB_ORIGIN", { status: 500 });

      const target = new URL(incoming.pathname + incoming.search, origin);
      return fetch(new Request(target, request));
    }

    const client = await getClient(env, slug);
    const publicUrl = `${incoming.origin}/${slug}`;

    // Crawlers need server-rendered OG tags so WhatsApp/Facebook can see
    // the client's image before JavaScript runs.
    if (BOT_UA.test(request.headers.get("user-agent") || "")) {
      if (!client) {
        return new Response(previewHtml({
          url: publicUrl,
          name: "Audry Nel Photography",
          image: "",
          origin: incoming.origin
        }), { headers: { "content-type": "text/html; charset=UTF-8" } });
      }

      const image = firstPhoto(client);
      return new Response(previewHtml({
        url: publicUrl,
        name: client.name || slug,
        image,
        origin: incoming.origin
      }), {
        headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "public, max-age=300"
        }
      });
    }

    // Normal visitor: proxy the SPA entry so the address bar remains /slug.
    const origin = env.GITHUB_ORIGIN;
    if (!origin) return new Response("Missing GITHUB_ORIGIN", { status: 500 });

    const target = new URL("/", origin);
    return fetch(new Request(target, request));
  }
};
