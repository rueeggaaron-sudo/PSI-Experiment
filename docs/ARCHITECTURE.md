# Architecture Overview (PSI-Experiment)

## Components
- **Client (Browser)** → Edge API (Vercel) → Blob Storage
- Eine Datei pro Session: `exp/YYYY-MM-DD/<uid|anon>-<timestamp>-<rand>.json`
- Export über `/api/exp/export?day=YYYY-MM-DD&format=csv|jsonl`

## Vorteile
- Kein Client-Secret
- Minimaler Betrieb, exportfreundlich
- Keine Race Conditions (eine Datei = eine Session)
