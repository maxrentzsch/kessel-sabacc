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
  | { kind: 'win'; noTokens?: boolean; noPeek?: boolean; maxHandsLost?: number; keepChips?: boolean; sabacc?: boolean }
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
  reward: { credits: number; standing?: Syndicate }
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
]

export function jobById(id: string | undefined): Job | undefined {
  return JOBS.find((job) => job.id === id)
}

/** What happened in a game that a job may ask about. */
export interface JobFacts {
  won: boolean
  tokensPlayed: number
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
        (goal.maxHandsLost === undefined || facts.handsLost <= goal.maxHandsLost) &&
        (!goal.keepChips || facts.finalChips >= facts.startChips) &&
        (!goal.sabacc || facts.sabaccWins > 0)
      )
  }
}
