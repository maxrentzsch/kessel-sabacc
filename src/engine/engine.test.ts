import { describe, expect, it } from 'vitest'
import {
  applyAction,
  buildSuit,
  canPlayToken,
  createGame,
  IllegalActionError,
  legalActions,
  NO_MODIFIERS,
  scoreHand,
  tokenTargets,
} from './index'
import type { Action, Card, GameEvent, GameState, Hand, Modifiers, Suit, TokenId } from './index'

type Spec = number | 'imp' | 'syl'

function card(suit: Suit, spec: Spec): Card {
  if (spec === 'imp') return { id: `t-${suit}-imp`, suit, kind: 'impostor', value: 0 }
  if (spec === 'syl') return { id: `t-${suit}-syl`, suit, kind: 'sylop', value: 0 }
  return { id: `t-${suit}-${spec}`, suit, kind: 'number', value: spec }
}

function hand(sand: Spec, blood: Spec): Hand {
  return { sand: card('sand', sand), blood: card('blood', blood) }
}

function game(playerCount = 2, tokens: TokenId[] = [], chips = 6, seed = 7): GameState {
  const { state } = createGame({
    seed,
    startingChips: chips,
    players: Array.from({ length: playerCount }, (_, i) => ({
      name: `P${i}`,
      isHuman: i === 0,
      tokens: [...tokens],
    })),
  })
  // Tests are easier to read when seat 0 always opens.
  state.dealer = 0
  state.current = 0
  return state
}

function run(state: GameState, ...actions: Action[]): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  for (const action of actions) {
    const step = applyAction(state, action)
    state = step.state
    events.push(...step.events)
  }
  return { state, events }
}

/** Everybody stands until the hand reaches the showdown. */
function standToShowdown(state: GameState): GameState {
  while (state.phase === 'turn') state = applyAction(state, { type: 'stand' }).state
  return state
}

const mods = (patch: Partial<Modifiers> = {}): Modifiers => ({ ...NO_MODIFIERS, ...patch })

describe('deck', () => {
  it('has 22 cards per suit: 3× each number, 3 Impostors, 1 Sylop', () => {
    const suit = buildSuit('sand')
    expect(suit).toHaveLength(22)
    for (let v = 1; v <= 6; v++) expect(suit.filter((c) => c.value === v)).toHaveLength(3)
    expect(suit.filter((c) => c.kind === 'impostor')).toHaveLength(3)
    expect(suit.filter((c) => c.kind === 'sylop')).toHaveLength(1)
    expect(new Set(suit.map((c) => c.id)).size).toBe(22)
  })

  it('deals one card of each suit to every player and opens both discard piles', () => {
    const s = game(4)
    for (const p of s.players) {
      expect(p.hand!.sand.suit).toBe('sand')
      expect(p.hand!.blood.suit).toBe('blood')
    }
    expect(s.discards.sand).toHaveLength(1)
    expect(s.discards.blood).toHaveLength(1)
    expect(s.decks.sand).toHaveLength(22 - 4 - 1)
    expect(s.decks.blood).toHaveLength(22 - 4 - 1)
  })
})

describe('scoring', () => {
  it('ranks Pure Sabacc › Sabacc low to high › smallest difference › smallest sum', () => {
    const order = [
      scoreHand(hand('syl', 'syl'), mods()),
      scoreHand(hand(1, 1), mods()),
      scoreHand(hand(3, 3), mods()),
      scoreHand(hand(6, 6), mods()),
      scoreHand(hand(1, 2), mods()),
      scoreHand(hand(5, 6), mods()),
      scoreHand(hand(1, 3), mods()),
      scoreHand(hand(1, 6), mods()),
    ].map((s) => s.power)
    expect(order).toEqual([...order].sort((a, b) => b - a))
    expect(new Set(order).size).toBe(order.length)
  })

  it('lets a Sylop copy the other card', () => {
    const s = scoreHand(hand('syl', 4), mods())
    expect(s.category).toBe('sabacc')
    expect(s.sandValue).toBe(4)
    expect(s.power).toBe(scoreHand(hand(4, 4), mods()).power)
  })

  it('resolves an Impostor from the chosen die, and a Sylop next to it', () => {
    expect(scoreHand(hand('imp', 5), mods(), { sand: 5 }).category).toBe('sabacc')
    expect(scoreHand(hand('imp', 5), mods(), { sand: 2 }).diff).toBe(3)
    expect(scoreHand(hand('imp', 'syl'), mods(), { sand: 3 }).category).toBe('sabacc')
    expect(() => scoreHand(hand('imp', 5), mods())).toThrow()
  })

  it('Markdown makes a Sylop worth 0 but keeps Pure Sabacc', () => {
    const s = scoreHand(hand('syl', 4), mods({ sylopZero: true }))
    expect(s.category).toBe('none')
    expect(s.diff).toBe(4)
    expect(scoreHand(hand('syl', 'syl'), mods({ sylopZero: true })).category).toBe('pure')
  })

  it('Major Fraud fixes Impostors at 6', () => {
    expect(scoreHand(hand('imp', 6), mods({ impostorSix: true })).category).toBe('sabacc')
    expect(scoreHand(hand('imp', 2), mods({ impostorSix: true }), { sand: 2 }).diff).toBe(4)
  })

  it('Cook the Books inverts Sabacc ranks only', () => {
    const m = mods({ cookTheBooks: true })
    expect(scoreHand(hand(6, 6), m).power).toBeGreaterThan(scoreHand(hand(1, 1), m).power)
    expect(scoreHand(hand('syl', 'syl'), m).power).toBeGreaterThan(scoreHand(hand(6, 6), m).power)
    expect(scoreHand(hand(1, 2), m).power).toBeGreaterThan(scoreHand(hand(5, 6), m).power)
  })

  it('Prime Sabacc beats every other Sabacc, even with Cook the Books, but not Pure Sabacc', () => {
    const m = mods({ primeValue: 4, cookTheBooks: true })
    const prime = scoreHand(hand(4, 4), m)
    expect(prime.category).toBe('prime')
    expect(prime.power).toBeGreaterThan(scoreHand(hand(6, 6), m).power)
    expect(prime.power).toBeGreaterThan(scoreHand(hand(1, 1), mods({ primeValue: 4 })).power)
    expect(scoreHand(hand('syl', 'syl'), m).power).toBeGreaterThan(prime.power)
  })
})

describe('turns', () => {
  it('drawing costs one chip and keeps the chosen card', () => {
    let s = game(2)
    const oldSand = s.players[0].hand!.sand
    const top = s.decks.sand.at(-1)!
    s = applyAction(s, { type: 'draw', source: 'sandDeck' }).state
    expect(s.phase).toBe('discard')
    expect(s.players[0].chips).toBe(5)
    expect(s.players[0].invested).toBe(1)
    expect(s.pendingDraw!.card).toEqual(top)

    const kept = applyAction(s, { type: 'discard', keep: 'new' }).state
    expect(kept.players[0].hand!.sand).toEqual(top)
    expect(kept.discards.sand.at(-1)).toEqual(oldSand)
    expect(kept.current).toBe(1)

    const refused = applyAction(s, { type: 'discard', keep: 'old' }).state
    expect(refused.players[0].hand!.sand).toEqual(oldSand)
    expect(refused.discards.sand.at(-1)).toEqual(top)
  })

  it('can take the top card of a discard pile', () => {
    let s = game(2)
    const top = s.discards.blood.at(-1)!
    s = applyAction(s, { type: 'draw', source: 'bloodDiscard' }).state
    expect(s.pendingDraw!.card).toEqual(top)
    expect(s.discards.blood).toHaveLength(0)
  })

  it('a player without chips in stock has to stand', () => {
    const s = game(2)
    s.players[0].chips = 0
    s.players[0].invested = 2
    expect(legalActions(s).map((a) => a.type)).toEqual(['stand'])
    expect(() => applyAction(s, { type: 'draw', source: 'sandDeck' })).toThrow(IllegalActionError)
  })

  it('plays three rounds, then reveals', () => {
    let s = game(3)
    const rounds: number[] = []
    for (let turn = 0; turn < 9; turn++) {
      expect(s.phase).toBe('turn')
      expect(s.current).toBe(turn % 3)
      rounds.push(s.round)
      s = applyAction(s, { type: 'stand' }).state
    }
    expect(rounds).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3])
    expect(['showdown', 'impostor']).toContain(s.phase)
  })

  it('reshuffles the discard pile when a deck runs out', () => {
    const s = game(2)
    s.discards.sand.push(...s.decks.sand.splice(0))
    const top = s.discards.sand.at(-1)!
    const { state, events } = run(s, { type: 'draw', source: 'sandDeck' })
    expect(events.some((e) => e.type === 'reshuffled')).toBe(true)
    expect(state.discards.sand).toEqual([top])
    expect(state.decks.sand.length).toBeGreaterThan(10)
  })
})

describe('reveal and settlement', () => {
  it('asks each Impostor holder to pick one of two dice', () => {
    let s = game(2)
    s.players[0].hand = hand('imp', 3)
    s.players[1].hand = hand(2, 2)
    s = standToShowdown(s)
    expect(s.phase).toBe('impostor')
    expect(s.current).toBe(0)
    const value = s.pendingDice!.dice[0]
    expect(() => applyAction(s, { type: 'chooseImpostor', value: 7 })).toThrow()
    s = applyAction(s, { type: 'chooseImpostor', value }).state
    expect(s.phase).toBe('showdown')
    expect(s.players[0].impostor.sand).toBe(value)
  })

  it('refunds the winner and taxes losers by their difference', () => {
    let s = game(3)
    s.players[0].hand = hand(2, 2)
    s.players[1].hand = hand(1, 5)
    s.players[2].hand = hand(4, 4)
    s.players[0].chips = 4
    s.players[0].invested = 2
    s.players[1].invested = 1
    s.players[1].chips = 5
    s.players[2].invested = 1
    s.players[2].chips = 5
    s = standToShowdown(s)
    expect(s.phase).toBe('showdown')
    expect(s.players[0].chips).toBe(4) // nothing moves before settle
    s = applyAction(s, { type: 'settle' }).state
    expect(s.phase).toBe('handEnd')
    expect(s.players.map((p) => p.chips)).toEqual([6, 1, 4]) // win · −1 −4 · −1 −1 (lost Sabacc)
    expect(s.players.every((p) => p.invested === 0)).toBe(true)
  })

  it('splits a true tie without penalties', () => {
    let s = game(2)
    s.players[0].hand = hand(3, 3)
    s.players[1].hand = hand('syl', 3)
    s.players[0].invested = 1
    s.players[0].chips = 5
    s = standToShowdown(s)
    s = applyAction(s, { type: 'settle' }).state
    expect(s.result!.ranking.every((r) => r.winner)).toBe(true)
    expect(s.players.map((p) => p.chips)).toEqual([6, 6])
  })

  it('eliminates players without chips and ends the game with one left', () => {
    let s = game(2, [], 3)
    s.players[0].hand = hand(1, 1)
    s.players[1].hand = hand(1, 6)
    s = standToShowdown(s)
    const { state, events } = run(s, { type: 'settle' })
    expect(state.players[1].chips).toBe(0)
    expect(state.players[1].eliminated).toBe(true)
    expect(state.phase).toBe('gameOver')
    expect(state.winner).toBe(0)
    expect(events.at(-1)).toEqual({ type: 'gameOver', winner: 0 })
  })

  it('rotates the opening seat and skips eliminated players on the next hand', () => {
    let s = game(3, [], 2)
    s.players[0].hand = hand(1, 1)
    s.players[1].hand = hand(1, 6)
    s.players[2].hand = hand(2, 3)
    s = standToShowdown(s)
    s = run(s, { type: 'settle' }, { type: 'nextHand' }).state
    expect(s.players[1].eliminated).toBe(true)
    expect(s.players[1].hand).toBeNull()
    expect(s.handNumber).toBe(2)
    expect(s.dealer).toBe(2)
    s = applyAction(s, { type: 'stand' }).state
    expect(s.current).toBe(0)
  })
})

describe('house rules', () => {
  const custom = (rules: Parameters<typeof createGame>[0]['rules'], chips?: number) => {
    const { state } = createGame({
      seed: 3,
      startingChips: 6,
      rules,
      players: [
        { name: 'A', isHuman: true, tokens: [], chips },
        { name: 'B', isHuman: false, tokens: [] },
      ],
    })
    state.dealer = 0
    state.current = 0
    return state
  }

  it('can shorten the hand', () => {
    let s = custom({ rounds: 2 })
    for (let turn = 0; turn < 4; turn++) {
      expect(s.phase).toBe('turn')
      s = applyAction(s, { type: 'stand' }).state
    }
    expect(s.phase).not.toBe('turn')
  })

  it('can change how many Sylops and Impostors are in the decks', () => {
    const s = custom({ sylops: 3, impostors: 5 })
    const sand = [...s.decks.sand, ...s.discards.sand, ...s.players.map((p) => p.hand!.sand)]
    expect(sand).toHaveLength(18 + 3 + 5)
    expect(sand.filter((c) => c.kind === 'sylop')).toHaveLength(3)
    expect(sand.filter((c) => c.kind === 'impostor')).toHaveLength(5)
    expect(new Set(sand.map((c) => c.id)).size).toBe(sand.length)
  })

  it('can raise the penalty for every losing hand', () => {
    let s = custom({ penaltyBonus: 1 })
    s.players[0].hand = hand(1, 1)
    s.players[1].hand = hand(2, 4)
    s = standToShowdown(s)
    s = applyAction(s, { type: 'settle' }).state
    expect(s.players[1].chips).toBe(6 - 2 - 1)
  })

  it('lets a seat start with its own number of chips', () => {
    const s = custom(undefined, 4)
    expect(s.players.map((p) => p.chips)).toEqual([4, 6])
  })

  it('fines a player caught cheating, but never their last chip', () => {
    const s = custom(undefined)
    expect(applyAction(s, { type: 'caught', fine: 2 }).state.players[0].chips).toBe(4)
    s.players[0].chips = 2
    const { state, events } = run(s, { type: 'caught', fine: 2 })
    expect(state.players[0].chips).toBe(1)
    expect(events).toEqual([{ type: 'chips', playerId: 0, delta: -1, pile: 'stock', reason: 'fine' }])
    expect(state.phase).toBe('turn')
    expect(state.current).toBe(0)
  })
})

describe('shift tokens', () => {
  const play = (s: GameState, token: TokenId, target?: number) => run(s, { type: 'playToken', token, target })

  it('allows one token per turn and each token once per game', () => {
    let s = game(2, ['markdown', 'majorFraud'])
    s = play(s, 'markdown').state
    expect(s.players[0].tokens).toEqual(['majorFraud'])
    expect(canPlayToken(s, 0, 'majorFraud')).toBe(false)
    expect(() => play(s, 'majorFraud')).toThrow(IllegalActionError)
    expect(() => play(s, 'markdown')).toThrow(IllegalActionError)
  })

  it('Free Draw waives the fee for this turn only', () => {
    let s = game(2, ['freeDraw'])
    s = run(s, { type: 'playToken', token: 'freeDraw' }, { type: 'draw', source: 'sandDeck' }).state
    expect(s.players[0].chips).toBe(6)
    expect(s.players[0].invested).toBe(0)
    s = run(s, { type: 'discard', keep: 'old' }, { type: 'stand' }, { type: 'draw', source: 'sandDeck' }).state
    expect(s.players[0].chips).toBe(5)
  })

  it('Refund and Extra Refund return invested chips', () => {
    const s = game(2, ['refund', 'extraRefund'])
    s.players[0].chips = 1
    s.players[0].invested = 5
    const a = play(s, 'refund').state
    expect([a.players[0].chips, a.players[0].invested]).toEqual([3, 3])
    const b = play(s, 'extraRefund').state
    expect([b.players[0].chips, b.players[0].invested]).toEqual([4, 2])
    s.players[0].invested = 0
    expect(canPlayToken(s, 0, 'refund')).toBe(false)
  })

  it('General Tariff and Target Tariff push chips into the invested pile', () => {
    const s = game(3, ['generalTariff', 'targetTariff'])
    const a = play(s, 'generalTariff').state
    expect(a.players.map((p) => [p.chips, p.invested])).toEqual([[6, 0], [5, 1], [5, 1]])
    const b = play(s, 'targetTariff', 2).state
    expect(b.players.map((p) => [p.chips, p.invested])).toEqual([[6, 0], [6, 0], [4, 2]])
    expect(() => play(s, 'targetTariff')).toThrow(IllegalActionError)
    expect(() => play(s, 'targetTariff', 0)).toThrow(IllegalActionError)
  })

  it('Embargo forces the next player to stand', () => {
    let s = game(3, ['embargo'])
    s = run(s, { type: 'playToken', token: 'embargo' }, { type: 'stand' }).state
    expect(s.current).toBe(1)
    expect(s.players[1].embargoed).toBe(true)
    expect(legalActions(s).some((a) => a.type === 'draw')).toBe(false)
    const { state, events } = run(s, { type: 'stand' })
    expect(events[0]).toEqual({ type: 'stood', playerId: 1, forced: true })
    expect(state.players[1].embargoed).toBe(false)
    expect(legalActions(state).some((a) => a.type === 'draw')).toBe(true)
  })

  it('audits only hit standing opponents', () => {
    let s = game(3, ['generalAudit', 'targetAudit'])
    expect(tokenTargets(s, 0, 'targetAudit')).toEqual([])
    s = run(s, { type: 'stand' }, { type: 'stand' }, { type: 'draw', source: 'sandDeck' }, { type: 'discard', keep: 'old' }).state
    expect(s.current).toBe(0)
    expect(tokenTargets(s, 0, 'targetAudit')).toEqual([1])
    const a = play(s, 'generalAudit').state
    expect(a.players.map((p) => [p.chips, p.invested])).toEqual([[6, 0], [4, 2], [5, 1]])
    const b = play(s, 'targetAudit', 1).state
    expect([b.players[1].chips, b.players[1].invested]).toEqual([3, 3])
  })

  it('Embezzlement takes one chip from every opponent', () => {
    const s = game(3, ['embezzlement'])
    s.players[2].chips = 0
    const a = play(s, 'embezzlement').state
    expect(a.players.map((p) => p.chips)).toEqual([7, 5, 0])
  })

  it('Immunity blocks chip and hand effects but not table-wide rule changes', () => {
    let s = game(3, ['immunity', 'generalTariff', 'embezzlement', 'embargo', 'markdown', 'exhaustion'])
    s = run(s, { type: 'playToken', token: 'immunity' }, { type: 'stand' }).state
    expect(s.players[0].immune).toBe(true)
    expect(tokenTargets(s, 1, 'exhaustion')).toEqual([2])

    const tariff = play(s, 'generalTariff')
    expect(tariff.state.players.map((p) => p.chips)).toEqual([6, 6, 5])
    expect(tariff.events).toContainEqual({ type: 'tokenBlocked', playerId: 0, token: 'generalTariff' })
    expect(play(s, 'embezzlement').state.players.map((p) => p.chips)).toEqual([6, 7, 5])

    const afterP1 = run(s, { type: 'stand' }).state
    const embargo = play(afterP1, 'embargo')
    expect(embargo.state.players[0].embargoed).toBe(false)
    expect(embargo.events).toContainEqual({ type: 'tokenBlocked', playerId: 0, token: 'embargo' })

    expect(play(s, 'markdown').state.modifiers.sylopZero).toBe(true)
  })

  it('Exhaustion replaces the target hand and shows the old cards', () => {
    const s = game(2, ['exhaustion'])
    const old = s.players[1].hand!
    const { state, events } = play(s, 'exhaustion', 1)
    expect(state.players[1].hand!.sand).not.toEqual(old.sand)
    expect(state.discards.sand.at(-1)).toEqual(old.sand)
    expect(state.discards.blood.at(-1)).toEqual(old.blood)
    expect(events).toContainEqual({ type: 'handRedrawn', playerId: 1 })
  })

  it('Direct Transaction swaps hands', () => {
    const s = game(2, ['directTransaction'])
    const [mine, theirs] = [s.players[0].hand, s.players[1].hand]
    const a = play(s, 'directTransaction', 1).state
    expect(a.players[0].hand).toEqual(theirs)
    expect(a.players[1].hand).toEqual(mine)
  })

  it('Prime Sabacc rolls two dice and lets the player pick the best Sabacc', () => {
    let s = game(2, ['primeSabacc'])
    s = play(s, 'primeSabacc').state
    expect(s.phase).toBe('primeChoice')
    const value = s.pendingDice!.dice[1]
    s = applyAction(s, { type: 'choosePrime', value }).state
    expect(s.modifiers.primeValue).toBe(value)
    expect(s.phase).toBe('turn')
    expect(s.current).toBe(0)
    expect(legalActions(s).some((a) => a.type === 'draw')).toBe(true)
  })

  it('lasting effects end with the hand', () => {
    let s = game(2, ['markdown', 'cookTheBooks', 'majorFraud'], 8)
    s.players[0].hand = hand(2, 2)
    s.players[1].hand = hand(2, 3)
    s = run(s, { type: 'playToken', token: 'markdown' }, { type: 'stand' }, { type: 'stand' }).state
    s = play(s, 'cookTheBooks').state
    s = standToShowdown(s)
    expect(s.modifiers.sylopZero && s.modifiers.cookTheBooks).toBe(true)
    s = run(s, { type: 'settle' }, { type: 'nextHand' }).state
    expect(s.modifiers).toEqual(NO_MODIFIERS)
  })
})
