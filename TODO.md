# Password Reset Email Fix - Implementation Plan

## Problem
Forgot password emails are logged to server console in dev mode instead of being sent.

## Steps

### ✅ 1. Update `server/src/utils/email.js`
- Added in-memory dev email store (`devEmailStore`)
- In dev mode, emails are captured in the store and logged to console
- Added `getDevEmails()` and `clearDevEmails()` export functions

### ✅ 2. Update `server/src/index.js`
- Added dev-only route `GET /api/dev/emails` to retrieve captured emails (protected by NODE_ENV check)

### ✅ 3. Update `client/src/api/auth.js`
- Added `getDevEmails()` API function

### ✅ 4. Update `client/src/pages/ForgotPasswordPage.jsx`
- Added "Dev Mail Inbox" panel that appears after sending a reset request
- Shows captured reset links with clickable URLs
- Includes refresh button to fetch latest emails

### ✅ 5. Restart server and test
Both server (port 5000) and client (port 5173) are running. The dev mail inbox feature is now available.

