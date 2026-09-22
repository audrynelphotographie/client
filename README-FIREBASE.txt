AUDRY NEL CLIENT GALLERY — FIRESTORE VERSION

What changed
- Client/galleries data is stored in Cloud Firestore instead of localStorage.
- ImgBB HD URLs are stored as text only; Firebase Storage is not used for photos.
- Admin Create/Edit/Delete/Copy Link works against Firestore.
- Public gallery reads clients from Firestore.
- Clean gallery URLs are generated as:
  https://client.audrynel.com/diane-kevin
- GitHub Pages clean routes are handled by 404.html.
- HD-only downloads remain enabled.
- Lazy loading remains enabled.
- Admin activity is stored in Firestore collection: activity.

Important
The current Firebase Firestore project is configured from the web config supplied by the owner.
The web config is not a service-account private key. Do not add a Firebase service-account JSON file to GitHub.

Firestore setup
The app expects these collections to be created automatically when the Admin Portal saves data:
- clients
- activity

The first successful Admin Portal load can seed DEFAULT_CLIENTS from contentclient.js if the clients collection is empty.

Security warning
If Firestore is still in Test Mode, the database is not production-secure. Test Mode is only suitable for initial testing. Before making private client galleries public, configure Firebase Authentication and Firestore Security Rules so arbitrary visitors cannot write or read private client records.

GitHub Pages
Upload all files in this folder to the root of the GitHub Pages site. Keep 404.html at the repository root. The custom domain should point to the GitHub Pages site.

Files
- index.html
- 404.html
- admin.html
- admin.js
- admin.css
- script.js
- style.css
- contentclient.js
- firebase-config.js
- firebase-data.js

Mobile gallery: 5-column (5x5) grid. First 25 photos load eagerly; remaining photos use native lazy loading.
