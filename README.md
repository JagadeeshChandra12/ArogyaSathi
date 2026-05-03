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

Create a `.env` file in the project root with your Firebase (`VITE_FIREBASE_*`), optional `GEMINI_API_KEY`, and AWS/S3 variables if you use cloud storage. Never commit `.env` (it is gitignored).

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
