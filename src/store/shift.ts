import { create } from 'zustand'
import { CHARACTERS } from '../ai/personalities'
import { showsTell, strengthOf, TELLS, tellHeld } from '../ai/tells'
import { sfx } from '../audio/sfx'
import { Rng, randomSeed } from '../engine/rng'
import { tx } from '../i18n'
import { applyShiftAction, createShiftGame, IllegalShiftAction, scoreSelection } from '../shift'
import type { ShiftAction, ShiftConfig, ShiftEvent, ShiftRecord, ShiftState } from '../shift'
import { chooseShiftAction, shiftWinChance } from '../shift/ai'
import { useCareer } from './career'
import type { GameSummary, GameTally } from './career'
import { isHotseat, tipsFor } from './game'
import type { Session } from './game'
import { tempo } from './settings'

/** Where the player sits when they play alone. */
export const SHIFT_HUMAN = 0

export interface ShiftFeedItem {
  id: number
  event: ShiftEvent
}

interface ShiftStore {
  session: Session | null
  game: ShiftState | null
  /** an animation or an opponent's turn is running; the player cannot act */
  busy: boolean
  thinking: number | null
  feed: ShiftFeedItem[]
  outcome: 'won' | 'lost' | null
  /** what the career made of the game, once it is decided */
  summary: GameSummary | null
  /** the last gesture an opponent made, see ai/tells */
  gesture: { playerId: number; text: string; id: number } | null
  /** whose hand the table shows at the bottom: the player, or whoever holds the device in a game passed round */
  viewer: number
  /** a game passed round: the seat that is to take the device next; the table stays covered until they do */
  handoff: number | null
  /** how often the player may still ask for advice in this game */
  tipsLeft: number
  /** practice hand: index of the step the coach is on */
  tutorialStep: number
  /** counts up when the player tries something the practice hand is not asking for */
  nudge: number

  start(session: Session): void
  /** The croupier's practice hand: a fixed deal that shows what the target is. */
  startTutorial(): void
  act(action: ShiftAction): void
  takeOver(): void
  takeTip(): boolean
  /** Leave the table before the game is decided; counts as a loss. */
  forfeit(): void
  clear(): void
}

let generation = 0
let feedId = 0
let aiRng = new Rng(1)
let tally: GameTally = { handsLost: 0, minChips: 99, peeks: 0, caught: 0 }
let record: ShiftRecord | null = null
/** seats that made their gesture in the current hand */
let handTells = new Set<number>()
let gestureId = 0

/** The game being played as a record that replays to the same result (see shift/replay). */
export function currentShiftRecord(): ShiftRecord | null {
  return record && { config: record.config, actions: [...record.actions] }
}

/**
 * The practice hand, step by step: what the coach says in each of the
 * player's turns that call for a choice, and the one move it asks for.
 * The deal: target +5 in triangles; in hand +3, +2, −8, +9 and −6.
 */
export const SHIFT_TUTORIAL: { text: string; expect(action: ShiftAction): boolean }[] = [
  {
    text: tx`Die Würfel sagen: Ziel +5, Farbe Dreieck. Wähle Karten, die zusammen möglichst genau +5 ergeben – nicht alle müssen mit. +3 und +2 sind schon +5. Tipp sie an und leg sie beiseite.`,
    expect: (a) => a.type === 'select' && a.cards.length === 2 && a.cards.includes('triangle+3') && a.cards.includes('circle+2'),
  },
  {
    text: tx`Jetzt wird gesetzt. Mit genau +5 stehst du gut – setz ruhig.`,
    expect: (a) => a.type === 'bet' || a.type === 'check' || a.type === 'call',
  },
  {
    text: tx`Der Shift: Was du nicht beiseitegelegt hast, ist weg, und du hast neue Karten. Deine Auswahl trifft das Ziel schon – füg nichts hinzu, sonst verrutscht sie.`,
    expect: (a) => a.type === 'improve' && a.cards.length === 0,
  },
  {
    text: tx`Letzte Setzrunde. Danach wird aufgedeckt, und wer dem Ziel am nächsten ist, gewinnt den Topf.`,
    expect: (a) => a.type === 'bet' || a.type === 'check' || a.type === 'call',
  },
]

export const SHIFT_TUTORIAL_RESULT = tx`So geht Coruscant Shift: Ziel treffen, nicht null. Bei Gleichstand zählen die Karten der Würfelfarbe – Sylops zählen für jede Farbe.`

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms * tempo()))

function pauseAfter(events: ShiftEvent[], players: number): number {
  let ms = 250
  for (const e of events) {
    switch (e.type) {
      case 'handStart':
        ms = Math.max(ms, 1600 + players * 320)
        break
      case 'selected':
      case 'improved':
        ms = Math.max(ms, 700)
        break
      case 'shifted':
        ms = Math.max(ms, 1400)
        break
      case 'checked':
      case 'called':
      case 'bet':
        ms = Math.max(ms, 650)
        break
      case 'folded':
        ms = Math.max(ms, 900)
        break
      case 'settled':
        ms = Math.max(ms, 1500)
        break
    }
  }
  return ms
}

function playSounds(events: ShiftEvent[], game: ShiftState, viewer: number): void {
  const dealing = events.some((e) => e.type === 'handStart')
  for (const e of events) {
    switch (e.type) {
      case 'handStart':
        sfx.dice()
        sfx.deal(game.players.filter((p) => !p.eliminated).length * 5)
        break
      case 'turnStart':
        if (game.players[e.playerId].isHuman && !dealing) sfx.turn()
        break
      case 'selected':
      case 'improved':
        sfx.card()
        break
      case 'shifted':
        sfx.deal(e.count)
        break
      case 'checked':
        sfx.stand()
        break
      case 'bet':
      case 'called':
        sfx.chip(e.amount)
        break
      case 'folded':
        sfx.blocked()
        break
      case 'eliminated':
        sfx.eliminated()
        break
      case 'settled':
        if (e.result.winners.includes(viewer)) sfx.win()
        else if (e.result.placing.some((x) => x.playerId === viewer)) sfx.lose()
        break
    }
  }
}

function firstView(session: Session): Pick<ShiftStore, 'viewer' | 'handoff'> {
  const first = session.people?.[0]?.seat ?? SHIFT_HUMAN
  return { viewer: first, handoff: isHotseat(session) ? first : null }
}

export const useShift = create<ShiftStore>((set, get) => {
  function publish(state: ShiftState, events: ShiftEvent[]): void {
    playSounds(events, state, get().viewer)
    set((st) => ({ game: state, feed: [...st.feed, ...events.map((event) => ({ id: ++feedId, event }))].slice(-60) }))
    const { outcome, session } = get()
    if (outcome || !session) return
    if (isHotseat(session)) {
      if (state.phase !== 'gameOver' && state.players.some((p) => p.isHuman && !p.eliminated)) return
      set({ outcome: state.winner !== null && state.players[state.winner].isHuman ? 'won' : 'lost' })
      return
    }
    trackStats(state, events)
    const me = state.players[SHIFT_HUMAN]
    const won = state.phase === 'gameOver' && state.winner === SHIFT_HUMAN
    if (won || me.eliminated) {
      tally.runnerUp = !won && state.players.filter((p) => !p.eliminated).length === 1
      tally.finalChips = me.chips
      tally.winner = state.winner === null ? undefined : state.winner === SHIFT_HUMAN ? 'you' : session.seats[state.winner]?.id
      set({ outcome: won ? 'won' : 'lost', summary: session.tutorial ? null : useCareer.getState().finishGame(session, won, tally) })
    }
  }

  function trackStats(state: ShiftState, events: ShiftEvent[]): void {
    if (get().session?.tutorial) return
    tally.minChips = Math.min(tally.minChips, state.players[SHIFT_HUMAN].chips)
    for (const e of events) {
      if (e.type === 'handStart') handTells = new Set()
      if (e.type !== 'settled') continue
      for (const playerId of handTells) {
        const seat = get().session?.seats[playerId]
        const placed = e.result.placing.find((x) => x.playerId === playerId)
        const tell = seat && TELLS[seat.id]
        if (tell && placed && tellHeld(tell, { winner: placed.winner, sabacc: placed.score.distance === 0 })) useCareer.getState().confirmTell(seat.id)
      }
      handTells = new Set()
      const placed = e.result.placing.find((x) => x.playerId === SHIFT_HUMAN)
      const won = e.result.winners.includes(SHIFT_HUMAN)
      // hitting the target exactly is this game's sabacc
      const exact = !!placed && placed.score.distance === 0 && !e.result.uncontested
      if (!won) tally.handsLost++
      if (won && exact) tally.sabaccWins = (tally.sabaccWins ?? 0) + 1
      useCareer.getState().bumpStats({ hands: 1, handsWon: won ? 1 : 0, sabaccs: exact ? 1 : 0, sabaccWins: won && exact ? 1 : 0 })
    }
  }

  function step(action: ShiftAction): ShiftEvent[] {
    const { state, events } = applyShiftAction(get().game!, action)
    record?.actions.push(action)
    publish(state, events)
    return events
  }

  /** Before an opponent bets they may give their hand away with a gesture, once a hand. */
  function gesture(game: ShiftState, playerId: number, session: Session): void {
    const seat = session.seats[playerId]
    const tell = seat && TELLS[seat.id]
    const p = game.players[playerId]
    if (!seat || !tell || session.tutorial || handTells.has(playerId) || game.phase !== 'bet' || p.selection.length === 0) return
    const opponents = game.players.filter((x) => !x.eliminated && !x.folded && x.id !== playerId).length
    const strength = strengthOf(shiftWinChance(scoreSelection(p.selection, game.target), game.target, opponents))
    const often = useCareer.getState().bix === 'convor' ? 1.4 : 1
    if (!showsTell(tell, strength, seat.profile.difficulty, Math.random, often)) return
    handTells.add(playerId)
    set({ gesture: { playerId, text: tell.gesture, id: ++gestureId } })
  }

  async function pump(gen: number): Promise<void> {
    for (;;) {
      const { game, session, outcome } = get()
      if (gen !== generation || !game || !session) return
      if (outcome || game.phase === 'gameOver' || game.phase === 'handEnd') break

      if (game.phase === 'showdown') {
        sfx.reveal()
        await wait(game.result!.uncontested ? 1400 : 3200)
        if (gen !== generation) return
        await wait(pauseAfter(step({ type: 'settle' }), game.players.length))
        continue
      }

      const actor = game.players[game.current]
      if (actor.isHuman) {
        if (isHotseat(session) && actor.id !== get().viewer) set({ handoff: actor.id })
        break
      }

      set({ thinking: actor.id })
      gesture(game, actor.id, session)
      await wait(650 + Math.random() * 500)
      if (gen !== generation) return
      // in the practice hand the croupier keeps out of the way: one card set aside, never a bet
      const action: ShiftAction = session.tutorial
        ? game.phase === 'select'
          ? { type: 'select', cards: [actor.hand[0].id] }
          : game.phase === 'improve'
            ? { type: 'improve', cards: [] }
            : game.toCall > actor.bet
              ? { type: 'call' }
              : { type: 'check' }
        : chooseShiftAction(get().game!, session.seats[actor.id]!.profile, aiRng)
      set({ thinking: null })
      await wait(pauseAfter(step(action), game.players.length))
    }
    if (gen === generation) set({ busy: false, thinking: null })
  }

  const fresh = { thinking: null, feed: [], outcome: null, summary: null, gesture: null }

  return {
    session: null,
    game: null,
    busy: false,
    ...fresh,
    viewer: SHIFT_HUMAN,
    handoff: null,
    tipsLeft: 0,
    tutorialStep: 0,
    nudge: 0,

    start(session) {
      const gen = ++generation
      const hotseat = isHotseat(session)
      aiRng = new Rng(randomSeed())
      const chips = session.playerChips ?? session.startingChips
      tally = { handsLost: 0, minChips: chips, peeks: 0, caught: 0, startChips: chips, tokensPlayed: 0 }
      handTells = new Set()
      if (!hotseat) useCareer.getState().beginGame(session)
      const config: ShiftConfig = {
        seed: session.seed ?? randomSeed(),
        startingChips: session.startingChips,
        rules: session.shiftRules,
        players: session.seats.map((c, seat) => {
          if (c) return { name: c.name, isHuman: false }
          const person = session.people?.find((p) => p.seat === seat)
          return person ? { name: person.name, isHuman: true } : { name: tx`Du`, isHuman: true, chips: session.playerChips }
        }),
      }
      record = { config, actions: [] }
      const { state, events } = createShiftGame(config)
      set({ session, busy: true, ...fresh, ...firstView(session), tipsLeft: tipsFor(session), tutorialStep: 0, nudge: 0 })
      publish(state, events)
      void wait(pauseAfter(events, state.players.length)).then(() => pump(gen))
    },

    startTutorial() {
      const gen = ++generation
      const croupier = CHARACTERS.orrin
      const session: Session = { variant: 'shift', mode: 'free', table: null, title: tx`Übungshand`, venue: 'casino', tutorial: true, seats: [null, croupier], startingChips: 10 }
      const config: ShiftConfig = { seed: 1, startingChips: 10, players: [{ name: tx`Du`, isHuman: true }, { name: croupier.name, isHuman: false }] }
      record = null
      const { state, events } = createShiftGame(config)
      // The fixed deal: target +5 in triangles; +3 and +2 in hand already make it.
      const take = (id: string) => state.deck.splice(state.deck.findIndex((c) => c.id === id), 1)[0]
      state.deck.push(...state.players.flatMap((p) => p.hand.splice(0)))
      state.target = { value: 5, suit: 'triangle' }
      state.players[0].hand = ['triangle+3', 'circle+2', 'square-8', 'circle+9', 'triangle-6'].map(take)
      state.players[1].hand = ['square+7', 'circle-1', 'square+4', 'triangle-9', 'circle+6'].map(take)
      // the shift deals the player harmless cards and the croupier nothing that helps
      state.deck.push(...['square+10', 'circle-10', 'triangle+8', 'square-7'].map(take))
      state.dealer = 1
      state.current = 0
      state.pending = [0, 1]
      const shown = events.map((e) => (e.type === 'handStart' ? { ...e, target: state.target } : e)).filter((e) => e.type !== 'turnStart')
      set({ session, busy: true, ...fresh, ...firstView(session), tipsLeft: 0, tutorialStep: 0, nudge: 0 })
      publish(state, shown)
      void wait(pauseAfter(events, 2)).then(() => pump(gen))
    },

    act(action) {
      const { game, busy, session, tutorialStep, nudge } = get()
      if (!game || busy) return
      // The practice hand only accepts the move it is currently teaching.
      if (session?.tutorial && ['select', 'improve', 'bet'].includes(game.phase)) {
        if (!SHIFT_TUTORIAL[tutorialStep]?.expect(action)) return set({ nudge: nudge + 1 })
        set({ tutorialStep: tutorialStep + 1 })
      }
      const gen = generation
      set({ busy: true })
      let events: ShiftEvent[]
      try {
        events = step(action)
      } catch (error) {
        set({ busy: false })
        if (error instanceof IllegalShiftAction) return
        throw error
      }
      void wait(pauseAfter(events, game.players.length)).then(() => pump(gen))
    },

    takeOver() {
      const { handoff } = get()
      if (handoff !== null) set({ viewer: handoff, handoff: null })
    },

    takeTip() {
      const { tipsLeft } = get()
      if (tipsLeft <= 0) return false
      set({ tipsLeft: tipsLeft - 1 })
      return true
    },

    forfeit() {
      const { session, outcome } = get()
      generation++
      if (session && !outcome && !isHotseat(session) && !session.tutorial) useCareer.getState().finishGame(session, false, tally)
      set({ session: null, game: null, busy: false, ...fresh })
    },

    clear() {
      generation++
      set({ session: null, game: null, busy: false, ...fresh })
    },
  }
})
