# BrandOS — Brand Identity Suite

> **AI-powered brand identity management for modern teams.**  
> Manage brand kits, generate social cards, letterheads, and GST-ready invoices — all from one dashboard.

---

## ✨ Features

### 🎨 Brand Kits
- Define your brand colors, fonts, and logo in one place
- **AI Auto-Detect** — Upload a logo and Gemini API extracts your brand palette automatically
- Multiple kits per organization with one-click switching

### 🃏 Card Generator
- Drag-and-drop editor built on Fabric.js
- Pulls colors, fonts, and logo from your active brand kit
- Export to high-res PNG via Puppeteer

### 📄 Letterhead Generator
- Professional branded letterhead with your kit's identity
- A4-ready PDF export

### 🧾 Invoice Generator (GST-Aware)
- GSTIN, HSN codes, CGST/SGST auto-calculation (9% each)
- Line item entry with quantity/rate
- PDF export with full GST breakdown

### 👥 Multi-Tenant Organization
- Invite team members (owner / member roles)
- Usage stats dashboard
- Tier support: **Free** (10 exports/month) / **Pro** (unlimited)

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + React Router v6 + Fabric.js |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **AI Engine** | Google Gemini 1.5 Flash (color extraction) |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **File Storage** | Cloudinary (logo uploads) |
| **Rendering** | Puppeteer (HTML → PNG/PDF) |
| **Styling** | Brutalist CSS (custom, no framework) |

---

## 📦 Project Structure

```
BrandOS/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── api/             # API client functions
│   │   ├── components/      # Shared components (Layout)
