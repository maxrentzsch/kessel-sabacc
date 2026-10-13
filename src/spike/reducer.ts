import { Rng } from '../engine/rng'
import { shuffledSpikeDeck, SPIKE_RULES } from './deck'
import { activePlayers, betSize, canRaise, inHand, owed, seatsAfter } from './legal'
import { compareSpike, isSabacc, scoreSpikeHand } from './scoring'
import type { SpikeAction, SpikeCard, SpikeConfig, SpikeEvent, SpikePlacing, SpikePlayer, SpikeState } from './types'

export interface SpikeStep {
  state: SpikeState
  events: SpikeEvent[]
}

export class IllegalSpikeAction extends Error {}

interface Ctx {
  s: SpikeState
  rng: Rng
  events: SpikeEvent[]
}

function fail(message: string): never {
  throw new IllegalSpikeAction(message)
}

/** Top card of the deck; the discard pile is shuffled back in when the deck runs out. */
function drawCard(ctx: Ctx): SpikeCard {
  const { s } = ctx
  if (s.deck.length === 0) {
    const top = s.discard.pop()
    s.deck = ctx.rng.shuffle(s.discard)
    s.discard = top ? [top] : []
    ctx.events.push({ type: 'reshuffled' })
  }
  const card = s.deck.pop()
  if (!card) fail('no cards left')
  return card
}

function pay(ctx: Ctx, p: SpikePlayer, amount: number, reason: 'ante' | 'bet'): number {
  const paid = Math.min(amount, p.chips)
  p.chips -= paid
  if (paid > 0) ctx.events.push({ type: 'chips', playerId: p.id, delta: -paid, reason })
  return paid
}

/** The ante of a hand: it may rise as the game goes on, so that a game ends. */
export function anteOf(state: SpikeState, hand: number): number {
  const { ante, anteEvery } = state.rules
  return anteEvery > 0 ? ante * (1 + Math.floor((hand - 1) / anteEvery)) : ante
}

function startHand(ctx: Ctx): void {
  const { s } = ctx
  s.handNumber++
  const all = [...s.deck, ...s.discard, ...s.players.flatMap((p) => p.hand)]
  s.deck = s.handNumber === 1 ? shuffledSpikeDeck(ctx.rng) : ctx.rng.shuffle(all)
  s.discard = []
  s.dice = null
  s.result = null
  s.round = 1
  const ante = anteOf(s, s.handNumber)
  ctx.events.push({ type: 'handStart', hand: s.handNumber, dealer: s.dealer, ante })
  for (const p of s.players) {
    p.hand = []
    p.folded = false
    p.bet = 0
    if (p.eliminated) continue
    // Whoever is short antes what they have, the hand pot first.
    s.handPot += pay(ctx, p, ante, 'ante')
    s.sabaccPot += pay(ctx, p, ante, 'ante')
  }
  for (let i = 0; i < 2; i++) for (const id of seatsAfter(s, s.dealer)) s.players[id].hand.push(drawCard(ctx))
  s.discard.push(drawCard(ctx))
  startPhase(ctx, 'card')
}

function startPhase(ctx: Ctx, phase: 'card' | 'bet'): void {
  const { s } = ctx
  if (phase === 'card') ctx.events.push({ type: 'roundStart', round: s.round })
  s.phase = phase
  s.toCall = 0
  s.raises = 0
  for (const p of s.players) p.bet = 0
  // Nobody can bet against a player who has no chips left, and they cannot bet either.
  s.pending = seatsAfter(s, s.dealer).filter((id) => phase === 'card' || s.players[id].chips > 0)
  ctx.events.push({ type: 'phaseStart', phase })
  if (phase === 'bet' && s.pending.length < 2) return endPhase(ctx)
  nextTurn(ctx)
}

function nextTurn(ctx: Ctx): void {
  const { s } = ctx
  if (activePlayers(s).length === 1) return showdown(ctx)
  if (s.pending.length === 0) return endPhase(ctx)
  s.current = s.pending[0]
  ctx.events.push({ type: 'turnStart', playerId: s.current })
}

function endPhase(ctx: Ctx): void {
  const { s } = ctx
  if (s.phase === 'card') return startPhase(ctx, 'bet')
  // The bets are in the pot now.
  for (const p of s.players) p.bet = 0
  s.toCall = 0
  s.phase = 'dice'
  s.current = s.dealer
  ctx.events.push({ type: 'phaseStart', phase: 'dice' })
}

function done(ctx: Ctx, p: SpikePlayer): void {
  ctx.s.pending = ctx.s.pending.filter((id) => id !== p.id)
  nextTurn(ctx)
}

function junk(ctx: Ctx, p: SpikePlayer): void {
  p.folded = true
  ctx.s.discard.push(...p.hand)
  p.hand = []
  ctx.events.push({ type: 'junked', playerId: p.id })
  done(ctx, p)
}

function cardPhase(ctx: Ctx, p: SpikePlayer, action: SpikeAction): void {
  const { s } = ctx
  const take = (id: string): SpikeCard => {
    const i = p.hand.findIndex((c) => c.id === id)
    if (i < 0) fail('card is not in hand')
    return p.hand.splice(i, 1)[0]
  }
  switch (action.type) {
    case 'gain': {
      if (action.discard === undefined && p.hand.length >= s.rules.handLimit) fail('hand is full')
      const out = action.discard === undefined ? null : take(action.discard)
      if (out) s.discard.push(out)
      p.hand.push(drawCard(ctx))
      ctx.events.push({ type: 'gained', playerId: p.id, discarded: out })
      return done(ctx, p)
    }
    case 'swap': {
      const took = s.discard.pop()
      if (!took) fail('nothing to swap for')
      const gave = take(action.give)
      p.hand.push(took)
      s.discard.push(gave)
      ctx.events.push({ type: 'swapped', playerId: p.id, gave, took })
      return done(ctx, p)
    }
    case 'stand':
      ctx.events.push({ type: 'stood', playerId: p.id })
      return done(ctx, p)
    case 'junk':
      return junk(ctx, p)
    default:
      fail(`cannot ${action.type} in the card phase`)
  }
}

function betPhase(ctx: Ctx, p: SpikePlayer, action: SpikeAction): void {
  const { s } = ctx
  const due = owed(s, p)
  const put = (amount: number) => {
    const paid = pay(ctx, p, amount, 'bet')
    p.bet += paid
    s.handPot += paid
    return paid
  }
  // After a bet or a raise everybody else gets to answer it.
  const reopen = () => {
    s.pending = [p.id, ...seatsAfter(s, p.id).filter((id) => id !== p.id && s.players[id].chips > 0)]
  }
  switch (action.type) {
    case 'check':
      if (due > 0) fail('there is a bet to answer')
      ctx.events.push({ type: 'checked', playerId: p.id })
      return done(ctx, p)
    case 'bet':
    case 'raise': {
      if (action.type === 'bet' ? s.toCall > 0 : s.toCall === 0) fail(`cannot ${action.type} now`)
      if (action.type === 'raise' && !canRaise(s, p)) fail('no more raises')
      if (p.chips === 0) fail('no chips to bet')
      const amount = put(due + betSize(s))
      s.toCall = Math.max(s.toCall, p.bet)
      if (action.type === 'raise') s.raises++
      ctx.events.push({ type: 'bet', playerId: p.id, amount, raise: action.type === 'raise' })
      reopen()
      return done(ctx, p)
    }
    case 'call': {
      if (due === 0) fail('nothing to call')
      ctx.events.push({ type: 'called', playerId: p.id, amount: put(due) })
      return done(ctx, p)
    }
    case 'junk':
      return junk(ctx, p)
    default:
      fail(`cannot ${action.type} in the betting phase`)
  }
}

function roll(ctx: Ctx): void {
  const { s } = ctx
  const dice: [number, number] = [ctx.rng.die(), ctx.rng.die()]
  const shift = dice[0] === dice[1]
  s.dice = dice
  ctx.events.push({ type: 'diceRolled', dice, shift })
  if (shift) {
    // The sabacc shift: every hand goes, and comes back as many new cards.
    const sizes = activePlayers(s).map((p) => [p, p.hand.length] as const)
    for (const [p] of sizes) s.discard.push(...p.hand.splice(0))
    for (const [p, size] of sizes) for (let i = 0; i < size; i++) p.hand.push(drawCard(ctx))
  }
  if (s.round >= 3) return showdown(ctx)
  s.round++
  startPhase(ctx, 'card')
}

/** Order the hands and find out who takes the pots; dead heats are broken by drawing blind. */
function showdown(ctx: Ctx): void {
  const { s } = ctx
  const live = activePlayers(s)
  const placing: SpikePlacing[] = live
    .map((p) => ({ playerId: p.id, score: scoreSpikeHand(p.hand), winner: false, drawn: [] as SpikeCard[] }))
    .sort((a, b) => compareSpike(a.score, b.score))
  const uncontested = live.length === 1
  let tied = placing.filter((x) => compareSpike(x.score, placing[0].score) === 0)
  // Single blind draw: closest to zero wins, a positive card beats a negative one.
  for (let round = 0; tied.length > 1 && round < 5 && s.deck.length + s.discard.length > tied.length; round++) {
    for (const x of tied) x.drawn.push(drawCard(ctx))
    const rank = (x: SpikePlacing) => {
      const v = x.drawn[x.drawn.length - 1].value
      return Math.abs(v) * 2 + (v < 0 ? 1 : 0)
    }
    const best = Math.min(...tied.map(rank))
    tied = tied.filter((x) => rank(x) === best)
  }
  for (const x of tied) x.winner = true
  const sabacc = !uncontested && isSabacc(placing[0].score)
  s.result = { placing, winners: tied.map((x) => x.playerId), handPot: s.handPot, sabaccPot: sabacc ? s.sabaccPot : 0, uncontested }
  s.phase = 'showdown'
  s.pending = []
  ctx.events.push({ type: 'showdown', result: s.result })
}

function settle(ctx: Ctx): void {
  const { s } = ctx
  const result = s.result
  if (!result) fail('nothing to settle')
  const share = (pot: number, reason: 'pot' | 'sabaccPot') => {
    // Chips that do not divide go to the winners closest after the dealer.
    const order = seatsAfter(s, s.dealer).filter((id) => result.winners.includes(id))
    order.forEach((id, i) => {
      const amount = Math.floor(pot / order.length) + (i < pot % order.length ? 1 : 0)
      s.players[id].chips += amount
      if (amount > 0) ctx.events.push({ type: 'chips', playerId: id, delta: amount, reason })
    })
  }
  share(result.handPot, 'pot')
  s.handPot = 0
  if (result.sabaccPot > 0) {
    share(result.sabaccPot, 'sabaccPot')
    s.sabaccPot = 0
  }
  // Cards drawn to break a tie go back with the rest.
  for (const x of result.placing) s.discard.push(...x.drawn)
  ctx.events.push({ type: 'settled', result })
  for (const p of s.players) {
    if (!p.eliminated && p.chips === 0) {
      p.eliminated = true
      s.discard.push(...p.hand.splice(0))
      ctx.events.push({ type: 'eliminated', playerId: p.id })
    }
  }
  const left = s.players.filter((p) => !p.eliminated)
  if (left.length === 1) {
    // What is still in the sabacc pot goes home with the last one standing.
    left[0].chips += s.sabaccPot
    s.sabaccPot = 0
    s.winner = left[0].id
    s.phase = 'gameOver'
    ctx.events.push({ type: 'gameOver', winner: left[0].id })
  } else {
    s.phase = 'handEnd'
  }
}

export function createSpikeGame(config: SpikeConfig): SpikeStep {
  const rng = new Rng(config.seed)
  const players: SpikePlayer[] = config.players.map((setup, id) => ({
    id,
    name: setup.name,
    isHuman: setup.isHuman,
    chips: config.startingChips,
    hand: [],
    folded: false,
    eliminated: false,
    bet: 0,
  }))
  const s: SpikeState = {
    rules: { ...SPIKE_RULES, ...config.rules },
    players,
    deck: [],
    discard: [],
    handPot: 0,
    sabaccPot: 0,
    dealer: rng.int(players.length),
    current: 0,
    round: 1,
    phase: 'card',
    toCall: 0,
    raises: 0,
    pending: [],
    dice: null,
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

export function applySpikeAction(state: SpikeState, action: SpikeAction): SpikeStep {
  const s = structuredClone(state)
  const ctx: Ctx = { s, rng: new Rng(s.rng), events: [] }
  const p = s.players[s.current]
  switch (s.phase) {
    case 'card':
      if (!inHand(p)) fail('not in the hand')
      cardPhase(ctx, p, action)
      break
    case 'bet':
      if (!inHand(p)) fail('not in the hand')
      betPhase(ctx, p, action)
      break
    case 'dice':
      if (action.type !== 'roll') fail('the dice have to be rolled')
      roll(ctx)
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
