import { create } from 'zustand'
import type { Character } from '../ai/personalities'
import { chooseAction } from '../ai/policy'
import { sfx } from '../audio/sfx'
import type { TableDef } from '../career/tables'
import { REP } from '../career/reputation'
import { suspicionCooldown } from '../career/ship'
import { TABLES } from '../career/tables'
import { TUTORIAL_OPPONENT, TUTORIAL_STEPS, tutorialGame, tutorialScript } from '../career/tutorial'
import { applyAction, createGame, randomSeed, Rng, STANDARD_RULES, SUITS } from '../engine'
import type { Action, GameConfig, GameEvent, GameRecord, GameState, Rules, TokenId } from '../engine'
import { useCareer } from './career'
import type { GameSummary, GameTally } from './career'
import { tempo } from './settings'
import { tx } from '../i18n'

export const HUMAN = 0

export interface Session {
  /** which Sabacc is played; Kessel Sabacc when left out */
  variant?: 'kessel' | 'spike'
  mode: 'career' | 'free'
  /** a duel is one-on-one against the table's rival; tour and daily hand are made-up tables; the stake game wins a ship */
  kind?: 'table' | 'duel' | 'tour' | 'daily' | 'stake' | 'job'
  /** how many times the normal stake the player put up */
  stake?: number
  /** the second, merciless run through the career */
  legend?: boolean
  /** fixed deal: the same seed always plays out the same way (daily hand) */
  seed?: number
  /** credits paid to sit down and paid out for winning (0 in free play) */
  buyIn?: number
  payout?: number
  rules?: Partial<Rules>
  /** the player's starting chips if they differ from the table's */
  playerChips?: number
  /** the scripted practice hand, see career/tutorial */
  tutorial?: boolean
  /** a job from the board taken on for this game, see career/jobs */
  job?: string
  table: TableDef | null
  title: string
  /** which room the table stands in, see career/venues */
  venue?: string
  /** one entry per seat; seat 0 is the human */
  seats: (Character | null)[]
  startingChips: number
}

export interface FeedItem {
  id: number
  event: GameEvent
}

const RUN_KEY = 'kessel-sabacc-run'

interface SavedRun {
  /** 1: before games were recorded */
  version: 1 | 2
  session: Session
  game: GameState
  /** how the game was set up and every move so far (from version 2) */
  record?: GameRecord
  /** where the dice for peeking had got to (from version 2) */
  peekState?: number
}

/** A game that was interrupted, e.g. because the phone closed the app. */
function loadRun(): SavedRun | null {
  try {
    const run = JSON.parse(localStorage.getItem(RUN_KEY) ?? 'null') as SavedRun | null
    if ((run?.version !== 1 && run?.version !== 2) || run.game.phase === 'gameOver') return null
    run.game.rules ??= STANDARD_RULES // saved before house rules existed
    return run
  } catch {
    return null
  }
}

function saveRun(session: Session, game: GameState): void {
  try {
    const run: SavedRun = { version: 2, session, game, record: record ?? undefined, peekState: peekRng.state }
    localStorage.setItem(RUN_KEY, JSON.stringify(run))
  } catch {
    /* storage full or blocked – the game simply is not resumable */
  }
}

function dropRun(): void {
  try {
    localStorage.removeItem(RUN_KEY)
  } catch {
    /* nothing to clean up */
  }
}

interface GameStore {
  session: Session | null
  game: GameState | null
  /** an animation or an AI turn is running; the player cannot act */
  busy: boolean
  thinking: number | null
  feed: FeedItem[]
  outcome: 'won' | 'lost' | null
  summary: GameSummary | null
  /**
   * Showdown choreography: index into `revealOrder` of the hand being turned
   * over. −1 while the table holds its breath, `order.length` once every hand
   * is open, `null` outside the showdown.
   */
  revealStep: number | null
  /** how closely the table is watching the player's hands, 0–100 */
  suspicion: number
  /** ids of opponents' cards the player has sneaked a look at this hand */
  peeked: string[]
  /** one look per hand */
  peekUsed: boolean
  /** counts up every time the player is caught; the table reacts to it */
  caught: number
  /** practice hand: index of the current step of the script */
  tutorialStep: number
  /** counts up when the player tries something the practice hand is not asking for */
  nudge: number
  /** title of an interrupted game that can be resumed, if any */
  savedRun: string | null
  /** how often the player may still ask for advice in this game */
  tipsLeft: number

  /** Spend one piece of advice; false if there is none left. */
  takeTip(): boolean

  /**
   * Sneak a look at one of an opponent's cards. Raises suspicion; at 100 the
   * player is caught instead, pays a fine and sees nothing.
   */
  peek(target: number): 'seen' | 'caught' | null
  /** Pick an interrupted game up where it stopped. */
  resume(): boolean
  start(session: Session, humanTokens: TokenId[]): void
  startTutorial(): void
  /** Confirm a step of the practice hand that only explains something. */
  tutorialNext(): void
  act(action: Action): void
  /** Leave the table before the game is decided; counts as a loss. */
  forfeit(): void
  clear(): void
}

/** Advice is free where nothing is at stake; a game for credits allows a few looks at it. */
export const TIPS_PER_GAME = 3
const tipsFor = (session: Session) => (session.mode === 'free' ? Infinity : TIPS_PER_GAME)

/** Seats in the order they show their hands: clockwise from the opening player. */
export function revealOrder(game: GameState): number[] {
  const n = game.players.length
  return Array.from({ length: n }, (_, i) => (game.dealer + i) % n).filter((id) => !game.players[id].eliminated)
}

/** What the player went through in the current game; feeds the achievements. */
let tally: GameTally = { handsLost: 0, minChips: 99, peeks: 0, caught: 0 }
/** the player took a card in the current hand */
let drewThisHand = false

let generation = 0
/** the opponent's remaining moves in the practice hand */
let script: Action[] = []
let feedId = 0
let aiRng = new Rng(1)
/** decides whether a peek is caught; seeded from the deal, so a recorded game stays the same game */
let peekRng = new Rng(1)
/** the current game, move by move; null for the practice hand and for games resumed from before recording */
let record: GameRecord | null = null

/** The game being played as a record that replays to the same result (see engine/replay). */
export function currentRecord(): GameRecord | null {
  return record && { config: record.config, actions: [...record.actions] }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms * tempo()))

function pauseAfter(events: GameEvent[], playerCount: number): number {
  let ms = 300
  for (const e of events) {
    switch (e.type) {
      case 'handStart':
        ms = Math.max(ms, 900 + playerCount * 320)
        break
      case 'tokenPlayed':
        ms = Math.max(ms, 2000)
        break
      case 'handsSwapped':
      case 'handRedrawn':
        ms = Math.max(ms, 2400)
        break
      case 'drew':
        ms = Math.max(ms, 750)
        break
      case 'discarded':
      case 'stood':
        ms = Math.max(ms, 650)
        break
      case 'diceChosen':
        ms = Math.max(ms, 1300)
        break
      case 'settled':
        ms = Math.max(ms, 1600)
        break
    }
  }
  return ms
}

function playSounds(events: GameEvent[], game: GameState): void {
  const dealing = events.some((e) => e.type === 'handStart')
  for (const e of events) {
    switch (e.type) {
      case 'turnStart':
        if (e.playerId === HUMAN && !dealing) sfx.turn()
        break
      case 'eliminated':
        sfx.eliminated()
        break
      case 'handStart':
        sfx.deal(game.players.filter((p) => !p.eliminated).length * 2 + 2)
        break
      case 'tokenPlayed':
        sfx.token()
        break
      case 'tokenBlocked':
        sfx.blocked()
        break
      case 'drew':
        sfx.card()
        break
      case 'discarded':
        sfx.card()
        break
      case 'stood':
        sfx.stand()
        break
      case 'chips':
        if (e.reason !== 'win' && e.reason !== 'lossInvested' && e.reason !== 'penalty') sfx.chip(Math.abs(e.delta))
        break
      case 'diceRolled':
        sfx.dice()
        break
      case 'handRedrawn':
      case 'handsSwapped':
        sfx.deal(4)
        break
      case 'showdown':
        sfx.reveal()
        break
      case 'settled': {
        const me = e.result.ranking.find((r) => r.playerId === HUMAN)
        if (!me) break
        if (me.winner) {
          if (me.score.category === 'none') sfx.win()
          else {
            sfx.sabacc()
            sfx.win()
          }
        } else sfx.lose()
        break
      }
    }
  }
}

export const useGame = create<GameStore>((set, get) => {
  /** Apply one action, publish its events, return them. */
  function step(action: Action): GameEvent[] {
    const { game, feed } = get()
    if (!game) return []
    const { state, events } = applyAction(game, action)
    record?.actions.push(action)
    publish(state, events, feed)
    return events
  }

  function publish(state: GameState, events: GameEvent[], feed: FeedItem[]): void {
    const items = events.map((event) => ({ id: ++feedId, event }))
    set({ game: state, feed: [...feed, ...items].slice(-60) })
    playSounds(events, state)
    trackStats(events)
    checkOutcome(state)
    // A new hand: fresh cards, and the table relaxes a little.
    if (events.some((e) => e.type === 'handStart')) {
      set((st) => ({ peeked: [], peekUsed: false, suspicion: Math.max(0, st.suspicion - suspicionCooldown(useCareer.getState().ship)) }))
    }

    const { session, outcome } = get()
    if (session?.tutorial) return
    if (!session || outcome) {
      dropRun()
      set({ savedRun: null })
    } else {
      saveRun(session, state)
      set({ savedRun: session.title })
    }
  }

  function trackStats(events: GameEvent[]): void {
    if (get().session?.tutorial) return
    const career = useCareer.getState()
    const game = get().game!
    tally.minChips = Math.min(tally.minChips, game.players[HUMAN].chips + game.players[HUMAN].invested)
    for (const e of events) {
      if (e.type === 'handStart') drewThisHand = false
      if (e.type === 'drew' && e.playerId === HUMAN) drewThisHand = true
      if (e.type === 'tokenPlayed' && e.playerId === HUMAN) {
        career.noteToken(e.token)
        tally.tokensPlayed = (tally.tokensPlayed ?? 0) + 1
      }
      if (e.type === 'settled') {
        const me = e.result.ranking.find((r) => r.playerId === HUMAN)
        if (!me) continue
        const hand = game.players[HUMAN].hand
        const sabacc = me.score.category !== 'none'
        if (!me.winner) tally.handsLost++
        if (me.winner && sabacc) tally.sabaccWins = (tally.sabaccWins ?? 0) + 1
        career.bumpStats({
          hands: 1,
          handsWon: me.winner ? 1 : 0,
          sabaccs: sabacc ? 1 : 0,
          pureSabaccs: me.score.category === 'pure' ? 1 : 0,
          sabaccWins: me.winner && sabacc ? 1 : 0,
          primeWins: me.winner && me.score.category === 'prime' ? 1 : 0,
          standPat: me.winner && !drewThisHand ? 1 : 0,
          impostorWins: me.winner && hand && (hand.sand.kind === 'impostor' || hand.blood.kind === 'impostor') ? 1 : 0,
        })
        career.gain((me.winner ? REP.handWon : 0) + (sabacc ? REP.sabacc : 0))
      }
    }
  }

  function checkOutcome(state: GameState): void {
    const { outcome, session } = get()
    if (outcome || !session) return
    const human = state.players[HUMAN]
    const won = state.phase === 'gameOver' && state.winner === HUMAN
    if (!won && !human.eliminated) return
    tally.runnerUp = !won && state.players.filter((p) => !p.eliminated).length === 1
    tally.finalChips = human.chips
    tally.winner = state.winner === null || state.winner === undefined ? undefined : state.winner === HUMAN ? 'you' : session.seats[state.winner]?.id
    set({ outcome: won ? 'won' : 'lost', summary: useCareer.getState().finishGame(session, won, tally) })
  }

  /** Let the AI seats and the scripted phases run until the human is needed. */
  async function pump(gen: number): Promise<void> {
    for (;;) {
      const { game, session, outcome } = get()
      if (gen !== generation || !game || !session) return
      if (outcome || game.phase === 'gameOver' || game.phase === 'handEnd') break

      if (game.phase === 'showdown') {
        const order = revealOrder(game)
        set({ revealStep: -1 })
        await wait(1300)
        for (let i = 0; i < order.length; i++) {
          if (gen !== generation) return
          const sabacc = game.result!.ranking.find((r) => r.playerId === order[i])!.score.category !== 'none'
          set({ revealStep: i })
          sfx.card()
          if (sabacc) sfx.sabacc()
          await wait(sabacc ? 1900 : 1250)
        }
        if (gen !== generation) return
        set({ revealStep: order.length })
        await wait(1100)
        if (gen !== generation) return
        const events = step({ type: 'settle' })
        set({ revealStep: null })
        await wait(pauseAfter(events, order.length))
        continue
      }

      const actor = game.players[game.current]
      if (actor.isHuman) break

      set({ thinking: actor.id })
      await wait(game.phase === 'turn' ? 750 + Math.random() * 500 : game.phase === 'discard' ? 550 : 1500)
      if (gen !== generation) return
      const profile = session.seats[actor.id]!.profile
      const action = session.tutorial ? (script.shift() ?? { type: 'stand' }) : chooseAction(get().game!, profile, aiRng)
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
    summary: null,
    revealStep: null,
    suspicion: 0,
    peeked: [],
    peekUsed: false,
    caught: 0,
    tutorialStep: 0,
    nudge: 0,
    savedRun: loadRun()?.session.title ?? null,
    tipsLeft: 0,

    takeTip() {
      const { tipsLeft } = get()
      if (tipsLeft <= 0) return false
      set({ tipsLeft: tipsLeft - 1 })
      return true
    },

    peek(target) {
      const { game, busy, peekUsed, peeked, suspicion, session, caught } = get()
      const victim = game?.players[target]
      if (!game || !session || session.tutorial || busy || peekUsed || game.phase !== 'turn' || game.current !== HUMAN || !victim?.hand) return null

      // Better tables keep a closer eye on their guests.
      const rank = session.table ? TABLES.indexOf(session.table) : 2
      const heat = suspicion + (20 + peekRng.next() * 18) * (1 + Math.max(0, rank) * 0.1)
      tally.peeks++
      useCareer.getState().bumpStats({ peeks: 1 })
      if (heat >= 100) {
        tally.caught++
        // Getting caught at a syndicate's table costs standing with it, once a game.
        const syndicate = session.table?.syndicate
        if (syndicate && tally.caught === 1) useCareer.getState().shiftStanding(syndicate, -1)
        set({ suspicion: 45, peekUsed: true, caught: caught + 1 })
        useCareer.getState().bumpStats({ caught: 1 })
        sfx.blocked()
        step({ type: 'caught', fine: 2 })
        return 'caught'
      }
      const unseen = SUITS.map((suit) => victim.hand![suit].id).filter((id) => !peeked.includes(id))
      const card = unseen[peekRng.int(unseen.length)]
      set({ suspicion: heat, peekUsed: true, peeked: card ? [...peeked, card] : peeked })
      sfx.card()
      return 'seen'
    },

    resume() {
      const run = loadRun()
      if (!run) {
        set({ savedRun: null })
        return false
      }
      const gen = ++generation
      aiRng = new Rng(randomSeed())
      record = run.record ?? null
      peekRng = new Rng(run.peekState ?? randomSeed())
      // What happened before the interruption is lost, so claim nothing special about this game.
      tally = { handsLost: 1, minChips: 99, peeks: 0, caught: 1 }
      set({ session: run.session, game: run.game, busy: true, thinking: null, feed: [], outcome: null, summary: null, revealStep: null, suspicion: 0, peeked: [], peekUsed: false , tipsLeft: tipsFor(run.session) })
      // Give the table a moment to deal the cards back in.
      void wait(pauseAfter([{ type: 'handStart', hand: run.game.handNumber, dealer: run.game.dealer }], run.game.players.length)).then(() => pump(gen))
      return true
    },

    start(session, humanTokens) {
      const gen = ++generation
      aiRng = new Rng(session.seed !== undefined ? session.seed ^ 0x5bd1e995 : randomSeed())
      tally = { handsLost: 0, minChips: session.playerChips ?? session.startingChips, peeks: 0, caught: 0, startChips: session.playerChips ?? session.startingChips }
      useCareer.getState().beginGame(session)
      const config: GameConfig = {
        seed: session.seed ?? randomSeed(),
        startingChips: session.startingChips,
        rules: session.rules,
        players: session.seats.map((c) =>
          c
            ? { name: c.name, isHuman: false, tokens: c.tokens }
            : { name: tx`Du`, isHuman: true, tokens: humanTokens, chips: session.playerChips },
        ),
      }
      record = { config, actions: [] }
      peekRng = new Rng(config.seed ^ 0x2545f491)
      const { state, events } = createGame(config)
      set({ session, busy: true, thinking: null, outcome: null, summary: null, revealStep: null, suspicion: 0, peeked: [], peekUsed: false, tipsLeft: tipsFor(session) })
      publish(state, events, [])
      void wait(pauseAfter(events, state.players.length)).then(() => pump(gen))
    },

    startTutorial() {
      const gen = ++generation
      script = tutorialScript()
      record = null
      const session: Session = { mode: 'free', table: null, title: tx`Übungstisch`, venue: 'anchor', tutorial: true, seats: [null, TUTORIAL_OPPONENT], startingChips: 5 }
      const events: GameEvent[] = [
        { type: 'handStart', hand: 1, dealer: HUMAN },
        { type: 'roundStart', round: 1 },
        { type: 'turnStart', playerId: HUMAN },
      ]
      set({ session, busy: true, thinking: null, outcome: null, summary: null, revealStep: null, suspicion: 0, peeked: [], peekUsed: false, tutorialStep: 0 })
      publish(tutorialGame(), events, [])
      void wait(pauseAfter(events, 2)).then(() => pump(gen))
    },

    tutorialNext() {
      const { tutorialStep } = get()
      if (!TUTORIAL_STEPS[tutorialStep]?.expect) set({ tutorialStep: tutorialStep + 1 })
    },

    act(action) {
      const { game, busy, session, tutorialStep, nudge } = get()
      if (!game || busy) return
      // The practice hand only accepts the move it is currently teaching.
      if (session?.tutorial && (game.phase === 'turn' || game.phase === 'discard')) {
        if (!TUTORIAL_STEPS[tutorialStep]?.expect?.(action)) {
          set({ nudge: nudge + 1 })
          return
        }
        set({ tutorialStep: tutorialStep + 1 })
      }
      const gen = generation
      set({ busy: true })
      let events: GameEvent[]
      try {
        events = step(action)
      } catch (error) {
        set({ busy: false })
        throw error
      }
      void wait(pauseAfter(events, game.players.length)).then(() => pump(gen))
    },

    forfeit() {
      const { session, outcome } = get()
      generation++
      if (session && !outcome) {
        useCareer.getState().finishGame(session, false, tally)
      }
      dropRun()
      set({ session: null, game: null, busy: false, thinking: null, feed: [], outcome: null, summary: null, revealStep: null, savedRun: null })
    },

    clear() {
      generation++
      dropRun()
      set({ session: null, game: null, busy: false, thinking: null, feed: [], outcome: null, summary: null, revealStep: null, savedRun: null })
    },
  }
})
