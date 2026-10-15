/** The three staves of the Corellian Spike deck. */
export type SpikeSuit = 'circle' | 'triangle' | 'square'

export interface SpikeCard {
  id: string
  /** `null` for the two sylops */
  suit: SpikeSuit | null
  /** +1 … +10 (green), −1 … −10 (red), 0 for a sylop */
  value: number
}

export interface SpikePlayer {
  id: number
  name: string
  isHuman: boolean
  chips: number
  hand: SpikeCard[]
  /** junked the hand: out until the next deal */
  folded: boolean
  /** out of chips: out of the game */
  eliminated: boolean
  /** chips put in during the current betting round */
  bet: number
}

/** Everything the printed rules leave to the table. */
export interface SpikeRules {
  /** chips into each of the two pots at the start of a hand */
  ante: number
  /** what a bet or raise costs, per round */
  bets: [number, number, number]
  /** raises allowed in one betting round */
  maxRaises: number
  handLimit: number
  /** the ante goes up by itself every so many hands; 0 = never */
  anteEvery: number
  /**
   * The learning tables leave parts of the game out (see ROADMAP, learning a
   * new variant). Without betting the card phase is followed straight by the
   * dice; without dice by the next round.
   */
  betting?: boolean
  dice?: boolean
  /** one pot and no named hands: whoever ends nearest to zero takes it all */
  simple?: boolean
}

export type SpikePhase = 'card' | 'bet' | 'dice' | 'showdown' | 'handEnd' | 'gameOver'

/** The named hands, best first; every one of them but the last adds up to zero. */
export const HAND_KINDS = [
  'pure',
  'full',
  'fleet',
  'yeehaa',
  'rhylet',
  'squadron',
  'geewhiz',
  'straight',
  'banthas',
  'ruleOfTwo',
  'sabacc',
  'zero',
  'nulrhek',
] as const
export type HandKind = (typeof HAND_KINDS)[number]

export interface SpikeScore {
  kind: HandKind
  total: number
  /** compares hands: the first difference decides, lower is better */
  key: number[]
}

export interface SpikePlacing {
  playerId: number
  score: SpikeScore
  winner: boolean
  /** cards drawn blind to break a dead heat, in order */
  drawn: SpikeCard[]
}

export interface SpikeResult {
  /** best hand first; players who junked are not in it */
  placing: SpikePlacing[]
  winners: number[]
  handPot: number
  /** paid out with the hand pot when the winning hand is a true sabacc, else 0 */
  sabaccPot: number
  /** everybody else junked, so nothing was shown */
  uncontested: boolean
}

export interface SpikeState {
  rules: SpikeRules
  players: SpikePlayer[]
  deck: SpikeCard[]
  /** face up, last card on top */
  discard: SpikeCard[]
  handPot: number
  sabaccPot: number
  dealer: number
  current: number
  /** 1 … 3 */
  round: number
  phase: SpikePhase
  /** betting round: the highest bet so far, and how often it was raised */
  toCall: number
  raises: number
  /** who still has to act in this phase, in order */
  pending: number[]
  dice: [number, number] | null
  result: SpikeResult | null
  handNumber: number
  winner: number | null
  /** cards swapped out for one from a sleeve; they go back into the deck with the next deal */
  pocket?: SpikeCard[]
  rng: number
}

export type SpikeAction =
  /** take the top card of the deck, optionally throwing a card away first */
  | { type: 'gain'; discard?: string }
  /** give a card for the top card of the discard pile */
  | { type: 'swap'; give: string }
  | { type: 'stand' }
  /** throw the hand in */
  | { type: 'junk' }
  | { type: 'check' }
  | { type: 'bet' }
  | { type: 'call' }
  | { type: 'raise' }
  | { type: 'roll' }
  | { type: 'settle' }
  | { type: 'nextHand' }
  /** cheating, decided outside the rules: a sylop from the sleeve for a card in hand */
  | { type: 'sleeve'; give: string }
  /** the current player was caught cheating and pays a fine into the sabacc pot */
  | { type: 'caught'; fine: number }

export type SpikeEvent =
  | { type: 'handStart'; hand: number; dealer: number; ante: number }
  | { type: 'chips'; playerId: number; delta: number; reason: 'ante' | 'bet' | 'pot' | 'sabaccPot' | 'fine' }
  | { type: 'roundStart'; round: number }
  | { type: 'phaseStart'; phase: SpikePhase }
  | { type: 'turnStart'; playerId: number }
  | { type: 'gained'; playerId: number; discarded: SpikeCard | null }
  | { type: 'swapped'; playerId: number; gave: SpikeCard; took: SpikeCard }
  | { type: 'stood'; playerId: number }
  | { type: 'junked'; playerId: number }
  | { type: 'checked'; playerId: number }
  | { type: 'bet'; playerId: number; amount: number; raise: boolean }
  | { type: 'called'; playerId: number; amount: number }
  | { type: 'diceRolled'; dice: [number, number]; shift: boolean }
  | { type: 'reshuffled' }
  | { type: 'showdown'; result: SpikeResult }
  | { type: 'settled'; result: SpikeResult }
  | { type: 'eliminated'; playerId: number }
  | { type: 'gameOver'; winner: number }
  | { type: 'sleeved'; playerId: number }

export interface SpikeSetup {
  name: string
  isHuman: boolean
  /** starting chips when they differ from the table's */
  chips?: number
}

export interface SpikeConfig {
  players: SpikeSetup[]
  startingChips: number
  seed: number
  rules?: Partial<SpikeRules>
}
