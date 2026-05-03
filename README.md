# Arogya Saathi

AI-assisted health companion with patient profiles, digital health ID / QR health passport, hospital file uploads, and medical chat APIs.

## Requirements

- Node.js 18+ (16+ minimum per `package.json`)
- npm

## Setup

```bash
git clone https://github.com/navyasree64/ArogyaSathi.git
cd ArogyaSathi
npm install
```

Copy `.env.example` to `.env` and fill in your Firebase (`VITE_FIREBASE_*`), optional `GEMINI_API_KEY`, `VITE_API_BASE_URL` (e.g. `http://localhost:3001`) if the frontend should call the health-passport API, and AWS/S3 variables if you use cloud storage. Never commit `.env` (it is gitignored).

For the API’s JSON store, see `data/README.md` — use `data/health-passport-store.example.json` as a template; the real `health-passport-store.json` stays local only.

## Run locally

**Frontend + API together:**

```bash
npm run dev:full
```

- App: http://localhost:5173/
- API: http://localhost:3001/

**Frontend only:**

```bash
npm run dev
```

**API only:**

```bash
npm run server
```

## Build

```bash
npm run build
npm run preview
```

## Repository layout

- Main patient + hospital app: repo root (`src/`, `server.js`)
- Optional companion module: `health-record-companion-main/`

## License

MIT (see `package.json`).
