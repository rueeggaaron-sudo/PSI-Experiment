# Export / Ingest Schema (Stand: 2025-10-30)

## Pfad
`exp/YYYY-MM-DD/<uid>-<timestamp>-<rand>.json` (private Objekte im Blob)

## Whitelist-Felder (JSON pro Session)
| Feld              | Typ     | Beschreibung                                        |
|-------------------|---------|-----------------------------------------------------|
| experiment_key    | string  | Experiment-Identifikator (z. B. `psychokinese`)      |
| experiment_version| string  | Optionale Versionsangabe je Experiment               |
| uid               | string  | Anonyme Browser-ID (localStorage)                    |
| ts                | number  | Zeitstempel (ms seit Epoch)                          |
| duration_min      | number  | Dauer (Minuten)                                      |
| speed_ms          | number  | Schrittintervall (ms)                                |
| start_field       | number  | Startfeld (1-basiert)                                |
| focus             | string  | 'cw', 'ccw' oder 'none'                              |
| steps             | number  | Schritte gesamt                                      |
| cw                | number  | Schritte Uhrzeigersinn                               |
| ccw               | number  | Schritte Gegenuhrzeigersinn                          |
| hits              | number  | Treffer (wenn Zielrichtung aktiv)                    |
| misses            | number  | Fehlversuche (wenn Zielrichtung aktiv)               |
| z                 | number  | z-Score (Approximation)                              |
| p                 | number  | p-Wert (Approximation)                               |
| bias_pct          | number  | Tendenzquote in Prozent (signiert)                   |
| target_z          | number  | z-Score relativ zur Zielrichtung                     |
| target_p          | number  | p-Wert relativ zur Zielrichtung                      |
| hit_rate          | number  | Trefferquote (0–1, wenn Zielrichtung aktiv)          |

## Export-Endpoint
`/api/exp/export?day=YYYY-MM-DD&format=csv|jsonl`  
- CSV: Headerlinie + Zeilen pro Session (Whitelist-Felder).  
- JSONL: eine JSON-Zeile pro Session.

## Datenschutz
Anonym (UID), keine PII. Aufbewahrung projektspezifisch.
