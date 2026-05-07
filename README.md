# Rate Your Bed

Honest reviews of hotel mattresses, sheets, and pillows. Built with React + Vite, deployed on Netlify, with Clerk for auth and Netlify Blobs for review storage.

Live at **rateyourbed.com**.

## How it works

- **Frontend**: React + Vite, served as a static site
- **Auth**: [Clerk](https://clerk.com) — free tier covers 10,000 monthly active users
- **Backend**: One Netlify Function (`netlify/functions/reviews.js`) handling GET/POST/DELETE
- **Storage**: Netlify Blobs (key-value store, included with Netlify)
- **Public reads, authed writes**: Anyone can browse ratings; only signed-in users can post or delete their own

## Each rating covers three things

- **Mattress** — star rating + firmness (Pillowy → Very Firm)
- **Sheets** — star rating + feel (Scratchy → Silky)
- **Pillows** — star rating + loft (Flat → Cloud)

Plus an overall rating, a free-text review, and the room/date.

---

## Deploy in ~10 minutes

You'll set up two services: **Clerk** (for auth) and **Netlify** (for hosting + storage). Both have free tiers that cover everything here.

### 1. Set up Clerk

1. Sign up at [clerk.com](https://clerk.com) (free).
2. Create a new application. Pick whichever sign-in methods you want (Email + Google works well).
3. Once created, go to **API Keys** in the Clerk dashboard.
4. You'll need two values:
   - **Publishable key** (starts with `pk_test_…` or `pk_live_…`) — safe to expose
   - **Secret key** (starts with `sk_test_…` or `sk_live_…`) — server-side only

Keep these tabs open; you'll paste them into Netlify in step 3.

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rate-your-bed.git
git push -u origin main
```

### 3. Connect to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) (free account).
2. **Add new site → Import an existing project** → choose GitHub → pick your repo.
3. Settings will auto-fill from `netlify.toml`. Before clicking Deploy, click **Add environment variables** (or do it later under **Site configuration → Environment variables**) and add:
   - `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk publishable key
   - `CLERK_SECRET_KEY` = your Clerk secret key
4. Click **Deploy**. First build takes ~1–2 minutes.

Done. Your site is live at `https://<random-name>.netlify.app`. You can rename it in Site settings.

> If you forget the env vars and the first build fails: add them, then **Deploys → Trigger deploy → Clear cache and deploy site**.

### 4. Connect rateyourbed.com

Once the site is live:
1. **Domain management → Add a domain you already own** → enter `rateyourbed.com`
2. Set the DNS records Netlify shows you at your registrar
3. SSL provisions automatically via Let's Encrypt
4. **Important for Clerk in production**: in Clerk Dashboard → Domains, add your production domain (`rateyourbed.com`). Then promote your Clerk instance to production keys (`pk_live_…` / `sk_live_…`) and update the Netlify env vars.

---

## Local development

You need a `.env` file with both Clerk keys:

```bash
cp .env.example .env
# then edit .env and paste in your real Clerk keys
```

Then:

```bash
npm install
npm install -g netlify-cli   # one-time, if not installed
netlify login                 # one-time, opens browser
npm run netlify-dev
```

Open `http://localhost:8888`. Sign-in works against your Clerk dev instance. Blobs uses a local sandbox, so you can post test ratings without touching production data.

> `npm run dev` (Vite alone) won't work because `/api/reviews` needs the functions runtime. Always use `netlify dev` locally.

---

## Project structure

```
rate-your-bed/
├── netlify/functions/reviews.js   ← API: GET / POST / DELETE
├── src/
│   ├── App.jsx                    ← Main React app
│   ├── main.jsx                   ← Entry + ClerkProvider
│   └── index.css                  ← Tailwind directives
├── index.html
├── netlify.toml                   ← Build config + /api redirect
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── .env.example                   ← Copy this to .env locally
└── .gitignore
```

---

## API surface

All routes live at `/api/reviews`:

| Method | Auth | Description |
|--------|------|-------------|
| `GET /api/reviews` | none | List all reviews |
| `GET /api/reviews?mine=true` | required | List only the signed-in user's reviews |
| `POST /api/reviews` | required | Add a review (server enforces userId from token) |
| `DELETE /api/reviews?id=…` | required | Delete a review (only if you own it) |

Auth is a Bearer token — Clerk's session JWT, retrieved from the frontend with `getToken()`. The backend verifies it with `@clerk/backend`'s `verifyToken`.

---

## What's stored, where

Reviews live in a Netlify Blobs store named `rate-your-bed` under key `reviews_v1` as a single JSON array. To inspect or wipe:

- **Inspect**: `netlify blobs:list rate-your-bed` (CLI) or the Blobs panel in Site settings
- **Reset**: delete the `reviews_v1` key — function auto-reseeds with sample data on next read

Each review is server-validated and length-clamped before storage. Users can only delete reviews where their Clerk `userId` matches.

---

## Cost

All on free tiers:

- **Netlify**: 100GB bandwidth, 125k function invocations, 1GB Blob storage / month
- **Clerk**: 10,000 monthly active users

You'd have to be doing real numbers to exceed any of these.

---

## Things to add later

- **Edit reviews** — currently only delete; add an "edit" path that re-uses the form
- **Photos** — Netlify Blobs supports binary uploads; add a file input
- **Spam protection** — Clerk requires sign-up which already filters most bots, but you might still want hCaptcha on the rating form for serious abuse
- **Hotel autocomplete** — Google Places or Nominatim
- **Helpful votes** — let users upvote useful reviews (Yelp-style)
- **Profile pages** — public-facing pages for each reviewer (currently only your own private "My Beds")
- **Concurrency** — single-key Blob storage means simultaneous POSTs could lose data; for serious traffic, switch to per-review keys with `store.list({ prefix: "review:" })`

Sleep well.
