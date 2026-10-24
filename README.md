# PSI Experiment

## Lokale Inhaltsprüfung

Mit `python3 scripts/check_static_content.py` werden HTML-Grundstruktur, lokale Datei- und Fragmentverweise in `public/index.html` sowie JSON-Syntax und lokale Manifest-Icons geprüft. Der Check führt kein JavaScript aus, testet keinen Produktablauf, prüft keine Sicherheit und kontaktiert keinen Provider.

Die beiden Manifest-Icons verweisen auf vorhandene PNG-Dateien mit 192 × 192 beziehungsweise 512 × 512 Pixeln. Die lokale Inhaltsprüfung wurde am 24.10.2026 mit Python 3.14.7 erfolgreich ausgeführt. Sie benötigt nur die Python-Standardbibliothek und keine Installation oder Datenbank.

Der aktuelle Übergabestand und die Grenzen der Prüfung stehen in [docs/agent-handoff.md](docs/agent-handoff.md).
