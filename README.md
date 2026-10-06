# Live Stream — Mobile PWA

A mobile live-stream viewer UI, built with **Next.js (App Router) + TypeScript**, installable as a **PWA**. All data (viewer count, comments, reactions) is mock data in `src/components/LiveStreamScreen.tsx` — wire it up to your real chat/stream API when ready.

## What's inside

- `src/app/` — App Router pages, layout, metadata and the generated `manifest.webmanifest` (`src/app/manifest.ts`)
- `src/components/LiveStreamScreen.tsx` — the live-stream screen (viewer count, LIVE badge, scrolling comment ticker, floating reactions, comment input)
- `src/components/ServiceWorkerRegister.tsx` — registers `public/sw.js` in production
- `public/sw.js` — a minimal network-first service worker (offline fallback to the cached shell)
- `public/icons/` — placeholder app icons (192×192, 512×512) — swap these for your real branding before shipping

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build && npm run start   # production build, with the service worker active
```

The service worker only registers in production (`npm run build && npm run start`), not in `next dev`.

## Push to GitHub

```bash
git init   # already initialized by create-next-app if this is a fresh clone
git add .
git commit -m "Initial commit: live stream PWA"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Deploy to Vercel (auto-deploy from `main`)

1. Go to https://vercel.com/new and "Import" your GitHub repository (connect your GitHub account if you haven't).
2. Vercel auto-detects Next.js — leave the default build settings (`next build`) as is.
3. Click **Deploy**. Every future push to `main` will trigger a new production deployment automatically; pushes to other branches get their own preview deployments.
4. Once deployed, open the site on a phone and use "Add to Home Screen" (iOS Safari) or the install prompt (Android Chrome / desktop Chrome) to install it as a PWA.

### Before going to production

- Replace `public/icons/icon-192.png` / `icon-512.png` with real artwork (same filenames, or update `src/app/manifest.ts`).
- Replace the mock data in `LiveStreamScreen.tsx` with a real comment/reaction feed (e.g. WebSocket, SSE, or polling).
- Swap the placeholder gradient (`.videoBg` in `LiveStreamScreen.module.css`) for your actual `<video>` element or player embed.
