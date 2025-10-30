# Experiment Ingest Schema

| Feld | Typ | Beschreibung |
|-------|------|--------------|
| uid | string | anonyme Browser-ID (optional) |
| ts | number | Zeitstempel (ms seit Epoch) |
| duration_min | number | Dauer der Session (Minuten) |
| speed_ms | number | Geschwindigkeit (ms) |
| start_field | number | Startfeld |
| focus | string | 'cw' oder 'ccw' |
| steps | number | Schritte gesamt |
| cw | number | Schritte Uhrzeigersinn |
| ccw | number | Schritte Gegenuhrzeigersinn |
| hits | number | Treffer |
| misses | number | Fehlversuche |
| z | number | Z-Wert |
| p | number | P-Wert |

**Speicherort:** `exp/YYYY-MM-DD/<uid|anon>-<timestamp>-<rand>.json`
