import { CHARACTERS } from '../ai/personalities'
import type { Character } from '../ai/personalities'
import type { Difficulty } from '../ai/policy'
import { Rng, TOKEN_IDS } from '../engine'
import type { Rules, TokenId } from '../engine'
import { VENUES } from './venues'
import { tx } from '../i18n'

/** A table that is made up on the spot: for the tour and for the daily hand. */
export interface Stop {
  title: string
  venue: string
  opponents: Character[]
  chips: number
  rules: Partial<Rules>
  /** the house rules in words */
  ruleTexts: string[]
}

const MUTATORS: { rules: Partial<Rules>; text: string }[] = [
  { rules: { rounds: 2 }, text: tx`Kurze Hände: nur zwei Runden.` },
  { rules: { rounds: 4 }, text: tx`Lange Hände: vier Runden.` },
  { rules: { sylops: 3 }, text: tx`Drei Sylops pro Deck.` },
  { rules: { impostors: 6 }, text: tx`Sechs Impostoren pro Deck.` },
  { rules: { penaltyBonus: 1 }, text: tx`Steuer: jede verlorene Hand kostet 1 Chip extra.` },
  { rules: { impostors: 0 }, text: tx`Keine Impostoren.` },
]

function buildStop(rng: Rng, title: string, seats: Difficulty[], mutators: number, chips: number): Stop {
  const picks = rng.shuffle([...MUTATORS]).slice(0, mutators)
  const rules: Partial<Rules> = {}
  const ruleTexts: string[] = []
  for (const m of picks) {
    // two rules for the same thing would contradict each other
    if (Object.keys(m.rules).some((key) => key in rules)) continue
    Object.assign(rules, m.rules)
    ruleTexts.push(m.text)
  }
  return {
    title,
    venue: rng.pick(Object.keys(VENUES)),
    opponents: rng
      .shuffle(Object.values(CHARACTERS))
      .slice(0, seats.length)
      .map((c, seat) => ({ ...c, profile: { ...c.profile, difficulty: seats[seat] } })),
    chips,
    rules,
    ruleTexts,
  }
}

// ── On tour: table after table, for as long as the luck holds ────────────────

export const TOUR_ENTRY = 300
/** tables that have to be won in the career before the tour opens */
export const TOUR_UNLOCK = 3

/**
 * What the pot is worth after so many tables. It roughly doubles as long as
 * the next table is about an even bet; later the step up is smaller than the
 * risk, and playing on is for the record rather than the money.
 */
const TOUR_POTS = [0, 500, 1000, 2000, 3500, 6000, 9000, 13000]

export function tourPot(wins: number): number {
  const last = TOUR_POTS.length - 1
  return wins <= last ? TOUR_POTS[Math.max(0, wins)] : TOUR_POTS[last] + (wins - last) * 5000
}

/** Who sits at each stop: duels first, then fuller and sharper tables. */
const TOUR_SEATS: Difficulty[][] = [
  ['easy'],
  ['medium'],
  ['hard'],
  ['easy', 'medium'],
  ['medium', 'medium'],
  ['medium', 'hard'],
  ['hard', 'hard'],
  ['medium', 'hard', 'hard'],
  ['hard', 'hard', 'hard'],
]

/** Who sits at the `stage`-th table (from 1); beyond the last listed stage it stays that hard. */
export function tourSeats(stage: number): Difficulty[] {
  return TOUR_SEATS[Math.min(stage, TOUR_SEATS.length) - 1]
}

/** How many house rules the `stage`-th table has. */
export function tourRuleCount(stage: number): number {
  return stage >= 4 ? 2 : 1
}

/** The `stage`-th table (from 1) of the tour with this seed. Always the same for the same seed. */
export function tourStop(seed: number, stage: number): Stop {
  const rng = new Rng(seed + stage * 7919)
  return buildStop(rng, tx`Halt ${stage}`, tourSeats(stage), tourRuleCount(stage), 6)
}

/** The stages with a pot of their own; after the last one every win adds the same. */
export const TOUR_STAGES = TOUR_POTS.length - 1

// ── The daily hand: one table a day, the same for everybody ──────────────────

export function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function dayBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const prev = new Date(y, m - 1, d - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(prev.getDate())}`
}

function seedOf(date: string): number {
  let h = 2166136261
  for (const ch of date) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h | 0
}

export interface Daily extends Stop {
  seed: number
  /** the tokens everybody plays the day with */
  tokens: TokenId[]
}

export function dailyStop(date: string): Daily {
  const seed = seedOf(date)
  const rng = new Rng(seed)
  const stop = buildStop(rng, tx`Tageshand`, ['medium', 'easy'], 1, 5)
  return { ...stop, seed, tokens: rng.shuffle([...TOKEN_IDS]).slice(0, 3) }
}

/** Credits for winning the daily hand on the `streak`-th day in a row. */
export function dailyReward(streak: number): number {
  return 150 + Math.min(streak, 7) * 50
}
