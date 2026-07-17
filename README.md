# BrandOS — Brand Identity Suite

> **AI-powered brand identity management for modern teams.**  
> Manage brand kits, generate social cards, letterheads, and GST-ready invoices — all from one dashboard. Built with the MERN stack and Google Gemini API.

---

## ✨ Features

### 🎨 Brand Kits
- Define your brand colors, fonts, and logo in one place
- **AI Auto-Detect** — Upload a logo and Gemini API extracts your brand palette automatically
- Multiple kits per organization with one-click switching
- Versioned updates for audit trail

### 🃏 Card Generator
- Visual editor built on Fabric.js canvas
- Pulls colors, fonts, and logo from your active brand kit
- Add text, images, and shapes with drag-and-drop
- Export to high-res PNG (1200×675)

### 📄 Letterhead Generator
- Professional A4 letterhead using your brand identity
- Add header, footer, and body content
- PDF export ready for print

### 🧾 Invoice Generator (GST-Aware)
- GSTIN field, HSN/SAC code support
- Line items with quantity/rate
- **CGST (9%) + SGST (9%) auto-calculation**
- PDF export with full GST breakdown

### 👥 Organization & Team
- Multi-tenant: each org has its own brand kits and assets
- Role-based access: **Owner** (full control) vs **Member** (create/edit)
- Invite team members
- Usage dashboard with stats

### 📊 SaaS Tier Model
- **Free tier**: 10 exports per month
- **Pro tier**: Unlimited exports
- Usage tracking and monthly counters built-in

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Fabric.js 5, Vite |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **AI Engine** | Google Gemini 1.5 Flash (vision-based color extraction) |
| **Authentication** | JWT (jsonwebtoken + bcryptjs) |
| **File Storage** | Cloudinary (logo uploads, multer) |
| **Rendering** | Puppeteer (HTML → PNG / PDF) |
| **Styling** | Custom Brutalist CSS (no framework) |

---

## 📦 Project Structure

```
BrandOS/
├── client/                          # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/                     # Axios API client functions
│   │   ├── components/              # Shared components (Layout)
│   │   ├── context/                 # Auth state management
│   │   ├── pages/                   # Route pages
│   │   ├── App.jsx                  # Router configuration
│   │   ├── main.jsx                 # Entry point
│   │   └── index.css                # Global brutalist styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                          # Express backend
│   ├── src/
│   │   ├── config/                  # DB, Cloudinary config
│   │   ├── controllers/            # Route handlers
│   │   ├── middleware/             # Auth, error handling
│   │   ├── models/                 # Mongoose schemas
│   │   ├── routes/                 # Express routers
│   │   └── index.js                # Express app entry
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## 🖥 Run Locally

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Google Gemini API key

### Step-by-step

```bash
# 1. Clone
git clone https://github.com/ChaudhariSwati/BrandOS.git
cd BrandOS

# 2. Server setup
cd server
npm install --legacy-peer-deps
cp .env.example .env   # Edit .env with your credentials

# Edit server/.env and fill in:
#   MONGO_URI, JWT_SECRET, CLOUDINARY_*, GEMINI_API_KEY

npm run dev            # Server starts at http://localhost:5000

# 3. Client setup (new terminal)
cd client
npm install
npm run dev            # Client starts at http://localhost:5173
```

Open **http://localhost:5173** → Sign up → Create a Brand Kit → Generate assets.

### Environment Variables (server/.env)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `JWT_EXPIRES_IN` | Token expiry (default: 7d) |
| `CLIENT_URL` | Frontend URL (http://localhost:5173) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## 🚢 Deployment

### Option A: Render (easiest)

**Backend (Web Service):**
1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New+** → **Web Service**
3. Connect your repo → **Root Directory**: `server`
4. **Build**: `npm install --legacy-peer-deps`
5. **Start**: `node src/index.js`
6. Add env vars (all from your `.env`)
7. Deploy → URL: `https://brandos-api.onrender.com`

**Frontend (Static Site):**
1. **New+** → **Static Site** → same repo
2. **Root Directory**: `client`
3. **Build**: `npm install && npm run build`
4. **Publish**: `client/dist`
5. Deploy → URL: `https://brandos-client.onrender.com`
6. Update `CLIENT_URL` in backend env to this frontend URL

### Option B: Vercel + Railway
- **Frontend** → Import `client/` into Vercel, build: `npm run build`, output: `dist`
- **Backend** → `cd server && npx railway up`, add env vars via Railway dashboard

---

## 🧠 AI Auto Color Extraction

The "AI Auto-Detect Colors" button in Brand Kit editor sends your logo URL to **Google Gemini 1.5 Flash**, which analyzes the image and returns the 5 most dominant hex colors.

**Flow:** Upload logo → Click "🤖 AI Auto-Detect" → Gemini extracts palette → Colors applied to kit.

---

## 🧾 GST Invoice Calculation

When GST is enabled:
- **CGST** = 9% of subtotal
- **SGST** = 9% of subtotal
- **Total** = Subtotal + CGST + SGST

---

## 🔐 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Create account + org | — |
| POST | `/api/auth/login` | Sign in | — |
| GET | `/api/auth/me` | Current user | JWT |
| GET/PUT | `/api/orgs/current` | Get/Update org | JWT |
| GET/POST | `/api/orgs/members` | List/Add members | JWT/Owner |
| GET | `/api/orgs/stats` | Usage stats | JWT |
| GET/POST | `/api/brandkits` | List/Create kits | JWT |
| GET/PUT/DELETE | `/api/brandkits/:id` | CRUD kit | JWT |
| POST | `/api/brandkits/:id/logo` | Upload logo | JWT |
| POST | `/api/brandkits/extract-colors` | Gemini extract | JWT |
| GET/POST | `/api/assets` | List/Create assets | JWT |
| GET/PUT/DELETE | `/api/assets/:id` | CRUD asset | JWT |
| POST | `/api/export/render-card` | Export PNG | JWT |
| POST | `/api/export/render-pdf` | Export PDF | JWT |

---

## 🗺 Roadmap

- [ ] AI copy generation (Gemini taglines)
- [ ] Social media templates
- [ ] Stripe/Razorpay payments
- [ ] Real-time team editing
- [ ] Brand guidelines PDF
- [ ] Multi-language invoices

---

## 📄 License

MIT © BrandOS

---

## 🙌 Contributing

Open an issue or PR on [GitHub](https://github.com/ChaudhariSwati/BrandOS).
