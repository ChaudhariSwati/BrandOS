# BrandOS Production Authentication System

## Overview
Build a production-grade authentication system matching modern SaaS products (Google, GitHub, Vercel, Notion). The system includes email/password auth, Google OAuth, passkey (WebAuthn) support, forgot password flow, email verification, two-factor authentication, and comprehensive security measures.

---

## Backend Implementation

### Phase 1: Model Updates ✅
- [x] **User Model Update** (`server/src/models/User.js`)
- [x] **New Model: PasswordResetToken** (`server/src/models/PasswordResetToken.js`)
- [x] **New Model: EmailVerificationToken** (`server/src/models/EmailVerificationToken.js`)
- [x] **New Model: OTPRecord** (`server/src/models/OTPRecord.js`)
- [x] **New Model: PasskeyCredential** (`server/src/models/PasskeyCredential.js`)

### Phase 2: New Controllers ✅
- [x] **Reset Password Controller** (`server/src/controllers/resetPasswordController.js`)
- [x] **Email Verification Controller** (`server/src/controllers/emailVerificationController.js`)
- [x] **Two-Factor Auth Controller** (`server/src/controllers/twoFactorController.js`)
- [x] **Passkey Controller** (`server/src/controllers/passkeyController.js`)

### Phase 3: Route Updates ✅
- [x] **Auth Routes Update** (`server/src/routes/authRoutes.js`)

### Phase 4: Middleware & Utils Updates ✅
- [x] **Auth Middleware Update** (`server/src/middleware/authMiddleware.js`)
- [x] **Email Utility** (`server/src/utils/email.js`)
- [x] **TOTP Utility** (`server/src/utils/totp.js`)

### Phase 5: Security Enhancements
- [ ] Input sanitization middleware (strip XSS)
- [ ] CSRF token protection
- [ ] Secure error messages

### Phase 5: Security Enhancements
- [ ] Input sanitization middleware (strip XSS)
- [ ] CSRF token protection for state-changing requests
- [ ] Consistent secure error messages (never reveal if email exists)
- [ ] Rate limiting on password reset, 2FA, email verification endpoints

---

## Frontend Implementation

### Phase 6: Reusable UI Components
- [ ] **PasswordStrengthIndicator** (`client/src/components/auth/PasswordStrengthIndicator.jsx`):
  - Real-time password strength meter (0-100%)
  - Requirement checklist: uppercase, lowercase, number, special char, 8+ chars
  - Color-coded bar (red → orange → yellow → green)

- [ ] **OTPInput** (`client/src/components/auth/OTPInput.jsx`):
  - 6 separate digit input boxes
  - Auto-focus on next input after typing
  - Paste support (auto-fills all 6 boxes)
  - Backspace to go back
  - Accessible ARIA labels

- [ ] **GoogleButton** (`client/src/components/auth/GoogleButton.jsx`):
  - Official Google branding
  - "Continue with Google" text
  - Loading state
  - Proper Google OAuth popup flow

- [ ] **PasskeyButton** (`client/src/components/auth/PasskeyButton.jsx`):
  - "Sign in with Passkey" or "Register Passkey" 
  - Shows only if WebAuthn is supported
  - Loading state
  - Fallback message if unsupported

- [ ] **Toast** (`client/src/components/ui/Toast.jsx`):
  - Success, error, info, warning variants
  - Auto-dismiss with configurable duration
  - Slide-in/out animation
  - Close button

- [ ] **SuccessCard** (`client/src/components/ui/SuccessCard.jsx`):
  - Checkmark animation
  - Title and description
  - Optional action button
  - Confetti/celebration effect

### Phase 7: Auth Pages
- [ ] **ForgotPasswordPage** (`client/src/pages/ForgotPasswordPage.jsx`):
  - Email input with validation
  - "Send Reset Link" button with loading state
  - Success screen: "Check your email" with icon
  - Link back to Sign In
  - Animations and transitions

- [ ] **ResetPasswordPage** (`client/src/pages/ResetPasswordPage.jsx`):
  - Extract token from URL params
  - Validate token on mount (show error if invalid/expired)
  - New password + confirm password inputs
  - Password strength indicator
  - Show/hide password toggles
  - Success card with "Go to Sign In" button
  - Error handling for expired/invalid/used tokens

- [ ] **VerifyEmailPage** (`client/src/pages/VerifyEmailPage.jsx`):
  - Extract token from URL params
  - Verify on mount
  - Success state with animation
  - Error state with "Resend Verification" button
  - Countdown timer for resend (60s)

- [ ] **TwoFactorPage** (`client/src/pages/TwoFactorPage.jsx`):
  - OTP input (6 digits)
  - "Verify" button
  - "Resend OTP" with countdown
  - QR code display for initial setup
  - Backup codes display
  - Auto-submit when all 6 digits entered

### Phase 8: Auth Page Upgrades
- [ ] **LoginPage Upgrade** (`client/src/pages/LoginPage.jsx`):
  - "Continue with Google" button at top
  - "Sign in with Passkey" button (if WebAuthn supported)
  - "Remember me" checkbox
  - "Forgot password?" link below password field
  - Password show/hide toggle
  - Enter key submits form
  - Loading spinner on submit
  - Error messages inline
  - Smooth page transitions
  - ARIA labels for accessibility
  - Responsive design

- [ ] **SignupPage Upgrade** (`client/src/pages/SignupPage.jsx`):
  - "Continue with Google" button at top
  - Full Name input
  - Email input with real-time format validation
  - Password input with strength meter
  - Confirm Password input with match validation
  - Accept Terms & Privacy Policy checkbox
  - Optional: Newsletter checkbox
  - Duplicate email handling (async check)
  - Password requirement checklist
  - Loading state on submit
  - Success/error toast notifications
  - Smooth animations

### Phase 9: Context & API Updates
- [ ] **AuthContext Update** (`client/src/context/AuthContext.jsx`):
  - Add `forgotPassword(email)` method
  - Add `resetPassword(token, password)` method
  - Add `sendVerificationEmail()` method
  - Add `verifyEmail(token)` method
  - Add `enable2FA()` / `verify2FA(code)` / `disable2FA(password)` methods
  - Add `verify2FALogin(code, tempToken)` method
  - Add `registerPasskey()` / `loginWithPasskey()` methods
  - Add `rememberMe` state handling
  - Add `emailVerified` state
  - Add `twoFactorEnabled` state
  - Session refresh logic
  - logout from all devices

- [ ] **Auth API Update** (`client/src/api/auth.js`):
  - Add all new API call functions matching backend endpoints

### Phase 10: Routing Updates
- [ ] **App.jsx Update** (`client/src/App.jsx`):
  - Add routes: `/forgot-password`, `/reset-password/:token`, `/verify-email/:token`, `/2fa`
  - Protected route enhancements (check email verification, 2FA)
  - Auth redirect logic

### Phase 11: CSS & Animations
- [ ] **CSS Enhancements** (`client/src/index.css`):
  - Password strength meter styles
  - OTP input styles
  - Google Button styles
  - Passkey button styles
  - Toast notification styles
  - Success card styles
  - Forgot password page styles
  - Reset password page styles
  - Two-factor auth page styles
  - Animations (fade, slide, scale)
  - Focus states for accessibility
  - High contrast mode support
  - Responsive auth pages

### Phase 12: Backend Index.js Update
- [ ] **Server Index Update** (`server/src/index.js`):
  - Register new route files

---

## Dependencies to Install

### Backend
- `nodemailer` (for sending emails)
- `otplib` (for TOTP - two factor auth)
- `qrcode` (for generating QR codes for 2FA setup)
- `@simplewebauthn/server` (WebAuthn passkey support)
- `xss` (input sanitization)

### Frontend
- `@simplewebauthn/browser` (WebAuthn passkey support on client)
- `framer-motion` (smooth animations)
- `react-hot-toast` or custom toast (notification system)

---

## Testing Plan
1. Test full signup flow with email verification
2. Test login with email/password
3. Test Google OAuth login
4. Test forgot password → reset password flow
5. Test 2FA enable → login with 2FA
6. Test passkey registration → passkey login
7. Test session refresh
8. Test logout from current device
9. Test logout from all devices
10. Test rate limiting on auth endpoints
11. Test error states and edge cases
12. Test accessibility (keyboard nav, screen reader)
13. Test responsive layout

