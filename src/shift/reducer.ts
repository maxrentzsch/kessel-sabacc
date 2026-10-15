import { Rng } from '../engine/rng'
import { buildSpikeDeck, SPIKE_SUITS } from '../spike/deck'
import { inShiftHand, shiftActive, shiftBetSize, shiftCanRaise, shiftOwed, shiftSeatsAfter } from './legal'
import { compareShift, scoreSelection } from './scoring'
import { TARGET_FACES } from './types'
import type { ShiftAction, ShiftCard, ShiftConfig, ShiftEvent, ShiftPlacing, ShiftPlayer, ShiftRules, ShiftState } from './types'

export interface ShiftStep {
  state: ShiftState
  events: ShiftEvent[]
}

export class IllegalShiftAction extends Error {}

/** What the printed rules leave open, as this table plays it (see ROADMAP, phase 5). */
export const SHIFT_RULES: ShiftRules = { ante: 1, bets: [1, 2], maxRaises: 2, anteEvery: 4 }

/** Cards dealt to every player, and what the hand is filled up to in the shift. */
export const HAND_SIZE = 5

interface Ctx {
  s: ShiftState
  rng: Rng
  events: ShiftEvent[]
}

function fail(message: string): never {
  throw new IllegalShiftAction(message)
}

/** Top card of the deck; the discard pile is shuffled back in when the deck runs out. */
function drawCard(ctx: Ctx): ShiftCard {
  const { s } = ctx
  if (s.deck.length === 0) {
    s.deck = ctx.rng.shuffle(s.discard)
    s.discard = []
    ctx.events.push({ type: 'reshuffled' })
  }
  const card = s.deck.pop()
  if (!card) fail('no cards left')
  return card
}

function pay(ctx: Ctx, p: ShiftPlayer, amount: number, reason: 'ante' | 'bet'): number {
  const paid = Math.min(amount, p.chips)
  p.chips -= paid
  ctx.s.pot += paid
  if (paid > 0) ctx.events.push({ type: 'chips', playerId: p.id, delta: -paid, reason })
  return paid
}

/** The ante of a hand: it rises as the game goes on, so that a game ends. */
export function shiftAnteOf(state: ShiftState, hand: number): number {
  const { ante, anteEvery } = state.rules
  return anteEvery > 0 ? ante * (1 + Math.floor((hand - 1) / anteEvery)) : ante
}

function startHand(ctx: Ctx): void {
  const { s, rng } = ctx
  s.handNumber++
  const all = [...s.deck, ...s.discard, ...s.players.flatMap((p) => [...p.hand, ...p.selection])]
  s.deck = rng.shuffle(s.handNumber === 1 ? buildSpikeDeck() : all)
  s.discard = []
  s.result = null
  s.round = 1
  // the dealer rolls: the gold die for the number, the silver one for the suit
  s.target = { value: TARGET_FACES[rng.int(TARGET_FACES.length)], suit: SPIKE_SUITS[rng.int(SPIKE_SUITS.length)] }
  const ante = shiftAnteOf(s, s.handNumber)
  ctx.events.push({ type: 'handStart', hand: s.handNumber, dealer: s.dealer, ante, target: s.target })
  for (const p of s.players) {
    p.hand = []
    p.selection = []
    p.fresh = []
    p.folded = false
    p.bet = 0
    if (!p.eliminated) pay(ctx, p, ante, 'ante')
  }
  for (let i = 0; i < HAND_SIZE; i++) for (const id of shiftSeatsAfter(s, s.dealer)) s.players[id].hand.push(drawCard(ctx))
  startPhase(ctx, 'select')
}

function startPhase(ctx: Ctx, phase: 'select' | 'bet' | 'improve'): void {
  const { s } = ctx
  s.phase = phase
  s.toCall = 0
  s.raises = 0
  for (const p of s.players) p.bet = 0
  // Nobody can bet who has no chips left.
  s.pending = shiftSeatsAfter(s, s.dealer).filter((id) => phase !== 'bet' || s.players[id].chips > 0)
  ctx.events.push({ type: 'phaseStart', phase, round: s.round })
  if (phase === 'bet' && s.pending.length < 2) return endPhase(ctx)
  nextTurn(ctx)
}

function nextTurn(ctx: Ctx): void {
  const { s } = ctx
  if (shiftActive(s).length === 1) return showdown(ctx)
  if (s.pending.length === 0) return endPhase(ctx)
  s.current = s.pending[0]
  ctx.events.push({ type: 'turnStart', playerId: s.current })
}

function endPhase(ctx: Ctx): void {
  const { s } = ctx
  if (s.phase === 'select' || s.phase === 'improve') return startPhase(ctx, 'bet')
  for (const p of s.players) p.bet = 0
  s.toCall = 0
  if (s.round === 2) return showdown(ctx)
  shift(ctx)
}

/** The sabacc shift: whatever was not set aside goes, and the hand is filled up to five again. */
function shift(ctx: Ctx): void {
  const { s } = ctx
  s.round = 2
  for (const id of shiftSeatsAfter(s, s.dealer)) {
    const p = s.players[id]
    const count = p.hand.length
    s.discard.push(...p.hand.splice(0))
    for (let i = 0; i < HAND_SIZE - p.selection.length; i++) p.hand.push(drawCard(ctx))
    p.fresh = p.hand.map((c) => c.id)
    ctx.events.push({ type: 'shifted', playerId: p.id, count })
  }
  startPhase(ctx, 'improve')
}

function done(ctx: Ctx, p: ShiftPlayer): void {
  ctx.s.pending = ctx.s.pending.filter((id) => id !== p.id)
  nextTurn(ctx)
}

function fold(ctx: Ctx, p: ShiftPlayer): void {
  p.folded = true
  ctx.s.discard.push(...p.hand.splice(0), ...p.selection.splice(0))
  p.fresh = []
  ctx.events.push({ type: 'folded', playerId: p.id })
  done(ctx, p)
}

/** Move the named cards from the hand to the selection; every one must be in hand, and allowed. */
function setAside(p: ShiftPlayer, ids: string[], allowed: (id: string) => boolean): void {
  if (new Set(ids).size !== ids.length) fail('a card is named twice')
  for (const id of ids) {
    const i = p.hand.findIndex((c) => c.id === id)
    if (i < 0 || !allowed(id)) fail('card cannot be set aside')
    p.selection.push(p.hand.splice(i, 1)[0])
  }
}

function betPhase(ctx: Ctx, p: ShiftPlayer, action: ShiftAction): void {
  const { s } = ctx
  const due = shiftOwed(s, p)
  const put = (amount: number) => {
    const paid = pay(ctx, p, amount, 'bet')
    p.bet += paid
    return paid
  }
  // After a bet or a raise everybody else gets to answer it.
  const reopen = () => {
    s.pending = [p.id, ...shiftSeatsAfter(s, p.id).filter((id) => id !== p.id && s.players[id].chips > 0)]
  }
  switch (action.type) {
    case 'check':
      if (due > 0) fail('there is a bet to answer')
      ctx.events.push({ type: 'checked', playerId: p.id })
      return done(ctx, p)
    case 'bet':
    case 'raise': {
      if (action.type === 'bet' ? s.toCall > 0 : s.toCall === 0) fail(`cannot ${action.type} now`)
      if (action.type === 'raise' && !shiftCanRaise(s, p)) fail('no more raises')
      if (p.chips === 0) fail('no chips to bet')
      const amount = put(due + shiftBetSize(s))
      s.toCall = Math.max(s.toCall, p.bet)
      if (action.type === 'raise') s.raises++
      ctx.events.push({ type: 'bet', playerId: p.id, amount, raise: action.type === 'raise' })
      reopen()
      return done(ctx, p)
    }
    case 'call':
      if (due === 0) fail('nothing to call')
      ctx.events.push({ type: 'called', playerId: p.id, amount: put(due) })
      return done(ctx, p)
    case 'fold':
      return fold(ctx, p)
    default:
      fail(`cannot ${action.type} in the betting phase`)
  }
}

/** Order the selections against the dice: nearest to the target, then most cards of its suit; a dead heat splits the pot. */
function showdown(ctx: Ctx): void {
  const { s } = ctx
  const live = shiftActive(s)
  const placing: ShiftPlacing[] = live
    .map((p) => ({ playerId: p.id, score: scoreSelection(p.selection, s.target), winner: false }))
    .sort((a, b) => compareShift(a.score, b.score))
  for (const x of placing) x.winner = compareShift(x.score, placing[0].score) === 0
  s.result = { placing, winners: placing.filter((x) => x.winner).map((x) => x.playerId), pot: s.pot, uncontested: live.length === 1 }
  s.phase = 'showdown'
  s.pending = []
  ctx.events.push({ type: 'showdown', result: s.result })
}

function settle(ctx: Ctx): void {
  const { s } = ctx
  const result = s.result
  if (!result) fail('nothing to settle')
  // Chips that do not divide go to the winners closest after the dealer.
  const order = shiftSeatsAfter(s, s.dealer).filter((id) => result.winners.includes(id))
  order.forEach((id, i) => {
    const amount = Math.floor(s.pot / order.length) + (i < s.pot % order.length ? 1 : 0)
    s.players[id].chips += amount
    if (amount > 0) ctx.events.push({ type: 'chips', playerId: id, delta: amount, reason: 'pot' })
  })
  s.pot = 0
  ctx.events.push({ type: 'settled', result })
  for (const p of s.players) {
    if (!p.eliminated && p.chips === 0) {
      p.eliminated = true
      ctx.events.push({ type: 'eliminated', playerId: p.id })
    }
  }
  const left = s.players.filter((p) => !p.eliminated)
  if (left.length === 1) {
    s.winner = left[0].id
    s.phase = 'gameOver'
    ctx.events.push({ type: 'gameOver', winner: left[0].id })
  } else {
    s.phase = 'handEnd'
  }
}

export function createShiftGame(config: ShiftConfig): ShiftStep {
  const rng = new Rng(config.seed)
  const players: ShiftPlayer[] = config.players.map((setup, id) => ({
    id,
    name: setup.name,
    isHuman: setup.isHuman,
    chips: setup.chips ?? config.startingChips,
    hand: [],
    selection: [],
    fresh: [],
    folded: false,
    eliminated: false,
    bet: 0,
  }))
  const s: ShiftState = {
    rules: { ...SHIFT_RULES, ...config.rules },
    players,
    deck: [],
    discard: [],
    pot: 0,
    target: { value: 0, suit: 'circle' },
    dealer: rng.int(players.length),
    current: 0,
    round: 1,
    phase: 'select',
    toCall: 0,
    raises: 0,
    pending: [],
    result: null,
    handNumber: 0,
    winner: null,
    rng: 0,
  }
  const ctx: Ctx = { s, rng, events: [] }
  startHand(ctx)
  s.rng = rng.state
  return { state: s, events: ctx.events }
}

export function applyShiftAction(state: ShiftState, action: ShiftAction): ShiftStep {
  const s = structuredClone(state)
  const ctx: Ctx = { s, rng: new Rng(s.rng), events: [] }
  const p = s.players[s.current]
  switch (s.phase) {
    case 'select':
      if (!inShiftHand(p)) fail('not in the hand')
      if (action.type === 'fold') fold(ctx, p)
      else if (action.type !== 'select') fail('cards have to be set aside')
      else {
        if (action.cards.length === 0) fail('set at least one card aside')
        setAside(p, action.cards, () => true)
        ctx.events.push({ type: 'selected', playerId: p.id, count: p.selection.length })
        done(ctx, p)
      }
      break
    case 'improve':
      if (!inShiftHand(p)) fail('not in the hand')
      if (action.type === 'fold') fold(ctx, p)
      else if (action.type !== 'improve') fail('the selection may be improved')
      else {
        setAside(p, action.cards, (id) => p.fresh.includes(id))
        // what is not added is thrown away
        s.discard.push(...p.hand.splice(0))
        p.fresh = []
        ctx.events.push({ type: 'improved', playerId: p.id, count: action.cards.length })
        done(ctx, p)
      }
      break
    case 'bet':
      if (!inShiftHand(p)) fail('not in the hand')
      betPhase(ctx, p, action)
      break
    case 'showdown':
      if (action.type !== 'settle') fail('the hand has to be settled')
      settle(ctx)
      break
    case 'handEnd': {
      if (action.type !== 'nextHand') fail('waiting for the next hand')
      const alive = s.players.filter((x) => !x.eliminated).map((x) => x.id)
      const n = s.players.length
      s.dealer = Array.from({ length: n }, (_, i) => (s.dealer + 1 + i) % n).find((id) => alive.includes(id))!
      startHand(ctx)
      break
    }
    default:
      fail('the game is over')
  }
  s.rng = ctx.rng.state
  return { state: s, events: ctx.events }
}
