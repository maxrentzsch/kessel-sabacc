# Roadmap: from a card game to a full game

Where Kessel Sabacc could go after 1.2. Smaller ideas that do not belong to a phase stay in
[IDEAS.md](IDEAS.md). Sizes are rough: small (days), medium (one to two weeks), large (several weeks).

## Where we stand

- Two variants with pure, seeded rules engines and AI: Kessel Sabacc (`src/engine`) and Corellian
  Spike (`src/spike`). Corellian Spike is only in free play.
- A career of six tables on one sector map, duels, legend mode, stakes, the tour, the daily hand,
  the Sandrunner with five modules, a collection, 34 achievements and short story scenes.
- Peeking at an opponent's card with a suspicion meter; getting caught costs chips.
- German and English, enforced by a catalogue test.
- A static web app on GitHub Pages: no server, saves in `localStorage`, backup codes to move a save.
- All art is drawn in code (SVG and CSS); all sound is synthesised (`src/audio/sfx.ts`).

## Ground rules for everything below

1. **A free fan project.** No money, no ads, no store release under Star Wars names. Characters,
   places and syndicates stay our own; the feel follows *Star Wars Outlaws*, its cast does not.
2. **No server until phase 5.** Everything before that works offline on one device.
3. **Old saves keep working.** Every change to the save format comes with a migration and a test.
4. **Both languages, always.** No text ships in German only.
5. **Phones first.** Every addition to the table is measured on a phone before it ships.
6. **The economy is simulated again** whenever a phase adds a source or sink of credits
   (`balance.test.ts`, `progress.test.ts`).

## Phase 0 – Foundations (medium)

Nothing here is visible on its own; every later phase needs it.

- **One game session for both variants.** A session names its variant. Results, payouts,
  achievements, the result screen, the tour and the daily hand go through one path, so a
  Corellian Spike game can be a career table. Today Spike reports only "won or lost".
- **Every game is replayable.** All randomness that changes a game comes from the game's seed,
  including whether a peek is caught (today `Math.random`). Each game keeps its action log.
  This is the basis for replays, for "why did I lose" and for a verified leaderboard.
- **Saves that survive.** A versioned save with migrations; old saves are tested against the new
  format. The app asks the browser to keep its storage (`navigator.storage.persist()`); Safari
  may clear the storage of a site that is not installed and has not been opened for a week. After
  milestones the app suggests a backup code.
- **Story as data.** Scenes, choices, conditions and effects (flags, credits, standing with a
  syndicate) are described as data. A test walks the whole graph: every scene can be reached, no
  choice leads nowhere, every line exists in both languages.

**Done when:** a Spike table runs through the career in a test, a recorded game replays to the same
result, and a save from 1.2 loads unchanged.

## Phase 1 – Reading the table (medium to large)

Sabacc is played against people. This phase gives them something to read and the player
something to hide.

- **Tells.** Every character has one or two habits that give away a strong or weak hand: a
  drumming finger, a glance at the chips, a line of banter. They are shown, never labelled. How
  reliable they are depends on difficulty: easy opponents are honest about it, hard ones fake a
  tell now and then. Tells matter most in Corellian Spike, where there is betting.
- **Dossiers.** Each opponent gets a file: your record against them, the tokens they like, and the
  tells you have seen confirmed. A tell is written down once it has been followed by a revealed
  hand that proved it three times; a hand folded in Corellian Spike proves nothing.
- **Cheating, reworked.** Suspicion is kept per opponent rather than for the whole table; the
  sensors module then calms each opponent instead of the table. Next to peeking comes the sleeve:
  one card bought before the game can be swapped in once, with a short steadiness test. A setting
  replaces the test with a plain button and a fixed risk instead. The sleeve card is an extra
  card, so the engines must accept a card from outside the deck (their card-count tests change
  with it), and if its twin turns up at the reveal everybody at the table grows suspicious.
  Getting caught costs chips, and in the campaign it also costs standing.
- **Balance.** A bot that reads every tell perfectly may win at most a set share more than one
  that ignores them; cheating pays a little on average but ruins a game when it goes wrong. Both
  are checked by simulation.

**Done when:** tells, dossier and sleeve work in both variants, the simulations hold their limits,
and every new line exists in both languages.

## Phase 2 – The campaign: a debt and four syndicates (large)

The current story already says that the Sandrunner is impounded in Madame Oshi's hangar. The
campaign turns that into its spine.

- **The debt.** The player owes Oshi a sum, split into one instalment per chapter. Winnings can go
  towards it at any time; a chapter's last table opens only once its instalment is paid, so the
  debt cannot be ignored and nothing grows while the player is away. Being bailed out ("on the
  house") adds to the next instalment instead of being free money.
- **Four syndicates.** Each runs some tables. Standing with each goes from hostile to trusted. It
  opens or closes tables, changes prices, and decides whether an enforcer joins your table.
  An enforcer takes the place of one of the usual opponents; the table keeps its size.
  Standing changes with wins at their tables, with being caught, and with choices in scenes.
  Neutral tables such as the Rusty Anchor stay open whatever happens, and jobs can repair
  standing, so the player can never be locked out.
- **Jobs.** Scenes hand out jobs that use what the engines already know: win without tokens,
  beat someone by three chips, lose a hand on purpose to the right person. Jobs pay credits or
  standing.
- **Choices.** Two or three answers in a scene (charm, threaten, pay) with effects described in
  the story data. They change who sits at the table and in what mood.
- **Chapters.** Chapter 1 is today's Kessel sector and ends, as now, with the Kessel Crown: Oshi
  lets the Sandrunner out of her hangar, but the debt that put her there remains, and from now on
  the player flies for Oshi. A save from 1.2 lands in chapter 1 with the tables it has won; one
  that has already won the Crown starts chapter 2. Chapter 2 is a sector that plays Corellian
  Spike. The campaign ends when the last instalment is paid: the player is free of Oshi.
- **After the end.** Legend mode, the tour, the daily hand and the tournament of phase 3 remain.

**Done when:** chapters 1 and 2 can be played from start to finish, the story graph test passes,
and an old save continues in chapter 1 without losing anything.

## Phase 3 – The Sandrunner flies (large)

- **A galaxy map** above the sector maps: three sectors, each with its own variant, music and
  venues. The third plays Coruscant Shift or classic Sabacc (needs an engine, AI, art and rules
  of its own).
- **Modules that open the way.** New effects come on top of what the modules already do, so
  nothing bought before loses its worth: the engine (no effect so far) opens the third sector,
  sensors also show one tell of each opponent in advance, the lounge also holds the crew.
- **Crew.** Beaten rivals sign on. At most two fly along, each with one perk, such as a free
  reshuffle or a revealed tell. Each perk states which variant it works in, and the same effect
  never stacks with a module or token.
- **The Grand Tournament.** Eight players in a bracket, chips carried from table to table, a final
  table. It is the goal once the debt is paid and can be played again every season.

## Phase 4 – Presentation (medium, alongside the other phases)

- **Music** generated live in the browser, like the sound effects, so there is nothing to license:
  a cantina band whose intensity follows the size of the pot. Recorded music would need licences.
- **Big moments:** a slow reveal for a Pure Sabacc or a Sabacc Shift, patrons who react to big
  pots, the dealer droid at the Spike table as well.
- **Art:** a new Sandrunner in the hangar, achievement icons by category, small animations for
  tells (shared with phase 1).
- **Budget:** a steady frame rate on a phone from about 2020, measured before every release.

## Phase 5 – Playing together (medium, then large)

- **5a. One device, several players** (no server): two to four people pass the phone, each hand
  stays hidden between turns, empty seats go to the AI. Cheating only works against AI seats.
- **5b. A leaderboard for the daily hand** (small server): the app sends the action log of the
  day's game, the server replays it with the day's seed and only then accepts the score. That
  stops invented scores but not foreknowledge: today the day's seed follows from the date, so
  anyone who reads the code can work out the deck before playing. For the leaderboard the server
  hands out the day's seed only when a game starts, once per device. Fully fair is only a game in
  which the server deals card by card, which comes with 5c. Players choose a nickname; no
  account, no email.
- **5c. Private tables online** (larger server): an invitation link, the server runs the same
  engines (they are pure functions and run there unchanged) and decides every move. Cheating is
  switched off between people; the AI fills empty seats.
- A server costs money and upkeep; free tiers (for example Cloudflare Workers) cover a small
  audience. Setting it up needs an account in your name.

## Alongside every phase

- Table polish: the pile labels, the instruction line at the Spike table, the bottom bar on wide
  screens.
- Share the daily hand as a short text; look up the rules at the table; a colour-blind mode and a
  left-handed layout.

## Order and releases

| Release | Contents |
|---|---|
| 1.3 | Phase 0, table polish, the new menu design |
| 1.4 | Phase 1: tells, dossiers, the sleeve; 5a (one device, several players) |
| 2.0 | Phase 2: the campaign, chapters 1 and 2 |
| 2.x | Phase 3: galaxy, crew, third variant, Grand Tournament; phase 4 throughout |
| 3.0 | 5b and 5c: leaderboard and online tables |

Phase 1 comes before the campaign because the campaign's jobs and enforcers lean on tells and
suspicion per opponent.

## Review: gaps found while writing this, and how the plan closes them

| Gap | Where it is closed |
|---|---|
| A verified leaderboard needs games that replay exactly; whether a peek is caught is decided by unseeded chance today. | Phase 0: all game randomness from the seed, action log. |
| The daily seed can be worked out from the date, so the cards can be known before playing. | Phase 5b: the server hands out the seed at the start; fully fair only with the server dealing (5c). |
| Winning the Crown already frees the ship in today's story; a campaign that frees the ship at the end would contradict saves that have done it. | Phase 2: the Crown frees the ship, the debt remains; such saves start in chapter 2. |
| A card from the sleeve is a duplicate the engines do not allow. | Phase 1: the engines accept an outside card; its twin at the reveal raises suspicion. |
| A debt the player can simply ignore is no spine. | Phase 2: each chapter's last table needs its instalment. |
| New module effects could devalue upgrades already bought. | Phase 3: new effects are added on top, never instead. |
| Safari may clear a site's storage after a week without a visit; a campaign makes that loss much worse. | Phase 0: ask for persistent storage, backup reminders. Cloud sync only once there is a server. |
| Corellian Spike cannot be a career table while it has its own results path. | Phase 0: one session for both variants. |
| A debt that grows by real days punishes anyone who takes a break. | Phase 2: interest per chapter. |
| Hostile syndicates could close every table and lock the player out. | Phase 2: neutral tables always open, jobs repair standing. |
| Free bail-outs would undercut the debt story and could be used to farm credits. | Phase 2: bail-outs add to the debt. |
| Tells could make the AI trivially beatable. | Phase 1: reliability by difficulty, faked tells, a simulated limit. |
| Cheating against real people is not fun and not fair. | Phase 5: cheating only against AI seats. |
| A timing test excludes some players. | Phase 1: a setting with a plain button and fixed risk. |
| Players with a career from 1.2 must not start over. | Phase 2: old saves keep the tables they have won; migration test. |
| Every phase adds income; the tuned economy would drift. | Ground rule 6: simulate again each phase. |
| Crew perks, modules and tokens could add up to one overwhelming effect. | Phase 3: at most two crew, no stacking of the same effect, the variant stated. |
| Spike has no shift tokens, so jobs and perks written for Kessel may mean nothing there. | Phases 2 and 3: every job and perk names its variant. |
| The bigger the project, the more attention from the rights holder. | Ground rule 1: free, no store, own characters; the fan-project notice the README has also goes into the app. |
| The story in two languages doubles the writing. | Phase 0: story as data, covered by the catalogue test; chapters are written in both languages at once. |
| More animation at the table threatens the frame rate that 1.0 fought for. | Phase 4: a frame-rate budget checked before every release. |

## Decisions that are yours

1. The premise: a debt to Madame Oshi that outlasts the Kessel Crown, four syndicates of our own.
   Agreed, or a different story?
2. A server for phase 5: are you willing to create a free account for it when the time comes?
3. The third variant: Coruscant Shift or classic Sabacc?
4. Music: generated in the browser (free, more synthetic) or recorded (needs licences)?
