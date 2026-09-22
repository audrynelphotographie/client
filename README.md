# Audry Nel Photography — Client Gallery V2

## Important
This version is designed for a GitHub Pages custom domain such as `client.audrynel.com`.

### Clean client URLs
A URL such as:
`https://client.audrynel.com/wilson-audry`

is handled by `404.html` on GitHub Pages. The URL stays `/wilson-audry` while the app reads the slug from the browser path.

### Access code
The client enters the code once. After a successful code check, the browser stores:
`audrynel_access_<slug> = granted`

So the same client does NOT get asked for the code every time on that device/browser.

If the client clears browser storage or uses another device/browser, the code will be requested again.

### Firestore structure
Collection: `clients`

Document ID / slug:
`wilson-audry`

Fields:
- name
- slug
- event
- date
- accessCode
- cover
- photos: array of `{url, name}`

### Admin
Username: `Audrynel`
Admin code: `carly62652177`

For a real production system, do NOT rely on a password stored in frontend JavaScript. Use Firebase Authentication + protected Firestore rules.

### ImgBB
The admin accepts many ImgBB URLs, one URL per line. It saves them as the gallery's `photos` array.

### Mobile layout
- Client cards: 3 columns on phone.
- Gallery photos: 5 columns on phone.
- Images use lazy loading.

### WhatsApp link preview
A static GitHub Pages SPA cannot dynamically change `og:image` for every client path before WhatsApp's crawler reads the page. The default `/cover.jpg` is therefore used. Per-client WhatsApp previews require a server/edge function that generates route-specific Open Graph metadata.


## Admin portal fix
If Admin Portal opens but SAVE/DELETE fails, that is normally Firestore Security Rules rejecting frontend writes. See `firestore-rules-admin-setup.txt`.

## Share link fix
The Share button now shares ONLY:
`https://client.audrynel.com/<slug>`

The client access code is never included in the URL or in the share payload.

A cover image may still appear in WhatsApp's link preview. That is normal Open Graph preview behavior and is not the access code. Route-specific WhatsApp cover previews require server/edge-generated Open Graph metadata.
