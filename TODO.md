# BrandOS Fix Plan — Task List

## Root Causes Found
1. **Export PDF buttons 500** — Cloudinary creds invalid (API secret placeholder, 10 chars) → `401 Invalid Signature` → `renderPdf` throws 500 after PDFKit fallback.
2. **MongoDB hangs 10s** — unreachable Atlas URI leaves Mongoose buffering operations (`bufferCommands` default true) → signup/login/DB lookups time out.
3. **`npm run seed` broken** — package.json points to non-existent `src/utils/seed.js`.
4. **Card/Invoice export UX** — no fallback path when Cloudinary unavailable.
5. **Uploads static path relative** — breaks when server started from another CWD.
6. **Passkey login unsurfaced** — `PasskeyButton` exists but never rendered.
7. **OTP input doesn't reset** after failed 2FA verification.
8. **Stray corrupt files** from broken debug redirects.

## Task Steps

### Server — ✅ DONE
- [x] 1. `server/src/config/cloudinary.js` — added `isConfigured()` validation helper (checks cloud_name + api_key + api_secret, secret length ≥ 20)
- [x] 2. `server/src/controllers/exportController.js` — graceful Cloudinary fallback:
  - [x] a. `renderPdf`: if Cloudinary fails/misconfigured → return `{ downloadUrl }` instead of 500
  - [x] b. `renderCard`: safe upload, keep placeholder fallback
  - [x] c. Added `sendBufferResponse` helper; export endpoints never 500
  - [x] d. `GET /export/download/:assetId` streams PDF via PDFKit (verified 200)
  - [x] e. `GET /export/fetch?url=` — Cloudinary URL proxy (SSRF-safe)
- [x] 3. `server/src/config/db.js` — disabled Mongoose command buffering (`bufferCommands:false`, `bufferTimeoutMS:0`), fail-fast queries
- [x] 4. `server/src/utils/seed.js` — created working seed script (demo org + users + kit + assets)
- [x] 5. `server/package.json` — fixed `seed` script path → `node src/utils/seed.js`
- [x] 6. `server/src/index.js` — absolute uploads static path (`path.join(__dirname,'..','..','uploads')`)
- [x] 7. `server/src/utils/demoStore.js` — created shared in-memory demo store (user/org/kit/assets CRUD + stats + members)
- [x] 8. `server/src/controllers/demoController.js` — added asset CRUD, org update, member add; re-exported store functions
- [x] 9. `server/src/routes/demoRoutes.js` — added asset CRUD + org PUT + member POST routes; static `/brandkits/extract-colors` kept before `/:id`

### Client — ✅ DONE
- [x] 10. `client/src/pages/LoginPage.jsx` — added passkey sign-in button (register/login/credentials UI)
- [x] 11. `client/src/pages/TwoFactorPage.jsx` — reset OTP input after failed attempt (`otpKey` remount)
- [x] 12. `client/src/pages/InvoiceEditor.jsx` — handle `downloadUrl` / `downloadAsset` fallback for Export PDF
- [x] 13. `client/src/pages/LetterheadEditor.jsx` — handle `downloadUrl` / `downloadAsset` fallback for Export PDF
- [x] 14. `client/src/pages/Assets.jsx` — handle `downloadUrl`/`downloadFromUrl` fallback for PNG/PDF exports

### Cleanup & Verify — ✅ DONE
- [x] 15. Deleted corrupt/junk files (root + server/) — `server/{`, `server/body`, `server/console.*`, root `(`, `{`, `setError(...)`, `setLoading(...)`, `cb('ERR...`, `fs.appendFileSync(...)`, `srv_fresh.txt`, test scripts/logs)
- [x] 16. Restarted server (port 5000, current code), verified:
  - `GET /api/health` → 200
  - `POST /api/demo/login` → 200 (demo token)
  - `GET /api/demo/org` → 200 (Acme Corp)
  - `GET /api/demo/brandkits` → 200 (1 kit)
  - `GET /api/demo/assets` → 200 (3 assets)
  - `GET /api/demo/stats` → 200
  - `GET /api/demo/members` → 200 (2 members)
  - `POST /api/export/render-pdf` (invoice) → **200** with `downloadUrl` (was 500)
  - `GET /api/export/download/:id` → 200 (PDF stream)
  - `POST /api/demo/assets` (create) → 201
  - `POST /api/export/render-card` → 200 (placeholder export URL)
  - `PUT /api/demo/org` → 200
- [x] 17. Client `npm run build` → PASS (Vite 6.4.3, 517 modules)

## Notes
- Cloudinary `.env` API secret still placeholder (10 chars). The graceful fallback means Export buttons work anyway (PDFs stream directly via PDFKit; cards fall back to placeholder images). **To enable Cloudinary CDN uploads, add the real `CLOUDINARY_API_SECRET` to `.env`.**
- MongoDB Atlas URI is reachable from your network now (`cluster0.fiv3anf.mongodb.net` connects). If it ever becomes unreachable at runtime, `db.js` now fails fast (no 10s query hangs) and server startup still succeeds with demo endpoints available.
- Fabric.js (`fabric` 5.x) + `fabricjs-react` bundle cleanly in the client build — `CardEditor` compiles and renders correctly.

