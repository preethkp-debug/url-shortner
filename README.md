# Snip — a bit.ly-like URL shortener

A serverless URL shortener built for **Vercel + Supabase**.
Modern minimal UI, custom aliases, click analytics, QR codes, and a dashboard.

## Features

- Paste any URL → get a clean short link
- Custom aliases (`/my-launch` instead of random characters)
- Click analytics — total clicks and last-visit timestamp per link
- QR code generation (downloadable PNG)
- Dashboard with copy / QR / delete actions
- Globally edge-cached frontend, low-latency Postgres backend

## Tech stack

| Layer       | Choice                                |
| ----------- | ------------------------------------- |
| Hosting     | Vercel (serverless Node functions)    |
| Database    | Supabase Postgres                     |
| Short codes | `nanoid` (6-char URL-safe)            |
| QR codes    | `qrcode` (Node lib, PNG/data-URL)     |
| Frontend    | Vanilla HTML / CSS / JS               |

## Project structure

```
.
├── api/
│   ├── _lib/
│   │   └── supabase.js     # shared Supabase client
│   ├── shorten.js          # POST /api/shorten
│   ├── list.js             # GET  /api/links     (via rewrite)
│   ├── delete.js           # DEL  /api/links/:code (via rewrite)
│   ├── qr.js               # GET  /api/links/:code/qr (via rewrite)
│   └── redirect.js         # GET  /:code → 302 (via rewrite)
├── public/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── 404.html
├── vercel.json             # rewrites for nice URLs
├── package.json
├── .env.example
└── README.md
```

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Var            | Value                                            |
| -------------- | ------------------------------------------------ |
| `SUPABASE_URL` | `https://<your-project-ref>.supabase.co`          |
| `SUPABASE_KEY` | Publishable key from Supabase → API → API keys   |

## Deploy

Push to GitHub and import the repo in the Vercel dashboard. Set the two env
vars above, then deploy. Subsequent pushes auto-deploy.

## API

| Method | Path                       | Body / Returns                              |
| ------ | -------------------------- | ------------------------------------------- |
| POST   | `/api/shorten`             | `{ url, alias? }` → `{ code, short_url, … }` |
| GET    | `/api/links`               | `{ links: [...] }`                          |
| GET    | `/api/links/:code/qr`      | `{ short_url, qr }` (PNG data URL)          |
| DELETE | `/api/links/:code`         | `{ ok: true }`                              |
| GET    | `/:code`                   | 302 redirect, increments click counter      |

## Notes

- Aliases must match `^[a-zA-Z0-9_-]{3,32}$` and not collide with reserved words.
- Click increments use an atomic Postgres function (`snip_increment_clicks`).
- RLS is enabled with permissive policies suitable for a public shortener.

MIT.
