# Kessel Sabacc

Sabacc as an installable web app (PWA) for desktop and phone, against one to three AI opponents,
in English and German. Two games:

- **Kessel Sabacc** with the rules from *Star Wars Outlaws*: two cards, three rounds, all 16 shift
  tokens.
- **Corellian Spike**, the game from *Solo*: make your cards add up to zero, with betting rounds,
  two pots and the spike dice.

**Play it: <https://maxrentzsch.github.io/kessel-sabacc/>**

## What is in it

- **Career** that starts on the desert world Tarsk, where a stake game wins you a ship and the
  debt that comes with it, then goes out into the Kessel sector: a story with three animals to
  choose from without being asked, Oshi's instalment to pay, four syndicates whose standing
  changes prices and seats, jobs on every table's board, fuel for every jump, house rules, duels
  against rivals, three stakes and a legend mode afterwards. The road ahead is in [ROADMAP.md](ROADMAP.md).
- **On Tour** (table after table for a growing pot), **Daily Hand** (one fixed table a day) and
  **Free Play** with your own rules – the place to play Corellian Spike, and to pass one device
  round between two to four people.
- **Long-term goals:** reputation and ranks, achievements, a collection of card backs, felt, chips
  and titles, and a ship of your own to upgrade.
- **At the table:** peeking with suspicion, a dealer droid, swipe gestures, tips from the AI, a
  practice hand and a rule book.
- **Saves** as a code, to back up a career or move it to another device (Profile).

Open ideas are collected in [IDEAS.md](IDEAS.md).

## Development

```bash
npm install
npm run dev            # dev server on http://localhost:5173
npm run dev -- --host  # also reachable on the local network, e.g. from a phone
npm test               # rule tests, AI simulation, translation catalogue
npm run build          # production build into dist/
npm run preview        # look at the build locally (including the service worker)
```

## Layout

| Folder | Contents |
|---|---|
| `src/engine` | The rules of Kessel Sabacc as a pure reducer: `applyAction(state, action) → { state, events }`. No React, deterministic from a seed. |
| `src/ai` | Kessel Sabacc: hand evaluation (`evaluate.ts`), move and token strategy (`policy.ts`). The opponents (`personalities.ts`) play both games. |
| `src/spike` | Corellian Spike, built the same way and kept apart: deck, hand ranking, reducer, AI. |
| `src/career` | Everything about progress: tables, venues, story, reputation, achievements, collection, ship, tour and daily hand, save codes. |
| `src/store` | Zustand stores: the running game, the career save, settings, navigation. |
| `src/i18n` | The two languages, see below. |
| `src/audio` | All sounds, generated at run time – there are no audio files. |
| `src/ui` | Screens, the two tables (`table`, `spike`), SVG artwork and design tokens. |
| `legacy/python` | The original Python prototype (different, simplified rules). |

The save, the settings and an interrupted game live in the browser's `localStorage`.
`src/career/balance.test.ts` plays the career with AI stand-ins and pins down the difficulty
curve; run it after touching opponents, tokens or payouts.

The app only works offline from a build and only over HTTPS (or `localhost`): browsers do not
allow a service worker otherwise. Loaded from the dev server over the local network it can be put
on a phone's home screen, but it keeps needing the connection to the computer there.

## Languages

German text in the source is the key of its translation. It is written with the `tx` tag, which
looks the text up in `src/i18n/en.ts` and falls back to the German:

```ts
tx`Noch ${n} wählen` // key "Noch {0} wählen" → "Pick {0} more"
```

`src/i18n/catalogue.test.ts` fails when a text has no English, when the catalogue holds something
that is no longer used, or when a translation drops a placeholder.

The language is chosen when the page loads (the saved choice, otherwise the browser's language)
and changed in the profile, which reloads the page.

## Publishing

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` through
GitHub Pages.

## Note

An unofficial fan project with no connection to Lucasfilm, Disney or Ubisoft. The look follows
Kessel Sabacc in *Star Wars Outlaws*; all artwork is hand-drawn SVG, no original assets are used.
The names of opponents and venues are made up.
