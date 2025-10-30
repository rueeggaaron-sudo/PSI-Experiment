# PSI-Experiment · Projekt

## Deployment Flow
- `dev` → Pre-Production (Vercel Preview)  
- `main` → Production  
PRs: Feature → `dev`, Release via PR `dev → main` (Checks/Build grün).

## Daten & Privacy
- Anonyme **UID** pro Browser (localStorage), **keine PII**, **keine Tracker**.  
- Session-Speicherung als einzelne Dateien im **Vercel Blob**.  
- Siehe `public/privacy.html` und `CONSENT.md`.

## Ergebnisse (UI)
- Trefferquote + **p-Badge** (Stufen von „Zufall“ bis „extrem stark“).  
- Diagramm optional (Achsen, Null-Linie, Zufallsbänder, Tooltip).  
- Session-Tabelle mit horizontalem Scroll für schmale Bildschirme.

## Export
- Endpoint: `/api/exp/export?day=YYYY-MM-DD&format=csv|jsonl`  
- Siehe `EXPORT_SCHEMA.md` für Felder.

## Entwickeln
- Keine externen Libs für Chart/Tooltip (pures Canvas/DOM).  
- API-Routen: Serverless (Node.js) statt Edge, damit `@vercel/blob` sicher läuft.
