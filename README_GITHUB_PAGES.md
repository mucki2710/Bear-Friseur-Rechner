# Friseur-Rechner auf GitHub Pages

Diese Version ist als statische Web-App für GitHub Pages vorbereitet.

## Enthalten

- `index.html` – Oberfläche
- `styles.css` – Layout und Gestaltung
- `app.js` – Rechenlogik und Aufgabenmodus
- `task_templates.json` – Beispiele und Prüfungsaufgaben

## Neu in dieser Version

- Aufgabenbereich für Prüfungsaufgaben
- Auswahl nach Aufgabengebiet: Mischung oder Konzentration
- Aufgabentext mit Arbeitsauftrag
- Button zum Übernehmen der Werte in den Rechner
- Musterlösung mit ausblendbarer Anzeige

## Veröffentlichung auf GitHub Pages

1. Repository öffnen
2. Dateien hochladen
3. Unter **Settings → Pages** den gewünschten Branch wählen
4. Speichern

## Hinweis

Die Prüfungsaufgaben liegen in `task_templates.json` unter `exam_tasks`.
Dort kannst du später beliebig weitere Aufgaben ergänzen.


## Mobile/Android-Darstellung

Die CSS-Datei ist für kleinere Android-Displays kompakter optimiert. Falls Elemente noch zu groß wirken, Browser-Zoom auf 100 % prüfen und die aktuelle `styles.css` neu deployen.
