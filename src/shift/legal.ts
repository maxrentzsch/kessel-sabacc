import type { ShiftAction, ShiftPlayer, ShiftState } from './types'

/** Still holding cards in this hand. */
export function inShiftHand(p: ShiftPlayer): boolean {
  return !p.eliminated && !p.folded
}

export function shiftActive(state: ShiftState): ShiftPlayer[] {
  return state.players.filter(inShiftHand)
}

/** Seats after `from`, clockwise, that are still in the hand. */
export function shiftSeatsAfter(state: ShiftState, from: number): number[] {
  const n = state.players.length
  return Array.from({ length: n }, (_, i) => (from + 1 + i) % n).filter((id) => inShiftHand(state.players[id]))
}

/** What a bet or a raise costs in the current betting round. */
export function shiftBetSize(state: ShiftState): number {
  return state.rules.bets[state.round - 1]
}

/** Chips the player has to add to stay in. */
export function shiftOwed(state: ShiftState, p: ShiftPlayer): number {
  return Math.max(0, state.toCall - p.bet)
}

export function shiftCanRaise(state: ShiftState, p: ShiftPlayer): boolean {
  return state.raises < state.rules.maxRaises && p.chips > shiftOwed(state, p)
}

/**
 * The moves open to the player whose turn it is. Selecting and improving take
 * any set of cards, so these list one representative each: the whole hand for
 * a selection, nothing added for an improvement.
 */
export function shiftActions(state: ShiftState): ShiftAction[] {
  const p = state.players[state.current]
  switch (state.phase) {
    case 'select':
      return [{ type: 'select', cards: p.hand.map((c) => c.id) }, { type: 'select', cards: [p.hand[0].id] }, { type: 'fold' }]
    case 'improve':
      return [{ type: 'improve', cards: [] }, { type: 'improve', cards: p.fresh }, { type: 'fold' }]
    case 'bet': {
      const raise = shiftCanRaise(state, p) ? [{ type: 'raise' } as const] : []
      if (shiftOwed(state, p) === 0) return state.toCall === 0 ? [{ type: 'check' }, ...(p.chips > 0 ? [{ type: 'bet' } as const] : [])] : [{ type: 'check' }, ...raise]
      return [{ type: 'call' }, ...raise, { type: 'fold' }]
    }
    case 'showdown':
      return [{ type: 'settle' }]
    case 'handEnd':
      return [{ type: 'nextHand' }]
    default:
      return []
  }
}
