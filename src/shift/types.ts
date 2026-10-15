import type { SpikeCard, SpikeSuit } from '../spike/types'

/** Coruscant Shift plays with the deck of Corellian Spike: three staves of ±1 … ±10 and two sylops. */
export type ShiftCard = SpikeCard
export type ShiftSuit = SpikeSuit

export interface ShiftPlayer {
  id: number
  name: string
  isHuman: boolean
  chips: number
  /** cards in hand that are not set aside */
  hand: ShiftCard[]
  /** the cards set aside face down: what is shown and counted at the reveal */
  selection: ShiftCard[]
  /** cards dealt in the shift, the only ones that may still join the selection */
  fresh: string[]
  /** out of this hand */
  folded: boolean
  /** out of chips: out of the game */
  eliminated: boolean
  /** chips put in during the current betting round */
  bet: number
}

/** Everything the printed rules leave to the table. */
export interface ShiftRules {
  /** chips into the pot at the start of a hand */
  ante: number
  /** what a bet or raise costs, per betting round */
  bets: [number, number]
  /** raises allowed in one betting round */
  maxRaises: number
  /** the ante goes up by itself every so many hands; 0 = never */
  anteEvery: number
  /**
   * The learning tables leave parts of the game out: without betting the
   * hand goes straight from selection to shift to reveal; without suits a
   * tie on the number is not broken but shared.
   */
  betting?: boolean
  suits?: boolean
}

/** What the dice set for a hand: the number to reach and the suit that breaks ties. */
export interface ShiftTarget {
  value: number
  suit: ShiftSuit
}

/** The gold die. */
export const TARGET_FACES = [0, 0, 5, -5, 10, -10] as const

export type ShiftPhase = 'select' | 'bet' | 'improve' | 'showdown' | 'handEnd' | 'gameOver'

export interface ShiftScore {
  total: number
  /** how far the selection is from the target */
  distance: number
  /** cards of the target suit, sylops counting for every suit */
  suited: number
}

export interface ShiftPlacing {
  playerId: number
  score: ShiftScore
  winner: boolean
}

export interface ShiftResult {
  /** best selection first; players who folded are not in it */
  placing: ShiftPlacing[]
  winners: number[]
  pot: number
  /** everybody else folded, so nothing was shown */
  uncontested: boolean
}

export interface ShiftState {
  rules: ShiftRules
  players: ShiftPlayer[]
  deck: ShiftCard[]
  discard: ShiftCard[]
  pot: number
  target: ShiftTarget
  dealer: number
  current: number
  /** 1 before the shift, 2 after it */
  round: 1 | 2
  phase: ShiftPhase
  /** betting round: the highest bet so far, and how often it was raised */
  toCall: number
  raises: number
  /** who still has to act in this phase, in order */
  pending: number[]
  result: ShiftResult | null
  handNumber: number
  winner: number | null
  /** cards swapped out for one from a sleeve; they go back into the deck with the next deal */
  pocket?: ShiftCard[]
  rng: number
}

export type ShiftAction =
  /** set cards aside: the first selection of a hand, at least one card */
  | { type: 'select'; cards: string[] }
  /** after the shift: add any of the fresh cards to the selection, or none */
  | { type: 'improve'; cards: string[] }
  | { type: 'check' }
  | { type: 'bet' }
  | { type: 'call' }
  | { type: 'raise' }
  | { type: 'fold' }
  | { type: 'settle' }
  | { type: 'nextHand' }
  /** cheating, decided outside the rules: a sylop from the sleeve for a card in hand or selection */
  | { type: 'sleeve'; give: string }
  /** the current player was caught cheating and pays a fine into the pot */
  | { type: 'caught'; fine: number }

export type ShiftEvent =
  | { type: 'handStart'; hand: number; dealer: number; ante: number; target: ShiftTarget }
  | { type: 'chips'; playerId: number; delta: number; reason: 'ante' | 'bet' | 'pot' | 'fine' }
  | { type: 'phaseStart'; phase: ShiftPhase; round: 1 | 2 }
  | { type: 'turnStart'; playerId: number }
  | { type: 'selected'; playerId: number; count: number }
  | { type: 'shifted'; playerId: number; count: number }
  | { type: 'improved'; playerId: number; count: number }
  | { type: 'checked'; playerId: number }
  | { type: 'bet'; playerId: number; amount: number; raise: boolean }
  | { type: 'called'; playerId: number; amount: number }
  | { type: 'folded'; playerId: number }
  | { type: 'reshuffled' }
  | { type: 'showdown'; result: ShiftResult }
  | { type: 'settled'; result: ShiftResult }
  | { type: 'eliminated'; playerId: number }
  | { type: 'gameOver'; winner: number }
  | { type: 'sleeved'; playerId: number }

export interface ShiftSetup {
  name: string
  isHuman: boolean
  /** starting chips when they differ from the table's */
  chips?: number
}

export interface ShiftConfig {
  players: ShiftSetup[]
  startingChips: number
  seed: number
  rules?: Partial<ShiftRules>
}
