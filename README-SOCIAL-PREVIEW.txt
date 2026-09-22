# Audry Nel — Clean URL + WhatsApp/Facebook preview

This package keeps:
- Firestore
- ImgBB HD links
- 5x5 mobile gallery
- lazy loading
- clean client URLs

It adds `worker.js` for social previews.

## Required setup

1. Replace `GITHUB_ORIGIN` in `wrangler.toml` with the exact GitHub Pages origin.
2. Deploy the Worker to Cloudflare.
3. Add a Worker route for:
   `client.audrynel.com/*`
4. Keep `client.audrynel.com` DNS/proxy on Cloudflare.
5. The Firestore document should be:
   `clients / diane-kevin`
6. Add a client `coverPhoto` field containing the ImgBB image URL.

The Worker reads Firestore through the public Firestore REST endpoint. Therefore, if your Firestore rules later become private, this Worker must be changed to use server-side Firebase credentials instead of public reads.

## Result

Share:
https://client.audrynel.com/diane-kevin

Normal visitor:
- opens Diane & Kevin gallery directly
- URL stays clean

WhatsApp/Facebook crawler:
- receives Open Graph metadata
- preview can show Diane & Kevin's cover photo
