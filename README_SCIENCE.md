# Science Notes · Daten & Auswertung (Stand: 2025-10-30)

## Ziel
Ergebnisse so erfassen, dass sichtbar wird, **wie stark sie vom Zufall abweichen** – ohne PII, ohne Tracking.

## Architektur (Kurzüberblick)
**Client (Browser)** → `/api/exp/submit` (**Serverless, Node.js**) → **Vercel Blob** (eine Datei pro Session).  
Export: `/api/exp/export?day=YYYY-MM-DD&format=csv|jsonl`.

## Datenprinzip
- **UID pro Browser** (localStorage) → erlaubt Zuordnung mehrerer Sessions derselben Person, ohne Identität offenzulegen.
- **One-record-per-file** → einfache Exporte, keine Append-Races.

## Kennzahlen
- **Trefferquote** (Anteil korrekter Schritte)  
- **Z-Score & p-Wert** (Approximation): Wie wahrscheinlich ist reiner Zufall?
- **Kumulierte Tendenz** (cw–ccw über die Zeit) für die Chart-Darstellung.

## Einfache Interpretation (p-Tiers)
- p ≥ 0.10 → **im Zufallsbereich**  
- 0.05 ≤ p < 0.10 → **leichte Tendenz zu Einflussnahme**  
- 0.01 ≤ p < 0.05 → **auffällige energetische Einflussnahme**  
- 0.001 ≤ p < 0.01 → **sehr starke energetische Einflussnahme**  
- p < 0.001 → **extrem starke energetische Einflussnahme**

## Darstellung in der UI
- **Kernwerte**: Trefferquote + p-Badge (mit obigen Stufen).  
- **Diagramm**: Achsen, Null-Linie, Zufallsbänder (±1.0·√n, ±1.96·√n), Tooltips; optional ein-/ausblendbar.
- **Responsiv**: Max-Breite, Session-Tabelle horizontal scrollbar.

## Datenschutz
- **Keine PII**, **keine Tracker**.  
- UID = zufällig, lokal gespeichert; ohne Rückschluss auf die Person.  
- Details in **CONSENT.md** und `public/privacy.html`.
