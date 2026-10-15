# Roadmap: from a card game to a full game

Where Kessel Sabacc could go after 1.2. Smaller ideas that do not belong to a phase stay in
[IDEAS.md](IDEAS.md). Sizes are rough: small (days), medium (one to two weeks), large (several weeks).

## Where we stand

- Two variants with pure, seeded rules engines and AI: Kessel Sabacc (`src/engine`) and Corellian
  Spike (`src/spike`), both in the career since 2.0.
- A career over three charts: Tarsk, the Kessel sector (act 1) and the trade route (act 2), with
  duels, legend mode, stakes, jobs, syndicates, the tour, the daily hand, the Sandrunner with five
  modules, a collection, achievements and story scenes. Acts 3 and 4 are still to come.
- Peeking with suspicion per opponent and the sleeve, in both variants; one device for several
  players, in both variants.
- German and English, enforced by a catalogue test.
- A static web app on GitHub Pages: no server, saves in `localStorage`, backup codes to move a save.
- All art is drawn in code (SVG and CSS); all sound is synthesised (`src/audio/sfx.ts`).

## Ground rules for everything below

1. **A free fan project.** No money, no ads, no store release under Star Wars names. Characters,
   places and syndicates stay our own; the feel follows *Star Wars Outlaws*, its cast does not.
   Animals may be real species from the galaxy.
2. **No server until phase 7.** Everything before that works offline on one device.
3. **Old saves keep working.** Every change to the save format comes with a migration and a test.
4. **Both languages, always.** No text ships in German only.
5. **Phones first.** Every addition to the table is measured on a phone before it ships.
6. **The economy is simulated again** whenever a phase adds a source or sink of credits
   (`balance.test.ts`, `progress.test.ts`).
7. **One new thing per game.** A new variant, a new system or a new mechanic is never introduced
   in the same game as another one.

## The campaign in short

You are stranded on the desert world Tarsk. At a card table you win a ship, and with the ship its
debt. A prologue on the ground, a launch into space, then four acts, each in a sector of its own
with a Sabacc variant of its own.

| Part | Variant | Where | Goal |
|---|---|---|---|
| Prologue | Kessel Sabacc | Tarsk, one planet, four tables | Learn to play, win the Sandrunner, inherit the debt |
| The launch | – | From the landing field to the stars | The planet map becomes the sector map |
| Act 1: Hull Debt | Kessel Sabacc | Kessel sector, six tables | First instalment, 6,000; the jump lock must go |
| Act 2: The Trade Route | Corellian Spike | Shipyards and trade stations, seven tables | Second instalment, 12,000; understand the nav computer |
| Act 3: The Core | Coruscant Shift | Undercity, penthouses, orbit, seven tables | Third instalment, 22,000, or steal the ledger |
| Act 4: The Empty Crown | all three | A lost casino station | The tournament that decides who owns the station |

Instalments are provisional and will be set by simulation.

**Why the story holds.** Without a ship and without money for a passage you are stuck on Tarsk,
so you play your way up its tables. Mira Sol has been hiding her freighter from Oshi's bailiffs
and needs 2,000 credits by morning; she stakes the ship against that sum at the table where she
expects the easiest mark, yours, and Pim and Kessk lend you the stake. You win, and Brakk steps
out of the dark with Oshi's note: 40,000 credits, entered against the hull. On Tarsk a debt
belongs to the ship, not to the pilot. Oshi does not simply seize the ship because she cannot use
it alone: its old nav computer holds encrypted coordinates to the Empty Crown, a casino station
that vanished thirty years ago with its vault, and the keys lie at the tables of the other
syndicates. Her mechanics lock the hyperdrive to the sector until the first instalment is paid.

## Phase 0 – Foundations (medium)

Nothing here is visible on its own; every later phase needs it.

- **One game session for every variant.** A session names its variant. Results, payouts,
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
- **One map for every scale.** The planet map of the prologue, the sector maps and later the
  galaxy share one component: places, the ways between them and what each way needs.

**Done when:** a Spike table runs through the career in a test, a recorded game replays to the same
result, and a save from 1.2 loads unchanged.

## Phase 1 – Prologue: Tarsk (large)

The way in. Every table teaches one thing, and the player meets the people and animals that
matter later.

- **The planet map.** Tarsk from above: the scrapyard, the desert, the spaceport and the tracks
  between them. Travel is by Pim's scrap speeder, which he lends you after the first win.
- **The tables.**

  | Place | Opponents | What it teaches |
  |---|---|---|
  | Rusty Anchor, the scrapyard | Pim | The rules: draw, stand, Sabacc. Today's practice hand lives here. |
  | Mehr caravanserai, in the desert | Brakk, Mira | Shift tokens |
  | Dock 9, the undercity by the spaceport | Kessk, Zula | Peeking, suspicion, stakes |
  | The stake game, the landing field at night | Mira | Everything, for the ship |

- **Bix, the companion.** Three young animals live on Tarsk, and the player meets one at each of
  the first three tables, each in a short scene of its own:

  | Animal | Met at | Nature | Strongest at | Sign for a tip |
  |---|---|---|---|---|
  | Vulptex pup, the crystal fox of Crait; its crystals grow from what it eats, so this one's are rust-red from metal dust | Rusty Anchor: steals a chip | cheeky | pilfering | eyes light up, crystals chime |
  | Loth-cat kitten; traders bring them to guard the caravans' grain against womp rats | Mehr: hisses at Brakk | loyal, brave | guarding: absorbs one penalty per game, flattens its ears when an opponent grows suspicious | purrs, twitches its ears |
  | Convor chick, an owl-like bird with a gripping tail, sand-grey (the white convor is a character in *Ahsoka*) | Dock 9: hangs from Kessk's lamp, following every card | shy, clever | peeking: draws less suspicion, now and then gives away a tell | tilts its head and coos |

- **The choice that is not one.** Before the stake game a storm is coming and Mira waits at
  midnight; the scene only asks which way you ride. Past the scrapyard, because Pim wants to give
  you his lucky chip: the vulptex chases the shiny chip into your pocket. Over the dunes, because
  it is faster: the kitten has followed you and curls up in your scarf. Through the cooling
  tunnels, safe from the storm and with Brakk overheard on the way: the convor hangs on to the
  warm speeder. Each way has a small advantage of equal worth, and none names an animal. The
  animal shows itself only when Brakk appears after the win. Mira: "Name it Bix. That was my
  first freighter."
- **What Bix does.** All three can give tips (Bix replaces today's tip lamp), distract once per
  game (suspicion drops, the next peek goes unnoticed), sniff out stashes on the map and pilfer
  in certain jobs. Only their strengths differ, and treats even them out over time. Specialities
  that need tells or suspicion per opponent come alive with phase 3. Bix sits at the table's edge,
  sleeps through long thinking, cheers wins, hides from losses, and gets a section in the
  collection. Bix is never in real danger and cannot be lost. The two animals not chosen stay on
  Tarsk and can be met again in the home port.
- **The launch.** About 30 seconds, skippable after the first seconds: night in the hangar and the
  engines cough; ignition; the climb through the sandstorm; sunrise above the clouds as the music
  starts; the stars, and Tarsk grows small; the camera turns, world after world lights up and the
  lines between them become the real sector map. Oshi's hologram flickers on: "Not so fast."
  Built from SVG layers and a canvas for sand and stars, with live-synthesised sound; a shorter
  version under reduced motion, and it can be watched again from the profile.
- **Until act 1 is rebuilt** the sector map after the launch holds today's remaining tables (the
  Long Night, Vael, the Kessel Crown). Their scenes and the hangar still speak of a ship kept
  behind glass that the Crown sets free, so they are rewritten in this phase: the ship is yours,
  the Crown lifts the jump lock.
- **What waits until the ship is won.** The hangar opens with the stake game. The tour and the
  daily hand stay outside the story, but until the launch they only play at Tarsk's venues.
- **Pim's and Kessk's share.** The stake they lent comes back as a story thread, not a second
  debt: repaying it is the first job of act 1, and Pim's cheaper modules are his thanks.

**Done when:** a new player gets from the scrapyard to the stars without reading the rules page,
each of the three ways leads to its animal, and a save from 1.2 lands in the right place (see
"Saves from 1.2").

## Phase 2 – Act 1: Hull Debt (large)

The sector map for the first time: everything in it can be reached, nothing outside.

- **Places.** The Long Night on the smugglers' moon Varr (Tevin, Ilsa); the east spice mine on
  Kessel, where shift workers play for wage tokens (new); the Lump, a casino in a hollowed-out
  asteroid (new); Vael station, the Red Seal's salon (Dray Venn); Oshi's hangar, a table among
  seized ships (new); the finale at the Kessel Crown, Oshi's own tournament.
- **Nine career tables instead of six.** Buy-ins, payouts and shift-token unlocks are spread anew
  over the prologue's three and act 1's six tables, and every new table gets a rival for its
  duel. The progress simulation sets the curve.
- **Travel.** Every jump costs a little fuel. Routes need an engine level, a hull level or a
  syndicate's leave. Tarsk stays the home port, where Pim fits modules for less.
- **The debt.** One instalment per act. Winnings can go towards it at any time; an act's last
  table opens only once its instalment is paid, so the debt cannot be ignored and nothing grows
  while the player is away. Broke: Oshi lends more, added to the next instalment. At the very
  bottom waits a stake game against Brakk; losing it costs a module that can be bought back.
  The game never ends, it only gets more expensive.
- **Four syndicates.** Oshi's House (hangars, docks, debt notes), the Red Seal (old money, clean
  casinos; hates cheats), the Scrap Crown (smugglers and scrap dealers; Pim, Ilsa), the
  Glassfingers (information brokers; Tevin). Standing with each goes from hostile to trusted in
  six steps. It opens or closes tables and changes prices; a hostile syndicate puts an enforcer
  in one of the usual seats, so the table keeps its size. Neutral tables stay open whatever
  happens, and jobs can repair standing, so nobody is ever locked out.
- **Jobs.** A board at every place, using what the engines already know: smuggling (cargo on
  board, every lost hand costs some), losing to the right person on purpose, collecting a debt in
  a duel, a bet to win under a condition. Every job names its variant.
- **The turn.** In Oshi's hangar Bix pulls a shiny seal out of a crate: Mira's foreclosure notice,
  dated a week before the game in which she supposedly lost everything. Kessk confirms it by
  hologram: Oshi rigged that game. She never wanted the money, she wanted the Sandrunner.
- **The choice.** After the Crown Oshi offers courier work: smaller instalments, but you fly for
  her. Accepting binds you to Oshi's House; refusing makes her an opponent who watches you.

**Done when:** act 1 plays from the launch to the lifted jump lock, the story graph test passes,
and the economy simulation holds with instalment, fuel and modules.

## Phase 3 – Reading the table (medium to large)

Sabacc is played against people. This phase gives them something to read and the player
something to hide. It comes before act 2 because Corellian Spike bets and the Glassfingers trade
in tells.

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
  with it). Getting caught costs chips and standing. *As built in 1.7:* the sleeve card is always
  a 1 and swaps the player's card of one suit; the steadiness test is a marker swinging over a
  bar, a clean tap halves the suspicion, a miss raises it by half. There is no "twin at the
  reveal": a Kessel deck holds every value several times over, so a twin proves nothing.
  Peeking and the sleeve in Corellian Spike come with act 2, when Spike joins the career.
- **Bix's specialities** that build on this switch on: the kitten's warning, the convor's tells.
- **Balance.** A bot that reads every tell perfectly may win at most a set share more than one
  that ignores them; cheating pays a little on average but ruins a game when it goes wrong. Both
  are checked by simulation.

**Done when:** tells and dossier work in both variants, the sleeve in Kessel Sabacc (Spike follows in phase 4), the simulations hold their limits,
and every new line exists in both languages.

## Phase 4 – Act 2: The Trade Route (large)

- **Corellian Spike in the campaign**, with the learning path below and Dessa, a shipyard
  forewoman, as its teacher (new).
- **Cheating at the Spike table**: peeking with suspicion per opponent and the sleeve, as in
  Kessel Sabacc since 1.7, so that tells, dossier and sleeve finally work in both variants.
- **Passing the device at the Spike table**, as in Kessel Sabacc since 1.8.
- *As built in 2.0:* nine tables on a chart of their own. Three learning tables in the Hallis
  canteen with Dessa, a guided practice hand (also on the rules page) and notes the first time
  betting, a sabacc shift or the two pots come up; players who know the game may skip the canteen.
  Then the convoy, the swoop track (Scrap Crown), the gas barge, the Glassfingers' archive, the
  Red Seal's casino with Dray, and the merchants' banquet as the finale. After the convoy the
  player chooses a patron, whose key comes with it; the other two keys are bought or stolen
  through jobs on the boards of the swoop track, the archive and the casino (a duel with Juno, a
  win with two looks at other hands, a duel with Dray). The banquet waits for all three keys and
  the second instalment. The answer given to Oshi after the Crown decides the turn: as her
  courier the instalment is 3,000 lighter but her freight has to go to the barge first; otherwise
  the debt is sold to the Red Seal and Dray sits in at the convoy and the barge. Mira's confession
  follows the jump, and she stays or leaves. Opening tables in act 3 through the patron comes with
  act 3.
- *Built in 1.9, ahead of the act:* the engine plays the learning tables' rules (cards only, then
  betting, then the dice; one pot and no named hands until the last); the Spike table seats the
  player wherever the device is, takes career games with stake and result screen, counts stats and
  achievements, and opens the rules at a tap. At the Spike table the sleeve holds a sylop, and a
  fine goes into the sabacc pot.
- **Places** (all new): the Hallis shipyard canteen (learning tables), a convoy freighter whose
  table travels with it, the bar above a swoop track, a casino barge in a gas giant, the
  Glassfingers' archive, the Red Seal's grand casino, and the merchants' banquet as the finale.
- **The keys.** The nav data is locked three times; each of the other three syndicates holds one
  key. Dray Venn hunts the data for the Red Seal: recurring duels.
- **The choice: a patron.** Red Seal, Glassfingers or Scrap Crown. Oshi's reach does not extend to
  the trade route, so even her courier needs one. The patron gives you their key and opens
  tables in act 3; the other two keys must be won, bought or stolen.
- **The turn.** If you fly for Oshi, she keeps the debt and makes you her runner: smaller
  instalments, but her jobs come first. Otherwise she sells the debt to the Red Seal, and your
  creditor sits at your table. Mira confesses that she has reported to Oshi all along; you decide
  whether she stays on board.

## Phase 5 – Acts 3 and 4: The Core and the Empty Crown (large)

- **Coruscant Shift**: engine, AI, art, rules page and its own learning path with an old croupier
  as teacher. Its rules are checked against sources before anything is built, as Corellian
  Spike's were.
- **Act 3 places** (all new): a gambling hall a thousand levels below the sky (learning tables),
  a penthouse round of senate advisers, a gala on an orbital yacht, a customs hangar of the
  garrison with Zula opening the door, the gamblers' arena, and as the finale a game for the last
  key in its syndicate's residence.
- **Heat.** The garrison is no syndicate but the law. Smuggling and being caught heat it up; then
  there are checks at the jump points: pay, or a quick hand against the customs officer.
- **Two ways out of the debt.** Pay the third instalment, or break it: K-7, Oshi's bookkeeping
  droid, carries the ledger in its memory, and Bix pilfers the crystal. No debt then, only a
  furious Oshi.
- **The turn.** With the last key the coordinates open. The Empty Crown exists, and every syndicate
  learns it at the same moment. Oshi offers a partnership, because she cannot get there alone.
- **Act 4.** The station wakes. The syndicates agree on the one thing they all trust here: a
  tournament, each round in another variant. A champion of each syndicate, Dray Venn if he was
  never beaten for good, Madame Oshi at the final table. Your standing, your crew and the state
  of the debt decide who sits where.
- **Three endings.** *Debt-free*: every instalment paid, Oshi beaten; the station becomes neutral
  ground. *A new Crown*: trusted by a syndicate, the tournament won; you take over the station
  with your patron. *Outlaw*: you take the vault and jump; afterwards legend mode is played with
  bounty hunters at every table.
- **The galaxy map** above the sector maps, and modules that open the way. New effects come on top
  of what modules already do, so nothing bought loses its worth: the engine (no effect so far)
  opens far routes, sensors also show one tell of each opponent in advance, the lounge also holds
  the crew.
- **Crew.** Characters who come aboard after their own loyalty job: Mira (cheaper jumps), Kessk
  (shows which cards have fallen), K-7 (extra tips), Pim (cheaper modules), Ilsa (smuggling routes
  without checks), Zula (heat fades faster), Tevin (the sleeve is noticed less). At most two fly
  along, three with the lounge fully built. Each perk states which variant it works in, and the
  same effect never stacks with a module or token.
- **After the end.** Legend mode, the tour, the daily hand, and the tournament again every season.

## Learning a new variant

Every new variant gets a way in as gentle as the prologue is for Kessel Sabacc.

1. **A teacher** per sector who explains in short scenes and in the game's own terms, not in rule
   sentences, and says plainly what differs from Kessel ("we count the sum, not the difference").
2. **A guided hand** with a fixed deal, like today's Kessel practice; every card and every roll is
   chosen to show exactly one thing.
3. **Three learning tables**, easy opponents, small stakes, Bix without a tip limit. Each opens one
   rule more. Corellian Spike: cards only and nearest to zero wins; then betting; then the dice,
   the Sabacc Shift, the two pots and the named hands. Coruscant Shift: the target number; then
   the suit; then the full round.
4. **First-time notes.** The first time something happens, such as a double on the spike dice, the
   game pauses and explains it with what is on the table.
5. **Then the act's first real table.** A crib sheet with the current variant's rules and ranking
   opens at the table at any time.

Players who learnt a variant in free play may skip the learning tables and get the teacher's story
in one scene. Every variant has a practice hand and a practice table outside the story. Before a
variant ships, somebody who does not know it plays it, and wherever they get stuck is improved.

## Saves from 1.2

Nothing is lost: credits, modules, collection and achievements stay. Today's tables are shared out
anew: the Rusty Anchor, Mehr and Dock 9 belong to the prologue; the Long Night, Vael and the Crown
to act 1. A save that has won the first three plays the stake game next and sees the launch. A save
that has won the Crown has finished act 1; its first instalment counts as paid, and it gets the
launch and the turn of act 1 once as a flashback. Such saves never choose an animal on the way to
the landing field, so they are offered the same ride once when they open the new version.

## Phase 6 – Presentation (medium, alongside the other phases)

- **Music** generated live in the browser, like the sound effects, so there is nothing to license:
  a cantina band whose intensity follows the size of the pot. Recorded music would need licences.
- **Big moments:** the launch, a slow reveal for a Pure Sabacc or a Sabacc Shift, patrons who react
  to big pots, the dealer droid at the Spike table as well.
- **Art:** the three animals with their animations, a new Sandrunner in the hangar, achievement
  icons by category, small animations for tells.
- **Budget:** a steady frame rate on a phone from about 2020, measured before every release.

## Phase 7 – Playing together (medium, then large)

- **7a. One device, several players** (no server): two to four people pass the phone, each hand
  stays hidden between turns, empty seats go to the AI. *As built in 1.8:* Kessel Sabacc in free
  play; a curtain covers the table until the next person taps, everybody gets three random shift
  tokens, there is no peeking (the others would see it anyway), and the career is left alone.
  Corellian Spike follows with phase 4, when its table is reworked for the career.
- **7b. A leaderboard for the daily hand** (small server): the app sends the action log of the
  day's game, the server replays it with the day's seed and only then accepts the score. That
  stops invented scores but not foreknowledge: today the day's seed follows from the date, so
  anyone who reads the code can work out the deck before playing. For the leaderboard the server
  hands out the day's seed only when a game starts, once per device. Fully fair is only a game in
  which the server deals card by card, which comes with 7c. Players choose a nickname; no
  account, no email.
- **7c. Private tables online** (larger server): an invitation link, the server runs the same
  engines (they are pure functions and run there unchanged) and decides every move. Cheating is
  switched off between people; the AI fills empty seats.
- A server costs money and upkeep; free tiers (for example Cloudflare Workers) cover a small
  audience. Setting it up needs an account in your name.

## Alongside every phase

- Table polish: the pile labels, the instruction line at the Spike table, the bottom bar on wide
  screens.
- Share the daily hand as a short text; a colour-blind mode and a left-handed layout.

## Order and releases

| Release | Contents |
|---|---|
| 1.3 | Phase 0, the new menu design, table polish |
| 1.4 | Phase 1: the prologue on Tarsk, Bix, the launch |
| 1.5 | Phase 2: act 1 |
| 1.6 | Phase 3, first half: tells, dossiers, Bix at the table (tips, covering a peek gone wrong) |
| 1.7 | Phase 3, second half: suspicion per opponent, the sleeve with its steadiness test |
| 1.8 | 7a: one device, several players (Kessel Sabacc) |
| 1.9 | Phase 4, groundwork: the Spike table ready for the career |
| 2.0 | Phase 4: act 2 with Corellian Spike, its learning path and the keys |
| 2.x | Phase 5: acts 3 and 4, Coruscant Shift, crew, galaxy map; phase 6 throughout |
| 3.0 | 7b and 7c: leaderboard and online tables |

## Review: gaps found, and how the plan closes them

| Gap | Where it is closed |
|---|---|
| Wanting the ship back while travelling from world to world made no sense. | The campaign: you own the ship from the end of the prologue; the debt and the jump lock are what bind you. |
| Why would Oshi not simply seize the ship? | It is useless to her alone: the keys to its data lie at other syndicates' tables. |
| Why would Mira stake a ship against a nobody? | She needs 2,000 by morning and takes you for the easiest mark; Pim and Kessk lend you the stake. |
| A verified leaderboard needs games that replay exactly; whether a peek is caught is decided by unseeded chance today. | Phase 0: all game randomness from the seed, action log. |
| The daily seed can be worked out from the date, so the cards can be known before playing. | Phase 7b: the server hands out the seed at the start; fully fair only with the server dealing (7c). |
| Bix's specialities need tells and suspicion per opponent, which come later. | Phase 1 gives all animals the shared abilities; the specialities switch on with phase 3. |
| Saves from 1.2 never rode to the landing field and have no animal. | Saves from 1.2: they are offered the ride once. |
| Until act 1 is rebuilt, today's scenes and the hangar still tell of a ship behind glass. | Phase 1: those scenes and the hangar are rewritten with the prologue. |
| The hangar, the tour and the daily hand are open before the player owns a ship or has left Tarsk. | Phase 1: the hangar opens with the stake game; tour and daily hand stay on Tarsk until the launch. |
| "You owe Pim and Kessk a share" had no meaning in play. | Phase 1: repaying them is act 1's first job, not a second debt. |
| The money curve is tuned for six career tables; there will be nine. | Phase 2: buy-ins, payouts and unlocks spread anew by simulation; new tables get rivals. |
| A card from the sleeve is a duplicate the engines do not allow. | Phase 3: the engines accept an outside card; its twin at the reveal raises suspicion. |
| A debt the player can simply ignore is no spine. | Phase 2: each act's last table needs its instalment. |
| A debt that grows by real days punishes anyone who takes a break. | Phase 2: instalments per act, nothing grows while away. |
| Free bail-outs would undercut the debt story and could be used to farm credits. | Phase 2: they are added to the next instalment. |
| Hostile syndicates could close every table and lock the player out. | Phase 2: neutral tables always open, jobs repair standing. |
| New module effects could devalue upgrades already bought. | Phase 5: new effects are added on top, never instead. |
| Safari may clear a site's storage after a week without a visit; a campaign makes that loss much worse. | Phase 0: ask for persistent storage, backup reminders. Cloud sync only once there is a server. |
| Corellian Spike cannot be a career table while it has its own results path. | Phase 0: one session for every variant. |
| A new variant thrown at the player at full complexity loses them. | Learning a new variant: teacher, guided hand, three learning tables, first-time notes. |
| Tells could make the AI trivially beatable. | Phase 3: reliability by difficulty, faked tells, a simulated limit. |
| Cheating against real people is not fun and not fair. | Phase 7: cheating only against AI seats. |
| A timing test excludes some players. | Phase 3: a setting with a plain button and fixed risk. |
| Every phase adds income; the tuned economy would drift. | Ground rule 6: simulate again each phase. |
| Crew perks, modules, tokens and Bix could add up to one overwhelming effect. | Phase 5: at most two crew, no stacking of the same effect, the variant stated. |
| Spike has no shift tokens, so jobs and perks written for Kessel may mean nothing there. | Phases 2 and 5: every job and perk names its variant. |
| The bigger the project, the more attention from the rights holder. | Ground rule 1: free, no store, own characters; the fan-project notice the README has also goes into the app. |
| The story in two languages doubles the writing. | Phase 0: story as data, covered by the catalogue test; acts are written in both languages at once. |
| More animation threatens the frame rate that 1.0 fought for. | Phase 6: a frame-rate budget checked before every release. |

## Decided

- The premise: the ship is won in the prologue, the debt comes with it; four syndicates of our own.
- Mira as the former owner who reports to Oshi.
- Bix, chosen without being asked, from a vulptex pup, a Loth-cat kitten and a convor chick.
- Coruscant Shift as the third variant.
- The order of the phases above.
- The launch as the full sequence of six shots.
- The animals drawn in more detail than the first sketches: fur, faceted crystals, irises,
  feathers.

## Still open

1. Heat and the garrison: only in act 3, or from act 1 on?
2. The *Outlaw* ending with bounty hunters in legend mode afterwards?
3. A server for phase 7: a free account in your name when the time comes?
4. Music: generated in the browser (free, more synthetic) or recorded (needs licences)?
