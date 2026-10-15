import { create } from 'zustand'
import { sfx } from '../audio/sfx'
import { suspicionCooldown } from '../career/ship'
import { Rng, randomSeed } from '../engine/rng'
import { showsTell, strengthOf, TELLS, tellHeld } from '../ai/tells'
import { chooseSpikeAction, spikeWinChance } from '../spike/ai'
import { isSabacc } from '../spike/scoring'
import { applySpikeAction, createSpikeGame, IllegalSpikeAction } from '../spike'
import type { SpikeAction, SpikeConfig, SpikeEvent, SpikeRecord, SpikeState } from '../spike'
import { tx } from '../i18n'
import { useCareer } from './career'
import type { GameSummary, GameTally } from './career'
import { bixCoverFor, isHotseat, tipsFor, wariness } from './game'
import type { Session } from './game'
import { tempo } from './settings'
import { useToasts } from './toasts'

/** Where the player sits when they play alone. */
export const SPIKE_HUMAN = 0

export interface SpikeFeedItem {
  id: number
  event: SpikeEvent
}

interface SpikeStore {
  session: Session | null
  game: SpikeState | null
  /** an animation or an opponent's turn is running; the player cannot act */
  busy: boolean
  thinking: number | null
  feed: SpikeFeedItem[]
  outcome: 'won' | 'lost' | null
  /** what the career made of the game, once it is decided */
  summary: GameSummary | null
  /** the dice are on show: what they rolled, until the table moves on */
  rolling: [number, number] | null
  /** the last gesture an opponent made, see ai/tells */
  gesture: { playerId: number; text: string; id: number } | null
  /** whose hand the table shows at the bottom: the player, or whoever holds the device in a game passed round */
  viewer: number
  /** a game passed round: the seat that is to take the device next; the table stays covered until they do */
  handoff: number | null
  /** how closely the table is watching the player's hands, 0–100: the most watchful opponent */
  suspicion: number
  /** how closely each seat is watching, by seat */
  watch: number[]
  /** ids of opponents' cards the player has sneaked a look at this hand */
  peeked: string[]
  /** one look per hand */
  peekUsed: boolean
  /** the sylop from the sleeve has been swapped in this game */
  sleeveUsed: boolean
  /** counts up every time the player is caught; the table reacts to it */
  caught: number
  /** Bix can cover for a look gone wrong; how often it still can */
  bixCover: number
  /** how often the player may still ask for advice in this game */
  tipsLeft: number

  start(session: Session): void
  act(action: SpikeAction): void
  /** The next person has the device: uncover the table for them. */
  takeOver(): void
  /** Spend one piece of advice; false if there is none left. */
  takeTip(): boolean
  /** Sneak a look at one of an opponent's cards, in the player's turn of the card phase. */
  peek(target: number): 'seen' | 'caught' | 'covered' | null
  /** Swap a card in hand for a sylop from the sleeve; `steadiness` as for Kessel Sabacc. */
  sleeve(give: string, steadiness?: number): 'swapped' | 'caught' | 'covered' | null
  /** Leave the table before the game is decided; counts as a loss. */
  forfeit(): void
  clear(): void
}

let generation = 0
let feedId = 0
let aiRng = new Rng(1)
/** decides whether cheating is noticed; seeded from the deal */
let peekRng = new Rng(1)
/** What the player went through in the current game; feeds the achievements and jobs. */
let tally: GameTally = { handsLost: 0, minChips: 99, peeks: 0, caught: 0 }
/** the current game, move by move */
let record: SpikeRecord | null = null
/** seats that made their gesture in the current hand */
let handTells = new Set<number>()
let gestureId = 0

/** The game being played as a record that replays to the same result (see spike/replay). */
export function currentSpikeRecord(): SpikeRecord | null {
  return record && { config: record.config, actions: [...record.actions] }
}

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

function playSounds(events: SpikeEvent[], game: SpikeState, viewer: number): void {
  const dealing = events.some((e) => e.type === 'handStart')
  for (const e of events) {
    switch (e.type) {
      case 'handStart':
        sfx.deal(game.players.filter((p) => !p.eliminated).length * 2 + 1)
        break
      case 'turnStart':
        if (game.players[e.playerId].isHuman && !dealing) sfx.turn()
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
        if (e.result.winners.includes(viewer)) sfx.win()
        else if (e.result.placing.some((x) => x.playerId === viewer)) sfx.lose()
        break
    }
  }
}

/** Each seat's watchfulness, and the table's as the most watchful of them. */
function watching(watch: number[], rest: Partial<SpikeStore> = {}): Partial<SpikeStore> {
  return { ...rest, watch, suspicion: Math.max(0, ...watch) }
}

/** Who sees the table first: the player, or in a game passed round the first person, once they have the device. */
function firstView(session: Session): Pick<SpikeStore, 'viewer' | 'handoff'> {
  const first = session.people?.[0]?.seat ?? SPIKE_HUMAN
  return { viewer: first, handoff: isHotseat(session) ? first : null }
}

export const useSpike = create<SpikeStore>((set, get) => {
  function publish(state: SpikeState, events: SpikeEvent[]): void {
    playSounds(events, state, get().viewer)
    set((st) => ({ game: state, feed: [...st.feed, ...events.map((event) => ({ id: ++feedId, event }))].slice(-60) }))
    // A new hand: fresh cards, and the table relaxes a little.
    if (events.some((e) => e.type === 'handStart')) {
      set((st) => watching(st.watch.map((w) => Math.max(0, w - suspicionCooldown(useCareer.getState().ship))), { peeked: [], peekUsed: false }))
    }
    const { outcome, session } = get()
    if (outcome || !session) return
    if (isHotseat(session)) {
      // Played on until one is left, or until nobody at the device is still in.
      if (state.phase !== 'gameOver' && state.players.some((p) => p.isHuman && !p.eliminated)) return
      set({ outcome: state.winner !== null && state.players[state.winner].isHuman ? 'won' : 'lost' })
      return
    }
    trackStats(state, events)
    const me = state.players[SPIKE_HUMAN]
    const won = state.phase === 'gameOver' && state.winner === SPIKE_HUMAN
    if (won || me.eliminated) {
      tally.runnerUp = !won && state.players.filter((p) => !p.eliminated).length === 1
      tally.finalChips = me.chips
      tally.winner = state.winner === null ? undefined : state.winner === SPIKE_HUMAN ? 'you' : session.seats[state.winner]?.id
      set({ outcome: won ? 'won' : 'lost', summary: session.tutorial ? null : useCareer.getState().finishGame(session, won, tally) })
    }
  }

  function trackStats(state: SpikeState, events: SpikeEvent[]): void {
    if (get().session?.tutorial) return
    const me = state.players[SPIKE_HUMAN]
    tally.minChips = Math.min(tally.minChips, me.chips)
    for (const e of events) {
      if (e.type === 'handStart') handTells = new Set()
      if (e.type !== 'settled') continue
      // Gestures made this hand are held against the cards now on the table.
      for (const playerId of handTells) {
        const seat = get().session?.seats[playerId]
        const placed = e.result.placing.find((x) => x.playerId === playerId)
        const tell = seat && TELLS[seat.id]
        if (tell && placed && tellHeld(tell, { winner: placed.winner, sabacc: isSabacc(placed.score) })) useCareer.getState().confirmTell(seat.id)
      }
      handTells = new Set()
      const placed = e.result.placing.find((x) => x.playerId === SPIKE_HUMAN)
      const won = e.result.winners.includes(SPIKE_HUMAN)
      const sabacc = !!placed && isSabacc(placed.score) && !e.result.uncontested
      if (!won) tally.handsLost++
      if (won && sabacc) tally.sabaccWins = (tally.sabaccWins ?? 0) + 1
      useCareer.getState().bumpStats({ hands: 1, handsWon: won ? 1 : 0, sabaccs: sabacc ? 1 : 0, sabaccWins: won && sabacc ? 1 : 0 })
    }
  }

  function step(action: SpikeAction): SpikeEvent[] {
    const { state, events } = applySpikeAction(get().game!, action)
    record?.actions.push(action)
    publish(state, events)
    return events
  }

  /** Before an opponent moves they may give their hand away with a gesture, once a hand. */
  function gesture(game: SpikeState, playerId: number, session: Session): void {
    const seat = session.seats[playerId]
    const tell = seat && TELLS[seat.id]
    if (!seat || !tell || session.tutorial || handTells.has(playerId) || (game.phase !== 'card' && game.phase !== 'bet')) return
    const opponents = game.players.filter((p) => !p.eliminated && !p.folded && p.id !== playerId).length
    const strength = strengthOf(spikeWinChance(game.players[playerId].hand, opponents))
    const often = useCareer.getState().bix === 'convor' ? 1.4 : 1
    if (!showsTell(tell, strength, seat.profile.difficulty, Math.random, often)) return
    handTells.add(playerId)
    set({ gesture: { playerId, text: tell.gesture, id: ++gestureId } })
  }

  /** Cheating is only on offer to a player alone at the table, in their turn of the card phase. */
  function cheatable(): boolean {
    const { game, session, busy } = get()
    return !!game && !!session && !session.tutorial && !isHotseat(session) && !busy && game.phase === 'card' && game.current === SPIKE_HUMAN && !game.players[SPIKE_HUMAN].folded
  }

  /** Someone at the table saw it: Bix may still save the day, else a fine and a word with the house. */
  function spotted(next: number[], seat: number, fine: number, calm: number): 'caught' | 'covered' {
    const { session, caught } = get()
    if (get().bixCover > 0) {
      next[seat] = calm
      set(watching(next, { bixCover: get().bixCover - 1 }))
      sfx.blocked()
      useToasts.getState().push({ kind: 'note', title: tx`Bix lenkt ab`, text: tx`Ein Glas kippt um, alle schauen hin. Niemand hat etwas gesehen.` })
      return 'covered'
    }
    tally.caught++
    // Getting caught at a syndicate's table costs standing with it, once a game.
    const syndicate = session?.table?.syndicate
    if (syndicate && tally.caught === 1) useCareer.getState().shiftStanding(syndicate, -1)
    next[seat] = 50
    set(watching(next, { caught: caught + 1 }))
    useCareer.getState().bumpStats({ caught: 1 })
    sfx.blocked()
    step({ type: 'caught', fine })
    return 'caught'
  }

  /** Let the opponents and the table's own steps run until a person is needed. */
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
      if (actor.isHuman) {
        if (isHotseat(session) && actor.id !== get().viewer) set({ handoff: actor.id })
        break
      }

      set({ thinking: actor.id })
      gesture(game, actor.id, session)
      await wait(650 + Math.random() * 500)
      if (gen !== generation) return
      const action = chooseSpikeAction(get().game!, session.seats[actor.id]!.profile, aiRng)
      set({ thinking: null })
      await wait(pauseAfter(step(action), game.players.length))
    }
    if (gen === generation) set({ busy: false, thinking: null })
  }

  const fresh = { thinking: null, feed: [], outcome: null, summary: null, rolling: null, gesture: null, peeked: [], peekUsed: false, sleeveUsed: false, caught: 0 }

  return {
    session: null,
    game: null,
    busy: false,
    ...fresh,
    viewer: SPIKE_HUMAN,
    handoff: null,
    suspicion: 0,
    watch: [],
    bixCover: 0,
    tipsLeft: 0,

    start(session) {
      const gen = ++generation
      const hotseat = isHotseat(session)
      aiRng = new Rng(randomSeed())
      const chips = session.playerChips ?? session.startingChips
      tally = { handsLost: 0, minChips: chips, peeks: 0, caught: 0, startChips: chips }
      handTells = new Set()
      if (!hotseat && !session.tutorial) useCareer.getState().beginGame(session)
      const config: SpikeConfig = {
        seed: session.seed ?? randomSeed(),
        startingChips: session.startingChips,
        rules: session.spikeRules,
        players: session.seats.map((c, seat) => {
          if (c) return { name: c.name, isHuman: false }
          const person = session.people?.find((p) => p.seat === seat)
          return person ? { name: person.name, isHuman: true } : { name: tx`Du`, isHuman: true, chips: session.playerChips }
        }),
      }
      record = { config, actions: [] }
      peekRng = new Rng(config.seed ^ 0x2545f491)
      const { state, events } = createSpikeGame(config)
      set({
        session,
        busy: true,
        ...fresh,
        ...firstView(session),
        ...watching(session.seats.map(() => 0)),
        bixCover: hotseat ? 0 : bixCoverFor(session),
        tipsLeft: tipsFor(session),
      })
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

    peek(target) {
      const { game, session, peekUsed, peeked, watch } = get()
      const victim = game?.players[target]
      if (!cheatable() || peekUsed || !game || !session || !victim || victim.isHuman || !victim.hand.length) return null
      // The one looked at notices most; the others catch a glimpse of it too.
      const added = (20 + peekRng.next() * 18) * wariness(session)
      const next = watch.map((w, seat) => (seat === SPIKE_HUMAN ? 0 : seat === target ? w + added : w + added * 0.35))
      tally.peeks++
      useCareer.getState().bumpStats({ peeks: 1 })
      set({ peekUsed: true })
      if (next[target] >= 100) return spotted(next, target, 2, 25)
      const unseen = victim.hand.map((c) => c.id).filter((id) => !peeked.includes(id))
      const card = unseen[peekRng.int(unseen.length)]
      set(watching(next, { peeked: card ? [...peeked, card] : peeked }))
      sfx.card()
      return 'seen'
    },

    sleeve(give, steadiness = 1) {
      const { game, session, watch, sleeveUsed } = get()
      const career = useCareer.getState()
      if (!cheatable() || !game || !session || session.mode !== 'career' || sleeveUsed || career.sleeves <= 0) return null
      if (!game.players[SPIKE_HUMAN].hand.some((c) => c.id === give)) return null
      // A hand under the table is noticed by everybody at once.
      const added = (32 + peekRng.next() * 22) * wariness(session) * steadiness
      const next = watch.map((w, seat) => (seat === SPIKE_HUMAN ? 0 : w + added))
      const seen = next.findIndex((w) => w >= 100)
      career.spendSleeve()
      tally.peeks++
      set({ sleeveUsed: true })
      if (seen >= 0) return spotted(next, seen, 3, 30)
      set(watching(next))
      sfx.card()
      step({ type: 'sleeve', give })
      return 'swapped'
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
