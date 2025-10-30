# Export / Ingest Schema (Stand: 2025-10-30)

## Pfad
`exp/YYYY-MM-DD/<uid>-<timestamp>-<rand>.json` (private Objekte im Blob)

## Whitelist-Felder (JSON pro Session)
| Feld          | Typ     | Beschreibung                                   |
|---------------|---------|------------------------------------------------|
| uid           | string  | Anonyme Browser-ID (localStorage)              |
| ts            | number  | Zeitstempel (ms seit Epoch)                    |
| duration_min  | number  | Dauer (Minuten)                                |
| speed_ms      | number  | Schrittintervall (ms)                          |
| start_field   | number  | Startfeld (1-basiert)                          |
| focus         | string  | 'Uhrzeigersinn' oder 'Gegenuhrzeigersinn'      |
| steps         | number  | Schritte gesamt                                |
| cw            | number  | Schritte Uhrzeigersinn                         |
| ccw           | number  | Schritte Gegenuhrzeigersinn                    |
| hits          | number  | Treffer                                        |
| misses        | number  | Fehlversuche                                   |
| z             | number  | z-Score (Approximation)                        |
| p             | number  | p-Wert (Approximation)                         |
| hit_rate      | number  | Trefferquote (0–1)                             |

## Export-Endpoint
`/api/exp/export?day=YYYY-MM-DD&format=csv|jsonl`  
- CSV: Headerlinie + Zeilen pro Session (Whitelist-Felder).  
- JSONL: eine JSON-Zeile pro Session.

## Datenschutz
Anonym (UID), keine PII. Aufbewahrung projektspezifisch.
