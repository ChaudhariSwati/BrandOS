# BrandOS Fix Plan — Task List

## Previous Root Causes Found
1. **Export PDF buttons 500** — Cloudinary creds invalid (API secret placeholder, 10 chars) → `401 Invalid Signature` → `renderPdf` throws 500 after PDFKit fallback.
2. **MongoDB hangs 10s** — unreachable Atlas URI leaves Mongoose buffering operations (`bufferCommands` default true) → signup/login/DB lookups time out.
3. **`npm run seed` broken** — package.json points to non-existent `src/utils/seed.js`.

---

## Current Fix — Render Backend Crash (exits early, no output)

### Goal
Fix the "Application exited early with no output" crash on Render by making startup errors visible and removing Render-specific crash risks.

### Steps
- [x] 1. Edit `server/src/utils/logger.js` — always add Console transport (even in production)
- [x] 2. Edit `server/src/index.js` — add early visible startup/crash logging
- [x] 3. Edit `server/package.json` — move `mongodb-memory-server` to devDependencies
- [x] 4. Edit `server/src/config/cloudinary.js` — safe fallback if credentials missing
- [x] 5. Test server boots locally in production mode
- [ ] 6. (Manual) Commit, push, redeploy on Render and check logs

