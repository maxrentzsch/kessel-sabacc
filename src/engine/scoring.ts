import type {
  Card,
  GameState,
  Hand,
  HandResult,
  HandScore,
  Modifiers,
  PlayerResult,
  Suit,
} from './types'

export const NO_MODIFIERS: Modifiers = {
  sylopZero: false,
  impostorSix: false,
  cookTheBooks: false,
  primeValue: null,
}

/** Score a fully resolved pair of values. `pure` = both cards are Sylops. */
export function scoreValues(
  sandValue: number,
  bloodValue: number,
  pure: boolean,
  mods: Modifiers,
): HandScore {
  const diff = Math.abs(sandValue - bloodValue)
  const sum = sandValue + bloodValue
  const base = { sandValue, bloodValue, diff, sum }
  if (pure) return { ...base, category: 'pure', power: 1000 }
  if (diff === 0) {
    if (mods.primeValue === sandValue) return { ...base, category: 'prime', power: 900 }
    const rank = mods.cookTheBooks ? 7 - sandValue : sandValue
    return { ...base, category: 'sabacc', power: 800 - rank * 10 }
  }
  return { ...base, category: 'none', power: 700 - diff * 100 - sum }
}

function fixedValue(card: Card, mods: Modifiers, impostor: Partial<Record<Suit, number>>): number | null {
  if (card.kind === 'number') return card.value
  if (card.kind === 'impostor') return mods.impostorSix ? 6 : (impostor[card.suit] ?? null)
  return null // Sylop depends on the other card
}

/**
 * Score a hand. Impostor values must already be resolved (via `impostor` or
 * Major Fraud); unresolved Impostors throw.
 */
export function scoreHand(
  hand: Hand,
  mods: Modifiers,
  impostor: Partial<Record<Suit, number>> = {},
): HandScore {
  const pure = hand.sand.kind === 'sylop' && hand.blood.kind === 'sylop'
  if (pure) return scoreValues(0, 0, true, mods)

  const sandFixed = fixedValue(hand.sand, mods, impostor)
  const bloodFixed = fixedValue(hand.blood, mods, impostor)
  const sylopValue = (other: number | null): number => {
    if (other === null) throw new Error('unresolved Impostor')
    return mods.sylopZero ? 0 : other
  }
  const sand = hand.sand.kind === 'sylop' ? sylopValue(bloodFixed) : sandFixed
  const blood = hand.blood.kind === 'sylop' ? sylopValue(sandFixed) : bloodFixed
  if (sand === null || blood === null) throw new Error('unresolved Impostor')
  return scoreValues(sand, blood, false, mods)
}

/** Chips a losing hand pays on top of its invested chips. */
export function penaltyFor(score: HandScore): number {
  return score.category === 'none' ? score.diff : 1
}

/** Work out the outcome of the hand without touching the state. */
export function computeResult(state: GameState): HandResult {
  const active = state.players.filter((p) => !p.eliminated && p.hand)
  const scored = active.map((p) => ({
    player: p,
    score: scoreHand(p.hand!, state.modifiers, p.impostor),
  }))
  const best = Math.max(...scored.map((s) => s.score.power))

  const ranking: PlayerResult[] = scored.map(({ player, score }) => {
    const winner = score.power === best
    const penalty = winner ? 0 : Math.min(penaltyFor(score) + state.rules.penaltyBonus, player.chips)
    const chipsAfter = winner ? player.chips + player.invested : player.chips - penalty
    return {
      playerId: player.id,
      score,
      winner,
      investedBefore: player.invested,
      penalty,
      chipsAfter,
      eliminated: chipsAfter <= 0,
    }
  })
  ranking.sort((a, b) => b.score.power - a.score.power)

  // Somebody always walks away: if the table would be wiped out, the best hand stays.
  if (ranking.every((r) => r.eliminated)) ranking[0].eliminated = false
  return { ranking }
}
