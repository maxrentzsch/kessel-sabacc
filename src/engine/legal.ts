import { TOKENS } from './tokens'
import type { Action, DrawSource, GameState, Player, Suit, TokenId } from './types'

export const DRAW_SOURCES: readonly DrawSource[] = ['sandDeck', 'bloodDeck', 'sandDiscard', 'bloodDiscard']

export function sourceSuit(source: DrawSource): Suit {
  return source.startsWith('sand') ? 'sand' : 'blood'
}

export function sourceIsDeck(source: DrawSource): boolean {
  return source.endsWith('Deck')
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.eliminated)
}

export function opponentsOf(state: GameState, playerId: number): Player[] {
  return state.players.filter((p) => !p.eliminated && p.id !== playerId)
}

/** Next seat still in the game, clockwise from `from`. */
export function nextActiveSeat(state: GameState, from: number): number {
  const n = state.players.length
  for (let step = 1; step <= n; step++) {
    const seat = (from + step) % n
    if (!state.players[seat].eliminated) return seat
  }
  return from
}

export function drawCost(player: Player): number {
  return player.freeDraw ? 0 : 1
}

export function canDrawFrom(state: GameState, source: DrawSource): boolean {
  const suit = sourceSuit(source)
  if (sourceIsDeck(source)) return state.decks[suit].length > 0 || state.discards[suit].length > 1
  return state.discards[suit].length > 0
}

export function canDraw(_state: GameState, player: Player): boolean {
  return !player.embargoed && player.chips >= drawCost(player)
}

/** Seats a targeted token may be aimed at. Empty for untargeted tokens. */
export function tokenTargets(state: GameState, playerId: number, token: TokenId): number[] {
  const kind = TOKENS[token].target
  if (kind === 'none') return []
  return opponentsOf(state, playerId)
    .filter((p) => !p.immune && (kind === 'opponent' || p.standing))
    .map((p) => p.id)
}

export function canPlayToken(state: GameState, playerId: number, token: TokenId): boolean {
  const player = state.players[playerId]
  if (state.phase !== 'turn' || state.current !== playerId) return false
  if (state.tokenPlayedThisTurn || !player.tokens.includes(token)) return false
  if (TOKENS[token].target !== 'none') return tokenTargets(state, playerId, token).length > 0
  if (token === 'refund' || token === 'extraRefund') return player.invested > 0
  if (token === 'freeDraw') return !player.embargoed && !player.freeDraw
  return true
}

/** Every action the acting player (`state.current`) may take right now. */
export function legalActions(state: GameState): Action[] {
  const player = state.players[state.current]
  switch (state.phase) {
    case 'turn': {
      const actions: Action[] = []
      for (const token of new Set(player.tokens)) {
        if (!canPlayToken(state, player.id, token)) continue
        const targets = tokenTargets(state, player.id, token)
        if (TOKENS[token].target === 'none') actions.push({ type: 'playToken', token })
        else for (const target of targets) actions.push({ type: 'playToken', token, target })
      }
      if (canDraw(state, player)) {
        for (const source of DRAW_SOURCES) {
          if (canDrawFrom(state, source)) actions.push({ type: 'draw', source })
        }
      }
      actions.push({ type: 'stand' })
      return actions
    }
    case 'discard':
      return [
        { type: 'discard', keep: 'new' },
        { type: 'discard', keep: 'old' },
      ]
    case 'primeChoice':
      return [...new Set(state.pendingDice!.dice)].map((value) => ({ type: 'choosePrime', value }))
    case 'impostor':
      return [...new Set(state.pendingDice!.dice)].map((value) => ({ type: 'chooseImpostor', value }))
    case 'showdown':
      return [{ type: 'settle' }]
    case 'handEnd':
      return [{ type: 'nextHand' }]
    case 'gameOver':
      return []
  }
}
