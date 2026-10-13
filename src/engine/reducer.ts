import { buildShuffledSuit, STANDARD_RULES, SUITS } from './deck'
import {
  canDraw,
  canDrawFrom,
  canPlayToken,
  drawCost,
  nextActiveSeat,
  opponentsOf,
  sourceIsDeck,
  sourceSuit,
  tokenTargets,
} from './legal'
import { Rng } from './rng'
import { computeResult, NO_MODIFIERS } from './scoring'
import {
  EXTRA_REFUND_AMOUNT,
  GENERAL_AUDIT_AMOUNT,
  GENERAL_TARIFF_AMOUNT,
  REFUND_AMOUNT,
  TARGET_AUDIT_AMOUNT,
  TARGET_TARIFF_AMOUNT,
  TOKENS,
} from './tokens'
import type {
  Action,
  Card,
  ChipReason,
  DrawSource,
  GameConfig,
  GameEvent,
  GameState,
  Player,
  Suit,
  TokenId,
} from './types'

export interface StepResult {
  state: GameState
  events: GameEvent[]
}

export class IllegalActionError extends Error {}

interface Ctx {
  s: GameState
  rng: Rng
  events: GameEvent[]
}

function fail(message: string): never {
  throw new IllegalActionError(message)
}

export function createGame(config: GameConfig): StepResult {
  const rng = new Rng(config.seed)
  const players: Player[] = config.players.map((setup, id) => ({
    id,
    name: setup.name,
    isHuman: setup.isHuman,
    chips: setup.chips ?? config.startingChips,
    invested: 0,
    hand: null,
    tokens: [...setup.tokens],
    eliminated: false,
    standing: false,
    immune: false,
    embargoed: false,
    freeDraw: false,
    impostor: {},
  }))
  const s: GameState = {
    rng: 0,
    rules: { ...STANDARD_RULES, ...config.rules },
    players,
    decks: { sand: [], blood: [] },
    discards: { sand: [], blood: [] },
    handNumber: 0,
    round: 1,
    dealer: rng.int(players.length),
    current: 0,
    phase: 'turn',
    tokenPlayedThisTurn: false,
    pendingDraw: null,
    pendingDice: null,
    modifiers: { ...NO_MODIFIERS },
    result: null,
    winner: null,
  }
  const ctx: Ctx = { s, rng, events: [] }
  startHand(ctx, s.dealer)
  s.rng = rng.state
  return { state: s, events: ctx.events }
}

export function applyAction(state: GameState, action: Action): StepResult {
  const s = structuredClone(state)
  const ctx: Ctx = { s, rng: new Rng(s.rng), events: [] }
  const player = s.players[s.current]

  switch (action.type) {
    case 'playToken':
      playToken(ctx, player, action.token, action.target)
      break
    case 'choosePrime': {
      if (s.phase !== 'primeChoice' || !s.pendingDice) fail('no Prime Sabacc roll pending')
      if (!s.pendingDice.dice.includes(action.value)) fail('value was not rolled')
      s.modifiers.primeValue = action.value
      ctx.events.push({ type: 'diceChosen', playerId: player.id, purpose: 'prime', value: action.value })
      s.pendingDice = null
      s.phase = 'turn'
      break
    }
    case 'draw':
      draw(ctx, player, action.source)
      break
    case 'discard': {
      if (s.phase !== 'discard' || !s.pendingDraw || !player.hand) fail('nothing to discard')
      const drawn = s.pendingDraw.card
      const suit = drawn.suit
      const out = action.keep === 'new' ? player.hand[suit] : drawn
      if (action.keep === 'new') player.hand[suit] = drawn
      s.discards[suit].push(out)
      s.pendingDraw = null
      ctx.events.push({ type: 'discarded', playerId: player.id, card: out, keep: action.keep })
      advanceTurn(ctx)
      break
    }
    case 'stand': {
      if (s.phase !== 'turn') fail('not in a turn')
      ctx.events.push({ type: 'stood', playerId: player.id, forced: player.embargoed })
      player.standing = true
      advanceTurn(ctx)
      break
    }
    case 'chooseImpostor': {
      const pending = s.pendingDice
      if (s.phase !== 'impostor' || !pending || !pending.suit) fail('no Impostor roll pending')
      if (!pending.dice.includes(action.value)) fail('value was not rolled')
      player.impostor[pending.suit] = action.value
      ctx.events.push({
        type: 'diceChosen',
        playerId: player.id,
        purpose: 'impostor',
        value: action.value,
        suit: pending.suit,
      })
      s.pendingDice = null
      resolveImpostors(ctx)
      break
    }
    case 'settle':
      if (s.phase !== 'showdown') fail('no showdown to settle')
      settle(ctx)
      break
    case 'nextHand':
      if (s.phase !== 'handEnd') fail('hand is not over')
      startHand(ctx, nextActiveSeat(s, s.dealer))
      break
    case 'caught': {
      if (s.phase !== 'turn') fail('not in a turn')
      // Never the last chip: being thrown out is for the cards to decide.
      const fine = Math.min(action.fine, Math.max(0, player.chips - 1))
      if (fine > 0) {
        player.chips -= fine
        ctx.events.push({ type: 'chips', playerId: player.id, delta: -fine, pile: 'stock', reason: 'fine' })
      }
      break
    }
  }

  s.rng = ctx.rng.state
  return { state: s, events: ctx.events }
}

// ── Hand flow ────────────────────────────────────────────────────────────────

function startHand(ctx: Ctx, dealer: number): void {
  const { s, rng, events } = ctx
  s.handNumber += 1
  s.dealer = dealer
  s.round = 1
  s.current = dealer
  s.phase = 'turn'
  s.tokenPlayedThisTurn = false
  s.pendingDraw = null
  s.pendingDice = null
  s.modifiers = { ...NO_MODIFIERS }
  s.result = null

  for (const suit of SUITS) {
    s.decks[suit] = buildShuffledSuit(suit, rng, s.rules)
    s.discards[suit] = []
  }
  for (const p of s.players) {
    p.invested = 0
    p.standing = false
    p.immune = false
    p.embargoed = false
    p.freeDraw = false
    p.impostor = {}
    p.hand = p.eliminated ? null : { sand: s.decks.sand.pop()!, blood: s.decks.blood.pop()! }
  }
  for (const suit of SUITS) s.discards[suit].push(s.decks[suit].pop()!)

  events.push({ type: 'handStart', hand: s.handNumber, dealer })
  events.push({ type: 'roundStart', round: 1 })
  events.push({ type: 'turnStart', playerId: dealer })
}

function advanceTurn(ctx: Ctx): void {
  const { s, events } = ctx
  const player = s.players[s.current]
  player.freeDraw = false
  player.embargoed = false
  s.tokenPlayedThisTurn = false

  const next = nextActiveSeat(s, s.current)
  if (next === s.dealer) {
    if (s.round >= s.rules.rounds) {
      resolveImpostors(ctx)
      return
    }
    s.round += 1
    events.push({ type: 'roundStart', round: s.round })
  }
  s.current = next
  s.phase = 'turn'
  events.push({ type: 'turnStart', playerId: next })
}

/** Roll for the next unresolved Impostor, or move on to the showdown. */
function resolveImpostors(ctx: Ctx): void {
  const { s, rng, events } = ctx
  if (!s.modifiers.impostorSix) {
    for (let step = 0; step < s.players.length; step++) {
      const p = s.players[(s.dealer + step) % s.players.length]
      if (p.eliminated || !p.hand) continue
      for (const suit of SUITS) {
        if (p.hand[suit].kind !== 'impostor' || p.impostor[suit] !== undefined) continue
        const dice: [number, number] = [rng.die(), rng.die()]
        s.pendingDice = { playerId: p.id, purpose: 'impostor', suit, dice }
        s.current = p.id
        s.phase = 'impostor'
        events.push({ type: 'diceRolled', playerId: p.id, purpose: 'impostor', dice, suit })
        return
      }
    }
  }
  s.result = computeResult(s)
  s.phase = 'showdown'
  events.push({ type: 'showdown', result: s.result })
}

function settle(ctx: Ctx): void {
  const { s, events } = ctx
  const result = s.result!
  for (const r of result.ranking) {
    const p = s.players[r.playerId]
    if (r.winner) {
      if (p.invested > 0) {
        events.push({ type: 'chips', playerId: p.id, delta: p.invested, pile: 'stock', reason: 'win' })
      }
    } else {
      if (p.invested > 0) {
        events.push({ type: 'chips', playerId: p.id, delta: -p.invested, pile: 'invested', reason: 'lossInvested' })
      }
      if (r.penalty > 0) {
        events.push({ type: 'chips', playerId: p.id, delta: -r.penalty, pile: 'stock', reason: 'penalty' })
      }
    }
    p.chips = r.chipsAfter
    p.invested = 0
    p.standing = false
    p.immune = false
    p.embargoed = false
  }
  events.push({ type: 'settled', result })
  for (const r of result.ranking) {
    if (!r.eliminated) continue
    s.players[r.playerId].eliminated = true
    events.push({ type: 'eliminated', playerId: r.playerId })
  }
  s.modifiers = { ...NO_MODIFIERS }

  const remaining = s.players.filter((p) => !p.eliminated)
  if (remaining.length <= 1) {
    s.winner = remaining[0].id
    s.phase = 'gameOver'
    events.push({ type: 'gameOver', winner: s.winner })
  } else {
    s.phase = 'handEnd'
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function takeFromDeck(ctx: Ctx, suit: Suit): Card {
  const { s, rng, events } = ctx
  if (s.decks[suit].length === 0) {
    const pile = s.discards[suit]
    const top = pile.pop()!
    s.decks[suit] = rng.shuffle(pile.splice(0))
    pile.push(top)
    events.push({ type: 'reshuffled', suit })
  }
  return s.decks[suit].pop()!
}

function draw(ctx: Ctx, player: Player, source: DrawSource): void {
  const { s, events } = ctx
  if (s.phase !== 'turn') fail('not in a turn')
  if (!canDraw(s, player)) fail('player may not draw')
  if (!canDrawFrom(s, source)) fail('pile is empty')

  const cost = drawCost(player)
  if (cost > 0) moveToInvested(ctx, player, cost, 'draw')
  const suit = sourceSuit(source)
  const card = sourceIsDeck(source) ? takeFromDeck(ctx, suit) : s.discards[suit].pop()!
  s.pendingDraw = { card, source }
  s.phase = 'discard'
  player.standing = false
  events.push({ type: 'drew', playerId: player.id, source, free: cost === 0 })
}

// ── Chips ────────────────────────────────────────────────────────────────────

/** Move up to `amount` chips from a player's stock into their invested pile. */
function moveToInvested(ctx: Ctx, player: Player, amount: number, reason: ChipReason): number {
  const moved = Math.min(amount, player.chips)
  if (moved <= 0) return 0
  player.chips -= moved
  player.invested += moved
  ctx.events.push({ type: 'chips', playerId: player.id, delta: -moved, pile: 'stock', reason })
  return moved
}

function refund(ctx: Ctx, player: Player, amount: number): void {
  const moved = Math.min(amount, player.invested)
  if (moved <= 0) return
  player.invested -= moved
  player.chips += moved
  ctx.events.push({ type: 'chips', playerId: player.id, delta: moved, pile: 'stock', reason: 'refund' })
}

// ── Shift tokens ─────────────────────────────────────────────────────────────

function playToken(ctx: Ctx, player: Player, token: TokenId, target?: number): void {
  const { s, rng, events } = ctx
  if (!canPlayToken(s, player.id, token)) fail(`cannot play ${token}`)
  const needsTarget = TOKENS[token].target !== 'none'
  if (needsTarget && (target === undefined || !tokenTargets(s, player.id, token).includes(target))) {
    fail(`invalid target for ${token}`)
  }

  player.tokens.splice(player.tokens.indexOf(token), 1)
  s.tokenPlayedThisTurn = true
  events.push({ type: 'tokenPlayed', playerId: player.id, token, target: needsTarget ? target : undefined })

  const others = opponentsOf(s, player.id)
  /** Run an effect on every opponent, announcing the ones shielded by Immunity. */
  const hitOthers = (effect: (p: Player) => void) => {
    for (const p of others) {
      if (p.immune) events.push({ type: 'tokenBlocked', playerId: p.id, token })
      else effect(p)
    }
  }
  const victim = needsTarget ? s.players[target!] : null

  switch (token) {
    case 'freeDraw':
      player.freeDraw = true
      break
    case 'refund':
      refund(ctx, player, REFUND_AMOUNT)
      break
    case 'extraRefund':
      refund(ctx, player, EXTRA_REFUND_AMOUNT)
      break
    case 'generalTariff':
      hitOthers((p) => moveToInvested(ctx, p, GENERAL_TARIFF_AMOUNT, 'tariff'))
      break
    case 'targetTariff':
      moveToInvested(ctx, victim!, TARGET_TARIFF_AMOUNT, 'tariff')
      break
    case 'embargo': {
      const next = s.players[nextActiveSeat(s, player.id)]
      if (next.immune) events.push({ type: 'tokenBlocked', playerId: next.id, token })
      else next.embargoed = true
      break
    }
    case 'markdown':
      s.modifiers.sylopZero = true
      break
    case 'immunity':
      player.immune = true
      break
    case 'generalAudit':
      hitOthers((p) => {
        if (p.standing) moveToInvested(ctx, p, GENERAL_AUDIT_AMOUNT, 'audit')
      })
      break
    case 'targetAudit':
      moveToInvested(ctx, victim!, TARGET_AUDIT_AMOUNT, 'audit')
      break
    case 'majorFraud':
      s.modifiers.impostorSix = true
      break
    case 'embezzlement':
      hitOthers((p) => {
        if (p.chips <= 0) return
        p.chips -= 1
        player.chips += 1
        events.push({ type: 'chips', playerId: p.id, delta: -1, pile: 'stock', reason: 'embezzle' })
        events.push({ type: 'chips', playerId: player.id, delta: 1, pile: 'stock', reason: 'embezzle' })
      })
      break
    case 'cookTheBooks':
      s.modifiers.cookTheBooks = true
      break
    case 'exhaustion': {
      const v = victim!
      for (const suit of SUITS) {
        s.discards[suit].push(v.hand![suit])
        v.hand![suit] = takeFromDeck(ctx, suit)
      }
      v.impostor = {}
      events.push({ type: 'handRedrawn', playerId: v.id })
      break
    }
    case 'directTransaction': {
      const v = victim!
      ;[player.hand, v.hand] = [v.hand, player.hand]
      events.push({ type: 'handsSwapped', a: player.id, b: v.id })
      break
    }
    case 'primeSabacc': {
      const dice: [number, number] = [rng.die(), rng.die()]
      s.pendingDice = { playerId: player.id, purpose: 'prime', dice }
      s.phase = 'primeChoice'
      events.push({ type: 'diceRolled', playerId: player.id, purpose: 'prime', dice })
      break
    }
  }
}
