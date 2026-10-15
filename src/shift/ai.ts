import type { AiProfile, Difficulty } from '../ai/policy'
import { Rng } from '../engine/rng'
import { buildSpikeDeck, SPIKE_SUITS } from '../spike/deck'
import { shiftActive, shiftBetSize, shiftCanRaise, shiftOwed } from './legal'
import { HAND_SIZE } from './reducer'
import { bestSelection, compareShift, scoreSelection } from './scoring'
import { TARGET_FACES } from './types'
import type { ShiftAction, ShiftCard, ShiftPlayer, ShiftScore, ShiftState, ShiftTarget } from './types'

/** How often a player of each strength picks a move at random or misjudges a hand. */
const SLIP: Record<Difficulty, number> = { easy: 0.3, medium: 0.1, hard: 0 }
const NOISE: Record<Difficulty, number> = { easy: 0.2, medium: 0.08, hard: 0 }
/** How many possible shifts a player of each strength thinks through for a selection. */
const LOOKAHEAD: Record<Difficulty, number> = { easy: 0, medium: 5, hard: 12 }

/** The best the fresh cards can add to a selection that is already set aside. */
export function bestImprovement(selection: ShiftCard[], fresh: ShiftCard[], target: ShiftTarget): ShiftCard[] {
  let best: ShiftCard[] = []
  let bestScore = scoreSelection(selection, target)
  for (let mask = 1; mask < 1 << fresh.length; mask++) {
    const add = fresh.filter((_, i) => mask & (1 << i))
    const score = scoreSelection([...selection, ...add], target)
    if (compareShift(score, bestScore) < 0) {
      best = add
      bestScore = score
    }
  }
  return best
}

/**
 * Where an opponent's selection typically ends up, measured as the gap to
 * the target: random deals played sensibly, best first. Built once, per target.
 */
const reference = new Map<string, ShiftScore[]>()
function referenceScores(target: ShiftTarget): ShiftScore[] {
  const key = `${target.value}`
  const known = reference.get(key)
  if (known) return known
  const rng = new Rng(20241031 + target.value)
  const scores = Array.from({ length: 1500 }, () => {
    const deck = rng.shuffle(buildSpikeDeck())
    const suit = rng.pick(SPIKE_SUITS)
    const goal = { value: target.value, suit }
    const hand = deck.splice(0, HAND_SIZE)
    const kept = bestSelection(hand, goal)
    const fresh = deck.splice(0, HAND_SIZE - kept.length)
    const final = [...kept, ...bestImprovement(kept, fresh, goal)]
    // the suit of a random deal says nothing about this hand's suit: count matches as if for the real one
    return { ...scoreSelection(final, goal), suited: final.filter((c) => c.suit === null || c.suit === target.suit).length }
  }).sort(compareShift)
  reference.set(key, scores)
  return scores
}

/** Chance that a selection is the best at a table with so many opponents. */
export function shiftWinChance(score: ShiftScore, target: ShiftTarget, opponents: number): number {
  const scores = referenceScores(target)
  let worse = 0
  let even = 0
  for (const other of scores) {
    const c = compareShift(score, other)
    if (c < 0) worse++
    else if (c === 0) even++
  }
  const beatsOne = (worse + even / 2) / scores.length
  return Math.pow(beatsOne, Math.max(1, opponents))
}

/** Cards the player has not seen. */
function unseen(p: ShiftPlayer): ShiftCard[] {
  const seen = new Set([...p.hand, ...p.selection].map((c) => c.id))
  return buildSpikeDeck().filter((c) => !seen.has(c.id))
}

/** How good keeping these cards is likely to turn out once the shift has dealt the rest. */
function selectionValue(kept: ShiftCard[], state: ShiftState, p: ShiftPlayer, samples: number, rng: Rng): number {
  const opponents = shiftActive(state).length - 1
  const now = (cards: ShiftCard[]) => shiftWinChance(scoreSelection(cards, state.target), state.target, opponents)
  if (samples === 0) return now(kept)
  const pool = unseen(p)
  let sum = 0
  for (let i = 0; i < samples; i++) {
    const fresh = rng.shuffle(pool.slice()).slice(0, HAND_SIZE - kept.length)
    sum += now([...kept, ...bestImprovement(kept, fresh, state.target)])
  }
  return sum / samples
}

function chooseSelection(state: ShiftState, p: ShiftPlayer, profile: AiProfile, rng: Rng): ShiftAction {
  const depth = LOOKAHEAD[profile.difficulty]
  if (rng.chance(SLIP[profile.difficulty])) {
    const pick = p.hand.filter(() => rng.chance(0.5))
    return { type: 'select', cards: (pick.length ? pick : [rng.pick(p.hand)]).map((c) => c.id) }
  }
  if (depth === 0) return { type: 'select', cards: bestSelection(p.hand, state.target).map((c) => c.id) }
  let best: ShiftCard[] = [p.hand[0]]
  let bestValue = -1
  for (let mask = 1; mask < 1 << p.hand.length; mask++) {
    const kept = p.hand.filter((_, i) => mask & (1 << i))
    const value = selectionValue(kept, state, p, depth, rng)
    if (value > bestValue) {
      best = kept
      bestValue = value
    }
  }
  return { type: 'select', cards: best.map((c) => c.id) }
}

function chooseImprovement(state: ShiftState, p: ShiftPlayer, profile: AiProfile, rng: Rng): ShiftAction {
  const fresh = p.hand.filter((c) => p.fresh.includes(c.id))
  if (rng.chance(SLIP[profile.difficulty])) return { type: 'improve', cards: fresh.filter(() => rng.chance(0.4)).map((c) => c.id) }
  return { type: 'improve', cards: bestImprovement(p.selection, fresh, state.target).map((c) => c.id) }
}

/** How likely the player is to win the hand, as they see it now. */
function standing(state: ShiftState, p: ShiftPlayer, profile: AiProfile, rng: Rng): number {
  const opponents = shiftActive(state).length - 1
  // before the shift the selection can still grow; after it, it is what it is
  const chance = state.round === 1 ? selectionValue(p.selection, state, p, Math.max(4, LOOKAHEAD[profile.difficulty]), rng) : shiftWinChance(scoreSelection(p.selection, state.target), state.target, opponents)
  return Math.min(1, Math.max(0, chance + (rng.next() * 2 - 1) * NOISE[profile.difficulty]))
}

function chooseBet(state: ShiftState, p: ShiftPlayer, profile: AiProfile, rng: Rng): ShiftAction {
  const chance = standing(state, p, profile, rng)
  const due = shiftOwed(state, p)
  const bold = profile.aggression * 0.1
  if (due === 0) {
    if (p.chips === 0) return { type: 'check' }
    const bluff = rng.chance(0.05 + Math.max(0, profile.aggression) * 0.06)
    if (!(chance > 0.55 - bold || bluff)) return { type: 'check' }
    return state.toCall === 0 ? { type: 'bet' } : shiftCanRaise(state, p) ? { type: 'raise' } : { type: 'check' }
  }
  // Calling pays when the chance to win beats the price of staying in.
  const price = due / (state.pot + 2 * due)
  if (chance > 0.7 - bold && shiftCanRaise(state, p) && p.chips > due + shiftBetSize(state)) return { type: 'raise' }
  if (chance > price + 0.03 - bold * 0.5) return { type: 'call' }
  return { type: 'fold' }
}

/** The move an opponent makes; the table's own steps are passed through. */
export function chooseShiftAction(state: ShiftState, profile: AiProfile, rng: Rng): ShiftAction {
  const p = state.players[state.current]
  switch (state.phase) {
    case 'select':
      return chooseSelection(state, p, profile, rng)
    case 'improve':
      return chooseImprovement(state, p, profile, rng)
    case 'bet':
      return chooseBet(state, p, profile, rng)
    case 'showdown':
      return { type: 'settle' }
    default:
      return { type: 'nextHand' }
  }
}

/** Every value the gold die can show, for anything that needs to know them all. */
export const TARGETS = [...new Set(TARGET_FACES)]
