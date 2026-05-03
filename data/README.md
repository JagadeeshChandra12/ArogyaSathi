# Local data (development)

The API server writes **`health-passport-store.json`** here at runtime. That file can contain **tokens and patient-linked data** and must **not** be committed.

**First-time setup**

1. Copy the example store (or let the server create a fresh file on first request):

   ```bash
   cp health-passport-store.example.json health-passport-store.json
   ```

2. Or delete `health-passport-store.json` and start the server — it will create an empty store.

**Git**

- Tracked: this README + `health-passport-store.example.json`
- Ignored: `health-passport-store.json`, `summaries/` (local PDF fallbacks)
