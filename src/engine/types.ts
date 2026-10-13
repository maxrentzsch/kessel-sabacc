export type Suit = 'sand' | 'blood'
export type CardKind = 'number' | 'impostor' | 'sylop'

export interface Card {
  id: string
  suit: Suit
  kind: CardKind
  /** 1–6 for number cards, 0 for Impostor and Sylop */
  value: number
}

export const TOKEN_IDS = [
  'freeDraw',
  'refund',
  'extraRefund',
  'generalTariff',
  'targetTariff',
  'embargo',
  'markdown',
  'immunity',
  'generalAudit',
  'targetAudit',
  'majorFraud',
  'embezzlement',
  'cookTheBooks',
  'exhaustion',
  'directTransaction',
  'primeSabacc',
] as const
export type TokenId = (typeof TOKEN_IDS)[number]

export interface Hand {
  sand: Card
  blood: Card
}

export interface Player {
  id: number
  name: string
  isHuman: boolean
  /** chips in stock */
  chips: number
  /** chips paid in during the current hand */
  invested: number
  hand: Hand | null
  /** unused shift tokens */
  tokens: TokenId[]
  eliminated: boolean
  /** last action of this hand was a stand */
  standing: boolean
  immune: boolean
  embargoed: boolean
  freeDraw: boolean
  /** resolved Impostor values for the reveal */
  impostor: Partial<Record<Suit, number>>
}

/** House rules of a table. The defaults are the standard game. */
export interface Rules {
  /** rounds per hand */
  rounds: number
  /** extra chips every losing hand pays on top of the normal penalty */
  penaltyBonus: number
  /** Sylops and Impostors per suit */
  sylops: number
  impostors: number
}

export interface Modifiers {
  sylopZero: boolean
  impostorSix: boolean
  cookTheBooks: boolean
  primeValue: number | null
}

export type DrawSource = 'sandDeck' | 'bloodDeck' | 'sandDiscard' | 'bloodDiscard'

export type Phase =
  | 'turn'
  | 'discard'
  | 'primeChoice'
  | 'impostor'
  | 'showdown'
  | 'handEnd'
  | 'gameOver'

export type HandCategory = 'pure' | 'prime' | 'sabacc' | 'none'

export interface HandScore {
  category: HandCategory
  sandValue: number
  bloodValue: number
  diff: number
  sum: number
  /** higher is better; strictly monotonic with the official ranking */
  power: number
}

export interface PlayerResult {
  playerId: number
  score: HandScore
  winner: boolean
  investedBefore: number
  /** chips lost on top of the invested ones */
  penalty: number
  chipsAfter: number
  eliminated: boolean
}

export interface HandResult {
  ranking: PlayerResult[]
}

export interface PendingDice {
  playerId: number
  purpose: 'impostor' | 'prime'
  suit?: Suit
  dice: [number, number]
}

export interface GameState {
  rng: number
  rules: Rules
  players: Player[]
  decks: Record<Suit, Card[]>
  discards: Record<Suit, Card[]>
  handNumber: number
  round: number
  /** seat index of the player who opens each round of this hand */
  dealer: number
  current: number
  phase: Phase
  tokenPlayedThisTurn: boolean
  pendingDraw: { card: Card; source: DrawSource } | null
  pendingDice: PendingDice | null
  modifiers: Modifiers
  result: HandResult | null
  winner: number | null
}

export type Action =
  | { type: 'playToken'; token: TokenId; target?: number }
  | { type: 'choosePrime'; value: number }
  | { type: 'draw'; source: DrawSource }
  | { type: 'discard'; keep: 'new' | 'old' }
  | { type: 'stand' }
  | { type: 'chooseImpostor'; value: number }
  | { type: 'settle' }
  | { type: 'nextHand' }
  /** the acting player was caught cheating and pays a fine out of their stock */
  | { type: 'caught'; fine: number }

export type ChipReason =
  | 'draw'
  | 'refund'
  | 'tariff'
  | 'audit'
  | 'embezzle'
  | 'win'
  | 'lossInvested'
  | 'penalty'
  | 'fine'

export type GameEvent =
  | { type: 'handStart'; hand: number; dealer: number }
  | { type: 'roundStart'; round: number }
  | { type: 'turnStart'; playerId: number }
  | { type: 'tokenPlayed'; playerId: number; token: TokenId; target?: number }
  | { type: 'tokenBlocked'; playerId: number; token: TokenId }
  | { type: 'chips'; playerId: number; delta: number; pile: 'stock' | 'invested'; reason: ChipReason }
  | { type: 'drew'; playerId: number; source: DrawSource; free: boolean }
  | { type: 'discarded'; playerId: number; card: Card; keep: 'new' | 'old' }
  | { type: 'stood'; playerId: number; forced: boolean }
  | { type: 'diceRolled'; playerId: number; purpose: 'impostor' | 'prime'; dice: [number, number]; suit?: Suit }
  | { type: 'diceChosen'; playerId: number; purpose: 'impostor' | 'prime'; value: number; suit?: Suit }
  | { type: 'handsSwapped'; a: number; b: number }
  | { type: 'handRedrawn'; playerId: number }
  | { type: 'reshuffled'; suit: Suit }
  | { type: 'showdown'; result: HandResult }
  | { type: 'settled'; result: HandResult }
  | { type: 'eliminated'; playerId: number }
  | { type: 'gameOver'; winner: number }

export interface PlayerSetup {
  name: string
  isHuman: boolean
  tokens: TokenId[]
  /** overrides the table's starting chips for this player */
  chips?: number
}

export interface GameConfig {
  players: PlayerSetup[]
  startingChips: number
  seed: number
  rules?: Partial<Rules>
}
