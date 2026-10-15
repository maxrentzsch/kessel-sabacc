import type { Syndicate } from './syndicates'
import { tx } from '../i18n'

/**
 * Jobs on the board at a table: something to do besides winning, using what
 * the engines already know. Each can be done once.
 */
export type JobGoal =
  /** hand over credits */
  | { kind: 'pay'; amount: number }
  /** win the game, with a condition */
  | { kind: 'win'; noTokens?: boolean; noPeek?: boolean; minPeeks?: number; maxHandsLost?: number; keepChips?: boolean; sabacc?: boolean }
  /** lose the game, and the right person has to win it */
  | { kind: 'throw'; to: string }
  /** beat somebody one-on-one */
  | { kind: 'duel'; against: string; buyIn: number }

export interface Job {
  id: string
  /** where the job is on the board */
  table: string
  title: string
  text: string
  goal: JobGoal
  /** a key to the nav data: the job is gone once the player holds it */
  reward: { credits: number; standing?: Syndicate; key?: Syndicate; heat?: number }
  /** a story flag the job waits for */
  requires?: string
}

export const JOBS: Job[] = [
  {
    id: 'repay',
    table: 'anchor',
    title: tx`Pim und Kessk auszahlen`,
    text: tx`Die 2.000 Credits für das Pfandspiel. Pim baut dir dafür künftig Module zum Freundschaftspreis ein.`,
    goal: { kind: 'pay', amount: 2000 },
    reward: { credits: 0, standing: 'scrap' },
  },
  {
    id: 'clean-hands',
    table: 'lodge',
    title: tx`Saubere Hände`,
    text: tx`Ilsa wettet, dass hier niemand ohne Tricks gewinnt. Gewinn, ohne einen Shift-Token zu spielen.`,
    goal: { kind: 'win', noTokens: true },
    reward: { credits: 300, standing: 'glass' },
  },
  {
    id: 'tevin-bet',
    table: 'lodge',
    title: tx`Tevins Wette`,
    text: tx`Tevin glaubt nicht, dass du je einen Sabacc hinlegst. Gewinn die Partie und dabei mindestens eine Hand mit einem Sabacc.`,
    goal: { kind: 'win', sabacc: true },
    reward: { credits: 400, standing: 'glass' },
  },
  {
    id: 'cargo',
    table: 'lump',
    title: tx`Ware an Bord`,
    text: tx`Lio hat Kisten, die niemand sehen soll. Jede verlorene Hand kostet eine davon. Gewinn und verlier dabei höchstens eine Hand.`,
    goal: { kind: 'win', maxHandsLost: 1 },
    reward: { credits: 500, standing: 'scrap' },
  },
  {
    id: 'house-money',
    table: 'lump',
    title: tx`Mit dem Geld des Hauses`,
    text: tx`Sesk zahlt, wenn du den Tisch verlässt, ohne einen Chip unter deinem Anfang zu landen. Gewinn und behalte mindestens so viele Chips, wie du hattest.`,
    goal: { kind: 'win', keepChips: true },
    reward: { credits: 600 },
  },
  {
    id: 'wages',
    table: 'mine',
    title: tx`Ruhe in Schacht 4`,
    text: tx`Varra braucht einen Sieg vor ihrer Schicht, sonst gibt es Ärger. Verlier die Partie – und zwar an Varra.`,
    goal: { kind: 'throw', to: 'varra' },
    reward: { credits: 900, standing: 'scrap' },
  },
  {
    id: 'honest',
    table: 'salon',
    title: tx`Ehrliches Spiel`,
    text: tx`Das Rote Siegel will wissen, ob du ohne Schummeln bestehst. Gewinn, ohne in fremde Karten zu schauen.`,
    goal: { kind: 'win', noPeek: true },
    reward: { credits: 700, standing: 'seal' },
  },
  {
    id: 'collect',
    table: 'hangar',
    title: tx`Brakks Schulden`,
    text: tx`Brakk schuldet Oshi mehr als du. Treib es ein: Gewinn ein Duell gegen ihn, und er spielt dabei hart.`,
    goal: { kind: 'duel', against: 'brakk', buyIn: 400 },
    reward: { credits: 1200, standing: 'oshi' },
  },

  // ── Act 2: the trade route ──
  {
    id: 'manifest',
    table: 'convoy',
    title: tx`Saubere Ladeliste`,
    text: tx`Quill zahlt, wer seine Bücher nicht durcheinanderbringt. Gewinn und behalte mindestens so viele Chips, wie du hattest.`,
    goal: { kind: 'win', keepChips: true },
    reward: { credits: 700 },
  },
  {
    id: 'buy-key-scrap',
    table: 'swoop',
    title: tx`Schlüssel der Schrottkrone kaufen`,
    text: tx`Ilsa verkauft dir den Schlüssel zu den Navdaten. Zum Freundschaftspreis, sagt sie.`,
    goal: { kind: 'pay', amount: 2000 },
    reward: { credits: 0, key: 'scrap' },
  },
  {
    id: 'steal-key-scrap',
    table: 'swoop',
    title: tx`Junos Zündschlüssel`,
    text: tx`Der Schlüssel steckt in Junos Swoop. Gewinn ihn ihr im Duell ab – sie fährt nicht langsamer, nur weil du fragst.`,
    goal: { kind: 'duel', against: 'juno', buyIn: 600 },
    reward: { credits: 0, key: 'scrap' },
  },
  {
    id: 'track-bet',
    table: 'swoop',
    title: tx`Harls Wette`,
    text: tx`Harl wettet gegen dich. Gewinn die Partie und verlier dabei höchstens zwei Hände.`,
    goal: { kind: 'win', maxHandsLost: 2 },
    reward: { credits: 900, standing: 'scrap' },
  },
  {
    id: 'oshi-run',
    table: 'barge',
    title: tx`Oshis Fracht`,
    text: tx`Oshis Kurier hat eine Kiste für Vesh. Bring sie an Bord – und spiel, als wäre nichts. Gewinn, ohne Chips zu verlieren.`,
    goal: { kind: 'win', keepChips: true },
    reward: { credits: 0, standing: 'oshi' },
    requires: 'oshi-courier',
  },
  {
    id: 'cloud-dive',
    table: 'barge',
    title: tx`Sturz durch die Wolken`,
    text: tx`Vesh zahlt für eine Null mit Ansage. Gewinn die Partie und dabei mindestens eine Hand mit einer Null.`,
    goal: { kind: 'win', sabacc: true },
    reward: { credits: 1200 },
  },
  {
    id: 'buy-key-glass',
    table: 'archive',
    title: tx`Schlüssel der Glasfinger kaufen`,
    text: tx`Sable verkauft alles, was in ihren Akten steht. Auch den Schlüssel. Für den richtigen Preis.`,
    goal: { kind: 'pay', amount: 2500 },
    reward: { credits: 0, key: 'glass' },
  },
  {
    id: 'steal-key-glass',
    table: 'archive',
    title: tx`Ein Blick in Sables Akten`,
    text: tx`Der Schlüssel steht irgendwo in ihren Karten. Schau mindestens zweimal in fremde Karten und gewinn trotzdem.`,
    goal: { kind: 'win', minPeeks: 2 },
    reward: { credits: 0, key: 'glass' },
  },
  {
    id: 'buy-key-seal',
    table: 'casino',
    title: tx`Schlüssel des Siegels kaufen`,
    text: tx`Veyra nennt einen Preis. Er ist nicht verhandelbar.`,
    goal: { kind: 'pay', amount: 3000 },
    reward: { credits: 0, key: 'seal' },
  },
  {
    id: 'steal-key-seal',
    table: 'casino',
    title: tx`Drays Schlüssel`,
    text: tx`Dray trägt den Schlüssel am Gürtel und sucht seit Wochen ein Duell mit dir. Gib es ihm.`,
    goal: { kind: 'duel', against: 'dray', buyIn: 1000 },
    reward: { credits: 0, key: 'seal' },
  },
  {
    id: 'house-honour',
    table: 'casino',
    title: tx`Die Ehre des Hauses`,
    text: tx`Im Haus des Siegels wird nicht geschummelt. Gewinn, ohne in fremde Karten zu schauen.`,
    goal: { kind: 'win', noPeek: true },
    reward: { credits: 1500, standing: 'seal' },
  },

  // ── Act 3: the core ──
  {
    id: 'backroom-bet',
    table: 'level3',
    title: tx`Grells Wette`,
    text: tx`Grell wettet, dass du im Hinterzimmer Chips verlierst. Gewinn und behalte mindestens so viele, wie du hattest.`,
    goal: { kind: 'win', keepChips: true },
    reward: { credits: 800 },
  },
  {
    id: 'favour',
    table: 'penthouse',
    title: tx`Eine Gefälligkeit für Nessa`,
    text: tx`Nessa braucht einen Sieg ohne Skandal. Gewinn, ohne in fremde Karten zu schauen.`,
    goal: { kind: 'win', noPeek: true },
    reward: { credits: 1500, standing: 'seal' },
  },
  {
    id: 'ledger',
    table: 'yacht',
    title: tx`Das Schuldbuch`,
    text: tx`K-7 trägt Oshis Schuldbuch im Speicherkristall. Lenk ihn ab – schau mindestens einmal in fremde Karten und gewinn –, und Bix holt sich den Kristall. Keine Schuld mehr, aber eine sehr wütende Oshi.`,
    goal: { kind: 'win', minPeeks: 1 },
    // what it does to the debt and to Oshi is the career's to settle
    reward: { credits: 0 },
  },
  {
    id: 'smuggle',
    table: 'customs',
    title: tx`Fracht am Zoll vorbei`,
    text: tx`Sable hat eine Kiste der Glasfinger, die nicht durch den Zoll soll. Gewinn die Partie, während sie verladen wird. Die Garnison wird sich das merken.`,
    goal: { kind: 'win' },
    reward: { credits: 2500, heat: 30 },
  },
  {
    id: 'crowd',
    table: 'arena',
    title: tx`Die Menge will mehr`,
    text: tx`Gewinn vor tausend Zuschauern und verlier dabei höchstens zwei Hände.`,
    goal: { kind: 'win', maxHandsLost: 2 },
    reward: { credits: 2000, standing: 'scrap' },
  },
]

export function jobById(id: string | undefined): Job | undefined {
  return JOBS.find((job) => job.id === id)
}

/** What happened in a game that a job may ask about. */
export interface JobFacts {
  won: boolean
  tokensPlayed: number
  /** looks at other hands that were not caught */
  peeks: number
  handsLost: number
  sabaccWins: number
  startChips: number
  finalChips: number
  /** character id of whoever won the game, `you` for the player */
  winner?: string
}

/** Has the game done what the job asked for? */
export function jobDone(goal: JobGoal, facts: JobFacts): boolean {
  switch (goal.kind) {
    case 'pay':
      return true
    case 'duel':
      return facts.won
    case 'throw':
      return !facts.won && facts.winner === goal.to
    case 'win':
      return (
        facts.won &&
        (!goal.noTokens || facts.tokensPlayed === 0) &&
        (!goal.noPeek || facts.peeks === 0) &&
        (goal.minPeeks === undefined || facts.peeks >= goal.minPeeks) &&
        (goal.maxHandsLost === undefined || facts.handsLost <= goal.maxHandsLost) &&
        (!goal.keepChips || facts.finalChips >= facts.startChips) &&
        (!goal.sabacc || facts.sabaccWins > 0)
      )
  }
}
