# Kessel Sabacc

Kessel Sabacc als installierbare Web-App (PWA) für Mac und Handy, mit den Regeln aus
*Star Wars Outlaws*: zwei Karten, drei Runden, alle 16 Shift-Tokens – gegen 1–3 KI-Gegner.

## Was drin ist

- **Karriere** über sechs Schauplätze auf einer Sektorkarte, mit eigener Geschichte, Hausregeln,
  Rivalen-Duellen, drei Einsatzhöhen und einem Legendenmodus danach.
- **Auf Tour** (Tisch um Tisch um einen wachsenden Topf), **Tageshand** (ein fester Tisch pro Tag)
  und **freies Spiel** mit eigenen Regeln.
- **Langzeitziele:** Ruf und Ränge, Erfolge, eine Sammlung aus Kartenrücken, Filz, Chips und Titeln
  und das eigene Schiff, das sich ausbauen lässt.
- **Am Tisch:** Spähen mit Verdacht, ein Geber-Droide, Wischgesten, Tipps der KI, Übungshand und
  Regelbuch.
- **Spielstand** als Code sichern und auf ein anderes Gerät übertragen (Profil).

Offene Ideen stehen in [IDEEN.md](IDEEN.md).

## Entwickeln

```bash
npm install
npm run dev            # Dev-Server auf http://localhost:5173
npm run dev -- --host  # zusätzlich im WLAN erreichbar, z. B. fürs Handy
npm test               # Regel-Tests und KI-Simulation
npm run build          # Produktions-Build nach dist/
npm run preview        # Build lokal ansehen (inkl. Service Worker)
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/engine` | Regelwerk als reiner Reducer: `applyAction(state, action) → { state, events }`. Kein React, deterministisch über einen Seed. |
| `src/ai` | Handbewertung (`evaluate.ts`), Zug- und Token-Strategie (`policy.ts`), Gegner (`personalities.ts`). |
| `src/career` | Alles rund um den Fortschritt: Tische, Schauplätze, Geschichte, Ruf, Erfolge, Sammlung, Schiff, Tour und Tageshand, Spielstand-Codes. |
| `src/store` | Zustand-Stores: laufende Partie, Karriere-Spielstand, Einstellungen, Navigation. |
| `src/audio` | Alle Geräusche, zur Laufzeit erzeugt – es gibt keine Audiodateien. |
| `src/ui` | Screens, Spieltisch, SVG-Grafiken und Design-Tokens. |
| `legacy/python` | Der ursprüngliche Python-Prototyp (andere, vereinfachte Regeln). |

Spielstand, Einstellungen und eine unterbrochene Partie liegen im `localStorage` des Browsers.
`src/career/balance.test.ts` spielt die Karriere mit KI-Stellvertretern durch und hält die
Schwierigkeitskurve fest; wer an Gegnern, Tokens oder Auszahlungen dreht, sollte sie laufen lassen.

Offline funktioniert die App nur aus einem Build und nur über HTTPS (oder `localhost`): Der
Service Worker wird sonst vom Browser nicht zugelassen. Übers WLAN vom Dev-Server geladen lässt
sie sich aufs Handy legen, braucht dort aber weiter die Verbindung zum Rechner.

## Veröffentlichen

`.github/workflows/deploy.yml` baut bei jedem Push auf `main` und veröffentlicht `dist/` über
GitHub Pages. Dafür im Repository unter *Settings → Pages* als Quelle **GitHub Actions** wählen.

## Hinweis

Inoffizielles Fan-Projekt ohne Verbindung zu Lucasfilm, Disney oder Ubisoft. Das Aussehen orientiert
sich am Kessel Sabacc aus *Star Wars Outlaws*; alle Grafiken sind selbst gezeichnete SVGs, es werden
keine Original-Assets verwendet. Namen von Gegnern und Schauplätzen sind eigene Erfindungen.
