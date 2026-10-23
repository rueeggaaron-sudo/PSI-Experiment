# PSI Experiment

## Lokale Inhaltsprüfung

Mit `python3 scripts/check_static_content.py` werden HTML-Grundstruktur, lokale Datei- und Fragmentverweise in `public/index.html` sowie JSON-Syntax und lokale Manifest-Icons geprüft. Der Check führt kein JavaScript aus, testet keinen Produktablauf, prüft keine Sicherheit und kontaktiert keinen Provider.

Stand 23.10.2026 schlägt der Check bei zwei nicht vorhandenen Icon-Dateien fehl, die im Webmanifest referenziert sind. Diese Asset-Referenzen bleiben als offener Befund erhalten; das Gate gilt bis zur Produktkorrektur als nicht bestanden.
