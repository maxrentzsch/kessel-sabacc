import type { SpikeAction, SpikePlayer, SpikeState } from './types'

/** Still holding cards in this hand. */
export function inHand(p: SpikePlayer): boolean {
  return !p.eliminated && !p.folded
}

export function activePlayers(state: SpikeState): SpikePlayer[] {
  return state.players.filter(inHand)
}

/** Seats after `from`, clockwise, that are still in the hand. */
export function seatsAfter(state: SpikeState, from: number): number[] {
  const n = state.players.length
  return Array.from({ length: n }, (_, i) => (from + 1 + i) % n).filter((id) => inHand(state.players[id]))
}

/** What a bet or a raise costs in the current round. */
export function betSize(state: SpikeState): number {
  return state.rules.bets[Math.min(state.round, state.rules.bets.length) - 1]
}

/** Chips the player has to add to stay in. */
export function owed(state: SpikeState, p: SpikePlayer): number {
  return Math.max(0, state.toCall - p.bet)
}

export function canRaise(state: SpikeState, p: SpikePlayer): boolean {
  return state.raises < state.rules.maxRaises && p.chips > owed(state, p)
}

/** Every move open to the player whose turn it is. */
export function spikeActions(state: SpikeState): SpikeAction[] {
  const p = state.players[state.current]
  switch (state.phase) {
    case 'card': {
      const actions: SpikeAction[] = [{ type: 'stand' }, { type: 'junk' }]
      if (p.hand.length < state.rules.handLimit) actions.push({ type: 'gain' })
      for (const card of p.hand) actions.push({ type: 'gain', discard: card.id })
      if (state.discard.length > 0) for (const card of p.hand) actions.push({ type: 'swap', give: card.id })
      return actions
    }
    case 'bet': {
      if (owed(state, p) === 0) return state.toCall === 0 ? [{ type: 'check' }, ...(p.chips > 0 ? [{ type: 'bet' } as const] : [])] : [{ type: 'check' }, ...(canRaise(state, p) ? [{ type: 'raise' } as const] : [])]
      return [{ type: 'call' }, ...(canRaise(state, p) ? [{ type: 'raise' } as const] : []), { type: 'junk' }]
    }
    case 'dice':
      return [{ type: 'roll' }]
    case 'showdown':
      return [{ type: 'settle' }]
    case 'handEnd':
      return [{ type: 'nextHand' }]
    default:
      return []
  }
}
