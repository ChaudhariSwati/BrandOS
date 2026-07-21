# BrandOS Fixes & Google OAuth Implementation

## Steps

### Backend
1. [x] Install `google-auth-library` dependency
2. [x] Add Google OAuth controller in `authController.js`
3. [x] Add Google OAuth route in `authRoutes.js`
3. [x] Add `googleId` field to User model

### Frontend API & Auth Context
4. [x] Add `googleLogin` in `client/src/api/auth.js`
5. [x] Add `googleLogin` method in `client/src/context/AuthContext.jsx`

### LoginPage
6. [x] Add password show/hide toggle
7. [x] Add "Sign in with Google" button

### SignupPage
8. [x] Add password show/hide toggle
9. [x] Add "Sign in with Google" button

### CSS
10. [x] Add styles for password toggle

### Fix 404 Issues
11. [ ] Investigate `/api/demo/org` 404 — check deployment sync
12. [ ] Investigate `/api/export/render-card` 404 — check deployment sync

### Deployment Notes
- Set `VITE_GOOGLE_CLIENT_ID` in client environment (Vercel dashboard)
- Set `GOOGLE_CLIENT_ID` in server environment (Render dashboard)
- Redeploy both frontend and backend after setting env vars

