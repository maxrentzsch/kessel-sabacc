import type { AiProfile, Difficulty } from '../ai/policy'
import { Rng } from '../engine/rng'
import { buildSpikeDeck } from './deck'
import { activePlayers, betSize, canRaise, owed } from './legal'
import { compareSpike, scoreSpikeHand } from './scoring'
import type { SpikeAction, SpikeCard, SpikePlayer, SpikeScore, SpikeState } from './types'

/** How often a player of each strength picks a move at random or misjudges a hand. */
const SLIP: Record<Difficulty, number> = { easy: 0.3, medium: 0.1, hard: 0 }
const NOISE: Record<Difficulty, number> = { easy: 0.2, medium: 0.08, hard: 0 }
/** One roll in six deals everybody a new hand, whatever they held. */
const SHIFT = 1 / 6

/**
 * What an opponent typically shows at the end of a hand: random hands of two
 * to four cards, each the better of two tries, since players improve what they
 * are dealt. Sorted best first; built once.
 */
let reference: SpikeScore[] | null = null
function referenceHands(): SpikeScore[] {
  if (reference) return reference
  const rng = new Rng(20240517)
  const deck = buildSpikeDeck()
  const sizes = [2, 2, 3, 3, 3, 4]
  const one = () => scoreSpikeHand(rng.shuffle(deck).slice(0, rng.pick(sizes)))
  reference = Array.from({ length: 4000 }, () => {
    const a = one()
    const b = one()
    return compareSpike(a, b) <= 0 ? a : b
  }).sort(compareSpike)
  return reference
}

/** Share of typical opposing hands that this hand beats. */
function beatsOne(score: SpikeScore): number {
  const hands = referenceHands()
  // first reference hand that is not better than this one
  let lo = 0
  let hi = hands.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (compareSpike(hands[mid], score) < 0) lo = mid + 1
    else hi = mid
  }
  return 1 - lo / hands.length
}

/** Chance that a hand is the best at a table with so many opponents. */
export function spikeWinChance(hand: SpikeCard[], opponents: number): number {
  return Math.pow(beatsOne(scoreSpikeHand(hand)), Math.max(1, opponents))
}

/** Cards the player has not seen: a careful one remembers the whole discard pile. */
function unseen(state: SpikeState, p: SpikePlayer, counting: boolean): SpikeCard[] {
  const seen = new Set(p.hand.map((c) => c.id))
  const visible = counting ? state.discard : state.discard.slice(-1)
  for (const c of visible) seen.add(c.id)
  return buildSpikeDeck().filter((c) => !seen.has(c.id))
}

interface Option {
  action: SpikeAction
  value: number
}

/** Every move of the card phase with the hand it is expected to lead to. */
function cardOptions(state: SpikeState, p: SpikePlayer, profile: AiProfile, rng: Rng): Option[] {
  const opponents = activePlayers(state).length - 1
  const value = (hand: SpikeCard[]) => spikeWinChance(hand, opponents)
  const options: Option[] = [{ action: { type: 'stand' }, value: value(p.hand) }]
  const top = state.discard[state.discard.length - 1]
  if (top) {
    for (const card of p.hand) {
      options.push({ action: { type: 'swap', give: card.id }, value: value([...p.hand.filter((c) => c !== card), top]) })
    }
  }
  // What the deck may bring: judged on a handful of the cards it could be.
  const pool = rng.shuffle(unseen(state, p, profile.difficulty === 'hard')).slice(0, 12)
  const drawing = (kept: SpikeCard[]) => pool.reduce((sum, card) => sum + value([...kept, card]), 0) / pool.length
  if (p.hand.length < state.rules.handLimit) options.push({ action: { type: 'gain' }, value: drawing(p.hand) })
  for (const card of p.hand) {
    options.push({ action: { type: 'gain', discard: card.id }, value: drawing(p.hand.filter((c) => c !== card)) })
  }
  return options
}

function chooseCard(state: SpikeState, p: SpikePlayer, profile: AiProfile, rng: Rng): SpikeAction {
  const options = cardOptions(state, p, profile, rng)
  if (rng.chance(SLIP[profile.difficulty])) return rng.pick(options).action
  const best = Math.max(...options.map((o) => o.value))
  // Standing still is as good as anything that is not clearly better.
  const good = options.filter((o) => o.value >= best - 1e-9)
  return (good.find((o) => o.action.type === 'stand') ?? rng.pick(good)).action
}

function chooseBet(state: SpikeState, p: SpikePlayer, profile: AiProfile, rng: Rng): SpikeAction {
  const opponents = activePlayers(state).length - 1
  const misjudged = (rng.next() * 2 - 1) * NOISE[profile.difficulty]
  // A sabacc shift throws every hand away, so no hand is ever quite safe.
  const held = spikeWinChance(p.hand, opponents)
  const chance = Math.min(1, Math.max(0, held * (1 - SHIFT) + SHIFT / (opponents + 1) + misjudged))
  const due = owed(state, p)
  const bold = profile.aggression * 0.1

  if (due === 0) {
    if (p.chips === 0) return { type: 'check' }
    const bluff = rng.chance(0.05 + Math.max(0, profile.aggression) * 0.06)
    const wants = chance > 0.58 - bold || bluff
    if (!wants) return { type: 'check' }
    return state.toCall === 0 ? { type: 'bet' } : canRaise(state, p) ? { type: 'raise' } : { type: 'check' }
  }

  // Calling pays when the chance to win beats the price of staying in.
  const pot = state.handPot + (scoreSpikeHand(p.hand).total === 0 ? state.sabaccPot : 0)
  const price = due / (pot + 2 * due)
  if (chance > 0.72 - bold && canRaise(state, p) && p.chips > due + betSize(state)) return { type: 'raise' }
  if (chance > price + 0.03 - bold * 0.5) return { type: 'call' }
  return { type: 'junk' }
}

/** The move an opponent makes; the table's own steps (dice, settling) are passed through. */
export function chooseSpikeAction(state: SpikeState, profile: AiProfile, rng: Rng): SpikeAction {
  const p = state.players[state.current]
  switch (state.phase) {
    case 'card':
      return chooseCard(state, p, profile, rng)
    case 'bet':
      return chooseBet(state, p, profile, rng)
    case 'dice':
      return { type: 'roll' }
    case 'showdown':
      return { type: 'settle' }
    default:
      return { type: 'nextHand' }
  }
}
