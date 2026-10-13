import {
  buildSuit,
  canDraw,
  canDrawFrom,
  canPlayToken,
  drawCost,
  DRAW_SOURCES,
  legalActions,
  nextActiveSeat,
  opponentsOf,
  sourceIsDeck,
  sourceSuit,
  tokenTargets,
} from '../engine'
import type { Action, Card, DrawSource, GameState, Hand, Modifiers, Player, Rng, Suit, TokenId } from '../engine'
import { handUtility, winChance } from './evaluate'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface AiProfile {
  difficulty: Difficulty
  /** −1 (only draws when clearly worth it) … +1 (draws on thin odds) */
  aggression: number
  /** 0 … 1: how readily shift tokens are spent */
  tokenRate: number
}

/** Cards of a suit the player cannot see: the deck plus the other hands. */
function unseenCards(state: GameState, player: Player, suit: Suit, countCards: boolean): Card[] {
  const seen = new Set<string>([player.hand![suit].id])
  if (countCards) for (const c of state.discards[suit]) seen.add(c.id)
  return buildSuit(suit, state.rules).filter((c) => !seen.has(c.id))
}

interface Situation {
  state: GameState
  player: Player
  hand: Hand
  mods: Modifiers
  opponents: number
}

function utility(sit: Situation, hand: Hand, stock: number, invested: number, mods = sit.mods): number {
  return handUtility(hand, mods, sit.opponents, stock, invested, {})
}

/** Utility after picking up `card`, keeping whichever of the two is better. */
function utilityWith(sit: Situation, card: Card, stock: number, invested: number): number {
  const swapped = { ...sit.hand, [card.suit]: card }
  return Math.max(utility(sit, swapped, stock, invested), utility(sit, sit.hand, stock, invested))
}

interface DrawPlan {
  source: DrawSource
  gain: number
}

/** Best pile to draw from and how much it is worth compared with standing. */
function bestDraw(sit: Situation, cost: number, countCards: boolean): DrawPlan | null {
  const { state, player } = sit
  const stock = player.chips - cost
  const invested = player.invested + cost
  const stand = utility(sit, sit.hand, player.chips, player.invested)
  let plan: DrawPlan | null = null
  for (const source of DRAW_SOURCES) {
    if (!canDrawFrom(state, source)) continue
    const suit = sourceSuit(source)
    let value: number
    if (sourceIsDeck(source)) {
      const pool = unseenCards(state, player, suit, countCards)
      value = pool.reduce((sum, c) => sum + utilityWith(sit, c, stock, invested), 0) / pool.length
    } else {
      value = utilityWith(sit, state.discards[suit].at(-1)!, stock, invested)
    }
    const gain = value - stand
    if (!plan || gain > plan.gain) plan = { source, gain }
  }
  return plan
}

function drawMargin(profile: AiProfile, roundsLeft: number, rng: Rng): number {
  const noise = profile.difficulty === 'easy' ? (rng.next() - 0.5) * 2.2 : profile.difficulty === 'medium' ? (rng.next() - 0.5) * 0.5 : 0
  // Earlier rounds leave room for follow-up draws, so drawing is worth a little extra.
  return 0.12 - profile.aggression * 0.18 - roundsLeft * 0.08 + noise
}

// ── Shift tokens ─────────────────────────────────────────────────────────────

/** The entry with the highest score; ties are broken at random so no seat is singled out. */
function pickBest<T>(items: T[], score: (item: T) => number, rng: Rng): T {
  const best = Math.max(...items.map(score))
  return rng.pick(items.filter((item) => score(item) === best))
}

/** How often a profile simply gets it wrong: the main thing separating the difficulty levels. */
const SLIP: Record<Difficulty, number> = { easy: 0.24, medium: 0.07, hard: 0 }

function chooseToken(sit: Situation, profile: AiProfile, rng: Rng, plan: DrawPlan | null, margin: number): Action | null {
  const { state, player } = sit
  const playable = [...new Set(player.tokens)].filter((t) => canPlayToken(state, player.id, t))
  if (playable.length === 0) return null

  if (profile.difficulty === 'easy') {
    if (!rng.chance(0.12 + profile.tokenRate * 0.15)) return null
    const token = rng.pick(playable)
    const targets = tokenTargets(state, player.id, token)
    return { type: 'playToken', token, target: targets.length ? rng.pick(targets) : undefined }
  }

  const others = opponentsOf(state, player.id)
  const exposed = others.filter((p) => !p.immune)
  const pWin = winChance(sit.hand, sit.mods, sit.opponents)
  const lastRound = state.round === state.rules.rounds
  const eager = (base: number) => rng.chance(Math.min(1, base * (0.5 + profile.tokenRate)))
  const play = (token: TokenId, target?: number): Action => ({ type: 'playToken', token, target })
  const has = (token: TokenId) => playable.includes(token)
  const here = utility(sit, sit.hand, player.chips, player.invested)
  const withMods = (patch: Partial<Modifiers>) =>
    utility(sit, sit.hand, player.chips, player.invested, { ...sit.mods, ...patch }) - here

  // Out of chips but still wanting a card: get chips back or draw for free.
  if (player.chips === 0 && !player.embargoed) {
    if (has('freeDraw')) {
      const free = bestDraw(sit, 0, profile.difficulty === 'hard')
      if (free && free.gain > margin) return play('freeDraw')
    }
    if (has('refund') && pWin < 0.6) return play('refund')
    if (has('extraRefund') && pWin < 0.6 && player.invested >= 2) return play('extraRefund')
  }

  if (has('freeDraw') && plan && plan.gain > margin && (player.chips <= 3 || eager(0.5))) return play('freeDraw')

  if (lastRound && pWin < 0.45) {
    if (has('extraRefund') && player.invested >= 3) return play('extraRefund')
    if (has('refund') && player.invested >= 2) return play('refund')
  }

  if (has('directTransaction') && lastRound && pWin < 0.3) {
    const targets = tokenTargets(state, player.id, 'directTransaction')
      .map((id) => state.players[id])
      .filter((p) => p.standing && p.invested <= 1)
    if (targets.length) return play('directTransaction', rng.pick(targets).id)
  }

  if (has('exhaustion') && state.round >= 2 && pWin < 0.65) {
    const targets = tokenTargets(state, player.id, 'exhaustion')
      .map((id) => state.players[id])
      .filter((p) => p.standing)
    if (targets.length && eager(0.6)) {
      return play('exhaustion', pickBest(targets, (p) => -p.invested, rng).id)
    }
  }

  for (const [token, patch] of [
    ['majorFraud', { impostorSix: true }],
    ['cookTheBooks', { cookTheBooks: true }],
    ['markdown', { sylopZero: true }],
  ] as const) {
    if (!has(token)) continue
    const delta = withMods(patch)
    if (delta > 0.3) return play(token)
    // Harmless for me, possibly nasty for somebody else.
    if (token !== 'cookTheBooks' && lastRound && Math.abs(delta) < 0.01 && eager(0.25)) return play(token)
  }

  if (has('primeSabacc') && state.round >= 2 && state.modifiers.primeValue === null) {
    const numbers = [sit.hand.sand, sit.hand.blood].filter((c) => c.kind === 'number')
    const sylop = sit.hand.sand.kind === 'sylop' || sit.hand.blood.kind === 'sylop'
    const pair = numbers.length === 2 && numbers[0].value === numbers[1].value
    if ((pair || (sylop && numbers.length === 1)) && eager(0.7)) return play('primeSabacc')
  }

  const withChips = exposed.filter((p) => p.chips > 0)
  if (withChips.length > 0) {
    if (has('embezzlement') && eager(0.55)) return play('embezzlement')
    const standing = withChips.filter((p) => p.standing)
    if (pWin >= 0.4) {
      if (has('targetAudit') && standing.length && eager(0.6)) return play('targetAudit', pickBest(standing, (p) => p.chips, rng).id)
      if (has('generalAudit') && standing.length >= Math.min(2, others.length) && eager(0.7)) return play('generalAudit')
    }
    if (pWin >= 0.5 && state.round >= 2) {
      if (has('targetTariff') && eager(0.5)) return play('targetTariff', pickBest(withChips, (p) => p.chips, rng).id)
      if (has('generalTariff') && eager(0.5)) return play('generalTariff')
    }
  }

  if (has('embargo') && state.round >= 2 && pWin >= 0.45) {
    const next = state.players[nextActiveSeat(state, player.id)]
    const nextStillActs = !(lastRound && next.id === state.dealer)
    if (!next.immune && nextStillActs && eager(0.5)) return play('embargo')
  }

  if (has('immunity') && state.round === 1 && others.some((p) => p.tokens.length > 0) && eager(0.3)) {
    return play('immunity')
  }
  return null
}

// ── Entry point ──────────────────────────────────────────────────────────────

/** Decide what the acting AI player does next. Works for every phase. */
export function chooseAction(state: GameState, profile: AiProfile, rng: Rng): Action {
  const player = state.players[state.current]
  const sit: Situation = {
    state,
    player,
    hand: player.hand!,
    mods: state.modifiers,
    opponents: Math.max(1, opponentsOf(state, player.id).length),
  }

  switch (state.phase) {
    case 'turn': {
      const hard = profile.difficulty === 'hard'
      const margin = drawMargin(profile, state.rules.rounds - state.round, rng)
      const plan = canDraw(state, player) ? bestDraw(sit, drawCost(player), hard) : null
      if (!state.tokenPlayedThisTurn) {
        const token = chooseToken(sit, profile, rng, plan, margin)
        if (token) return token
      }
      if (plan && plan.gain > margin) return { type: 'draw', source: plan.source }
      return { type: 'stand' }
    }
    case 'discard': {
      const drawn = state.pendingDraw!.card
      const swapped = { ...sit.hand, [drawn.suit]: drawn }
      const better =
        utility(sit, swapped, player.chips, player.invested) > utility(sit, sit.hand, player.chips, player.invested)
      // Weaker players sometimes misjudge which card helps them.
      const keepNew = rng.chance(SLIP[profile.difficulty]) ? !better : better
      return { type: 'discard', keep: keepNew ? 'new' : 'old' }
    }
    case 'primeChoice': {
      const dice = state.pendingDice!.dice
      const mine = [sit.hand.sand, sit.hand.blood].filter((c) => c.kind === 'number').map((c) => c.value)
      const value = dice.find((d) => mine.includes(d)) ?? rng.pick(dice)
      return { type: 'choosePrime', value }
    }
    case 'impostor': {
      const { dice, suit } = state.pendingDice!
      const value = (d: number) => handUtility(sit.hand, sit.mods, sit.opponents, player.chips, player.invested, { ...player.impostor, [suit!]: d })
      if (rng.chance(SLIP[profile.difficulty])) return { type: 'chooseImpostor', value: rng.pick(dice) }
      return { type: 'chooseImpostor', value: value(dice[0]) >= value(dice[1]) ? dice[0] : dice[1] }
    }
    default:
      return legalActions(state)[0]
  }
}
