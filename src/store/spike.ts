import { create } from 'zustand'
import type { Character } from '../ai/personalities'
import { sfx } from '../audio/sfx'
import { Rng, randomSeed } from '../engine/rng'
import { chooseSpikeAction } from '../spike/ai'
import { applySpikeAction, createSpikeGame, IllegalSpikeAction } from '../spike'
import type { SpikeAction, SpikeEvent, SpikeState } from '../spike'
import { tx } from '../i18n'
import { useCareer } from './career'
import { tempo } from './settings'

/** The player always sits in the first seat. */
export const SPIKE_HUMAN = 0

export interface SpikeSession {
  title: string
  venue: string
  /** `null` is the player */
  seats: (Character | null)[]
  startingChips: number
}

export interface SpikeFeedItem {
  id: number
  event: SpikeEvent
}

interface SpikeStore {
  session: SpikeSession | null
  game: SpikeState | null
  /** an animation or an opponent's turn is running; the player cannot act */
  busy: boolean
  thinking: number | null
  feed: SpikeFeedItem[]
  outcome: 'won' | 'lost' | null
  /** the dice are on show: what they rolled, until the table moves on */
  rolling: [number, number] | null
  start(session: SpikeSession): void
  act(action: SpikeAction): void
  clear(): void
}

let generation = 0
let feedId = 0
let aiRng = new Rng(1)

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms * tempo()))

function pauseAfter(events: SpikeEvent[], players: number): number {
  let ms = 250
  for (const e of events) {
    switch (e.type) {
      case 'handStart':
        ms = Math.max(ms, 900 + players * 320)
        break
      case 'gained':
      case 'swapped':
        ms = Math.max(ms, 800)
        break
      case 'stood':
      case 'checked':
      case 'called':
      case 'bet':
        ms = Math.max(ms, 650)
        break
      case 'junked':
        ms = Math.max(ms, 900)
        break
      case 'settled':
        ms = Math.max(ms, 1500)
        break
    }
  }
  return ms
}

function playSounds(events: SpikeEvent[], game: SpikeState): void {
  const dealing = events.some((e) => e.type === 'handStart')
  for (const e of events) {
    switch (e.type) {
      case 'handStart':
        sfx.deal(game.players.filter((p) => !p.eliminated).length * 2 + 1)
        break
      case 'turnStart':
        if (e.playerId === SPIKE_HUMAN && !dealing) sfx.turn()
        break
      case 'gained':
      case 'swapped':
        sfx.card()
        break
      case 'stood':
      case 'checked':
        sfx.stand()
        break
      case 'bet':
      case 'called':
        sfx.chip(e.amount)
        break
      case 'junked':
        sfx.blocked()
        break
      case 'roundStart':
        if (e.round > 1) sfx.round()
        break
      case 'eliminated':
        sfx.eliminated()
        break
      case 'settled':
        if (e.result.winners.includes(SPIKE_HUMAN)) sfx.win()
        else if (e.result.placing.some((x) => x.playerId === SPIKE_HUMAN)) sfx.lose()
        break
    }
  }
}

export const useSpike = create<SpikeStore>((set, get) => {
  function publish(state: SpikeState, events: SpikeEvent[]): void {
    playSounds(events, state)
    set((st) => ({ game: state, feed: [...st.feed, ...events.map((event) => ({ id: ++feedId, event }))].slice(-60) }))
    const { outcome } = get()
    if (outcome) return
    const me = state.players[SPIKE_HUMAN]
    const won = state.phase === 'gameOver' && state.winner === SPIKE_HUMAN
    if (won || me.eliminated) {
      set({ outcome: won ? 'won' : 'lost' })
      useCareer.getState().finishGame(null, won)
    }
  }

  function step(action: SpikeAction): SpikeEvent[] {
    const { state, events } = applySpikeAction(get().game!, action)
    publish(state, events)
    return events
  }

  /** Let the opponents and the table's own steps run until the player is needed. */
  async function pump(gen: number): Promise<void> {
    for (;;) {
      const { game, session, outcome } = get()
      if (gen !== generation || !game || !session) return
      if (outcome || game.phase === 'gameOver' || game.phase === 'handEnd') break

      if (game.phase === 'dice') {
        await wait(500)
        if (gen !== generation) return
        sfx.dice()
        const events = step({ type: 'roll' })
        const rolled = events.find((e) => e.type === 'diceRolled')
        if (rolled?.type === 'diceRolled') {
          set({ rolling: rolled.dice })
          await wait(rolled.shift ? 3000 : 1700)
          if (gen !== generation) return
          set({ rolling: null })
        }
        continue
      }

      if (game.phase === 'showdown') {
        sfx.reveal()
        // time to read the hands before the pots move
        await wait(game.result!.uncontested ? 1400 : 3200)
        if (gen !== generation) return
        await wait(pauseAfter(step({ type: 'settle' }), game.players.length))
        continue
      }

      const actor = game.players[game.current]
      if (actor.isHuman) break

      set({ thinking: actor.id })
      await wait(650 + Math.random() * 500)
      if (gen !== generation) return
      const action = chooseSpikeAction(get().game!, session.seats[actor.id]!.profile, aiRng)
      set({ thinking: null })
      await wait(pauseAfter(step(action), game.players.length))
    }
    if (gen === generation) set({ busy: false, thinking: null })
  }

  return {
    session: null,
    game: null,
    busy: false,
    thinking: null,
    feed: [],
    outcome: null,
    rolling: null,

    start(session) {
      const gen = ++generation
      aiRng = new Rng(randomSeed())
      const { state, events } = createSpikeGame({
        seed: randomSeed(),
        startingChips: session.startingChips,
        players: session.seats.map((c) => (c ? { name: c.name, isHuman: false } : { name: tx`Du`, isHuman: true })),
      })
      set({ session, busy: true, thinking: null, feed: [], outcome: null, rolling: null })
      publish(state, events)
      void wait(pauseAfter(events, state.players.length)).then(() => pump(gen))
    },

    act(action) {
      const { game, busy } = get()
      if (!game || busy) return
      const gen = generation
      set({ busy: true })
      let events: SpikeEvent[]
      try {
        events = step(action)
      } catch (error) {
        set({ busy: false })
        if (error instanceof IllegalSpikeAction) return
        throw error
      }
      void wait(pauseAfter(events, game.players.length)).then(() => pump(gen))
    },

    clear() {
      generation++
      set({ session: null, game: null, busy: false, thinking: null, feed: [], outcome: null, rolling: null })
    },
  }
})
