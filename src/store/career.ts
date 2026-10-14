import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACHIEVEMENTS, isDone } from '../career/achievements'
import type { Progress } from '../career/achievements'
import { cosmetic, COSMETICS, DEFAULT_LOOK } from '../career/cosmetics'
import type { CosmeticKind } from '../career/cosmetics'
import { CAREER_VERSION, migrateCareer } from '../career/migrate'
import { rankOf, REP } from '../career/reputation'
import { effectsOf } from '../career/story'
import type { Animal, Choice, Scene } from '../career/story'
import { bailoutAmount, repMultiplier, SHIP_MODULES } from '../career/ship'
import { FIELD, STARTING_CREDITS, STARTING_TOKENS, TABLES } from '../career/tables'
import type { TableDef } from '../career/tables'
import { dailyReward, dayBefore, today, TOUR_ENTRY, tourPot } from '../career/tour'
import { randomSeed } from '../engine'
import type { TokenId } from '../engine'
import type { Session } from './game'
import { useToasts } from './toasts'
import { tx } from '../i18n'

/** Counters behind the profile page and the achievements. */
export type Stats = Record<string, number>

/** What happened to the player over one game, kept by the game store. */
export interface GameTally {
  handsLost: number
  /** fewest chips the player was down to */
  minChips: number
  peeks: number
  caught: number
  /** the player went out last, with only the winner still at the table */
  runnerUp?: boolean
}

export interface GameSummary {
  won: boolean
  /** credits paid out (0 on a loss or in free play) */
  payout: number
  newTokens: TokenId[]
  /** first win at this table: the next one opens and the rival wants a rematch */
  firstWin: boolean
  /** first time this table's rival was beaten in a duel */
  firstDuelWin: boolean
  /** buy-in handed back for finishing second */
  refund: number
}

interface CareerState extends Progress {
  unlockedTokens: TokenId[]
  tokensUsed: TokenId[]
  loadout: TokenId[]
  /** story beats the player has already been told */
  storySeen: string[]
  /** achievement id → when it was unlocked */
  achievements: Record<string, number>
  /** what is in use from the collection */
  look: Record<CosmeticKind, string>
  /** every table again, but nobody goes easy on you */
  legend: boolean
  /** the running tour: its seed and the tables won so far */
  tour: { seed: number; wins: number } | null
  /** the last daily hand that was played */
  daily: { date: string; won: boolean } | null
  dailyStreak: number
  /** games played when the player last made a backup code */
  backupAt: number
  /** the Sandrunner has been won in the stake game on Tarsk */
  hasShip: boolean
  /** which animal came along on the ride to the landing field */
  bix: Animal | null

  /** not saved: what the current game has earned so far */
  gameRep: number
  recent: string[]

  isUnlocked(table: TableDef): boolean
  setLoadout(tokens: TokenId[]): void
  spend(credits: number): void
  /** Call when a game starts, so its earnings can be shown afterwards. */
  beginGame(session: Session): void
  finishGame(session: Session | null, won: boolean, tally?: GameTally): GameSummary
  bumpStats(patch: Stats): void
  /** The player has just made a backup code. */
  noteBackup(): void
  noteToken(token: TokenId): void
  gain(rep: number): void
  markStory(id: string): void
  /** A scene was played to its end, with the answer the player gave if it asked for one. */
  finishScene(scene: Scene, choice?: Choice): void
  buy(id: string): boolean
  equip(id: string): void
  owns(id: string): boolean
  upgrade(moduleId: string): boolean
  setLegend(on: boolean): void
  startTour(): boolean
  /** Leave the tour and take the pot. */
  cashOut(): number
  /** Hand out credits for the cheapest table if the player cannot afford it. */
  bailOutIfBroke(): number
  reset(): void
}

const initial = () => ({
  credits: STARTING_CREDITS,
  rep: 0,
  tableWins: {} as Record<string, number>,
  duelWins: {} as Record<string, number>,
  legendWins: {} as Record<string, number>,
  unlockedTokens: [...STARTING_TOKENS],
  tokensUsed: [] as TokenId[],
  loadout: [...STARTING_TOKENS],
  owned: Object.values(DEFAULT_LOOK),
  look: { ...DEFAULT_LOOK },
  stats: {} as Stats,
  bailouts: 0,
  storySeen: [] as string[],
  achievements: {} as Record<string, number>,
  ship: {} as Record<string, number>,
  legend: false,
  tour: null as CareerState['tour'],
  tourBest: 0,
  daily: null as CareerState['daily'],
  dailyStreak: 0,
  dailyBest: 0,
  backupAt: 0,
  hasShip: false,
  bix: null as Animal | null,
  gameRep: 0,
  recent: [] as string[],
})

/** How many games may pass without a backup code before the player is reminded of one. */
export const BACKUP_EVERY = 15
/** games played when this session last reminded the player; once per stretch is enough */
let remindedAt = -Infinity

/** Ask the browser not to clear this site's storage when it runs short; quietly, and only once granted. */
function keepStorage(): void {
  try {
    void navigator.storage
      ?.persisted?.()
      .then((kept) => kept || navigator.storage.persist())
      .catch(() => {})
  } catch {
    /* no storage manager here */
  }
}

/** Finishing second pays the buy-in back wherever there is a third seat to outlast. */
export function runnerUpRefund(session: Pick<Session, 'kind' | 'seats'>): boolean {
  return session.kind === 'table' && session.seats.length >= 3
}

export const useCareer = create<CareerState>()(
  persist(
    (set, get) => {
      /**
       * Hand out everything the player has earned by now: achievements with
       * their rewards, and the pieces of the collection that come with an
       * achievement, a rank or a duel.
       */
      function settle(): void {
        const toast = useToasts.getState().push
        // An achievement may pay enough to complete another one, so go round until nothing changes.
        for (let round = 0; round < 5; round++) {
          const s = get()
          const fresh = ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && isDone(a, s))
          if (fresh.length === 0) break
          set({
            achievements: { ...s.achievements, ...Object.fromEntries(fresh.map((a) => [a.id, Date.now()])) },
            credits: s.credits + fresh.reduce((sum, a) => sum + a.credits, 0),
            rep: s.rep + fresh.reduce((sum, a) => sum + a.rep, 0),
            gameRep: s.gameRep + fresh.reduce((sum, a) => sum + a.rep, 0),
            recent: [...s.recent, ...fresh.map((a) => a.id)],
          })
          for (const a of fresh) toast({ kind: 'achievement', title: a.name, text: a.text })
        }

        const s = get()
        const level = rankOf(s.rep).level
        const earned = COSMETICS.filter((c) => {
          if (!c.earn || s.owned.includes(c.id)) return false
          const { achievement, rank, duel } = c.earn
          return (achievement && s.achievements[achievement]) || (rank && level >= rank) || (duel && s.duelWins[duel])
        })
        if (earned.length) {
          set({ owned: [...s.owned, ...earned.map((c) => c.id)] })
          for (const c of earned) toast({ kind: 'item', title: c.name, text: tx`Neu in deiner Sammlung` })
        }
      }

      return {
        ...initial(),

        isUnlocked(table) {
          const s = get()
          // The stake game waits for the last table on Tarsk; out in the sector there is no table without the ship.
          if (table.id === FIELD.id) return (s.tableWins[TABLES.filter((t) => t.chapter === 'tarsk').at(-1)!.id] ?? 0) > 0
          if (table.chapter === 'kessel' && !s.hasShip) return false
          const index = TABLES.indexOf(table)
          return index <= 0 || (s.tableWins[TABLES[index - 1].id] ?? 0) > 0
        },

        setLoadout(tokens) {
          set({ loadout: tokens })
        },

        spend(credits) {
          set((s) => ({ credits: s.credits - credits }))
        },

        beginGame(session) {
          set({ gameRep: 0, recent: [] })
          // The daily hand counts from the moment the cards are dealt, win or walk away.
          if (session.kind === 'daily') {
            const s = get()
            // Turning up is what keeps the streak going; winning is what it pays for.
            const streak = s.daily?.date === dayBefore(today()) ? s.dailyStreak + 1 : 1
            set({ daily: { date: today(), won: false }, dailyStreak: streak, dailyBest: Math.max(s.dailyBest, streak) })
          }
        },

        finishGame(session, won, tally) {
          const s = get()
          const stats = { ...s.stats }
          const bump = (key: string, by = 1) => (stats[key] = (stats[key] ?? 0) + by)
          bump('games')
          if (won) bump('wins')

          const none: GameSummary = { won, payout: 0, newTokens: [], firstWin: false, firstDuelWin: false, refund: 0 }
          if (!session) {
            set({ stats })
            return none
          }

          const kind = session.kind ?? (session.mode === 'career' ? 'table' : 'free')
          const table = session.table
          const tier = table ? TABLES.indexOf(table) + 1 : 1
          let rep = REP.game
          const summary = { ...none }
          const patch: Partial<CareerState> = {}

          if (won) {
            if (tally) {
              if (tally.handsLost === 0) bump('flawless')
              if (tally.minChips <= 1) bump('comeback')
              if (tally.peeks >= 3 && tally.caught === 0) bump('cleanPeekWins')
            }
            if (session.seats.length >= 4) bump('bigTableWins')
            summary.payout = session.payout ?? 0

            if (kind === 'table' && table) {
              const wins = session.legend ? s.legendWins : s.tableWins
              summary.firstWin = !session.legend && !wins[table.id]
              summary.newTokens = table.unlocks.filter((t) => !s.unlockedTokens.includes(t))
              const next = { ...wins, [table.id]: (wins[table.id] ?? 0) + 1 }
              if (session.legend) patch.legendWins = next
              else patch.tableWins = next
              patch.unlockedTokens = [...s.unlockedTokens, ...summary.newTokens]
              rep += REP.tableWin(tier) * (session.legend ? 1.5 : 1)
              if (session.stake === 2) bump('highWins')
              if (session.stake === 3) {
                bump('riskyWins')
                if (tier >= 5) bump('riskyTopWins')
              }
            } else if (kind === 'duel' && table) {
              summary.firstDuelWin = !s.duelWins[table.id]
              patch.duelWins = { ...s.duelWins, [table.id]: (s.duelWins[table.id] ?? 0) + 1 }
              rep += REP.duelWin(tier)
            } else if (kind === 'stake') {
              // Nothing is paid out: Mira's freighter is the prize.
              patch.hasShip = true
              rep += REP.tableWin(3)
            } else if (kind === 'tour' && s.tour) {
              const wins = s.tour.wins + 1
              patch.tour = { ...s.tour, wins }
              patch.tourBest = Math.max(s.tourBest, wins)
              rep += REP.tourStage(wins)
            } else if (kind === 'daily') {
              patch.daily = { date: today(), won: true }
              summary.payout = dailyReward(s.dailyStreak)
              bump('dailyWins')
              rep += REP.dailyWin
            } else {
              rep += REP.freeWin
            }
            stats.biggestPayout = Math.max(stats.biggestPayout ?? 0, summary.payout)
          } else if (kind === 'tour') {
            patch.tour = null
          } else if (kind === 'table' && tally?.runnerUp && runnerUpRefund(session)) {
            // Second place at a full table: the house hands the buy-in back.
            summary.refund = session.buyIn ?? 0
            bump('runnerUps')
          }

          set({ ...patch, stats, credits: s.credits + summary.payout + summary.refund })
          get().gain(rep)

          // Progress lives in this browser only: keep it there, and now and then suggest a copy.
          keepStorage()
          const games = stats.games ?? 0
          const unsaved = games - s.backupAt
          if ((unsaved >= BACKUP_EVERY || (summary.firstWin && unsaved >= 3)) && games - remindedAt >= BACKUP_EVERY) {
            remindedAt = games
            useToasts.getState().push({ kind: 'note', title: tx`Spielstand sichern`, text: tx`Dein Fortschritt liegt nur auf diesem Gerät. Im Profil machst du daraus einen Code.` })
          }
          return summary
        },

        bumpStats(patch) {
          set((s) => {
            const stats = { ...s.stats }
            for (const key of Object.keys(patch)) stats[key] = (stats[key] ?? 0) + patch[key]
            return { stats }
          })
          settle()
        },

        noteBackup() {
          set((s) => ({ backupAt: s.stats.games ?? 0 }))
        },

        noteToken(token) {
          set((s) => (s.tokensUsed.includes(token) ? s : { tokensUsed: [...s.tokensUsed, token] }))
          get().bumpStats({ tokensPlayed: 1 })
        },

        gain(rep) {
          const s = get()
          const earned = Math.round(rep * repMultiplier(s.ship))
          const before = rankOf(s.rep)
          set({ rep: s.rep + earned, gameRep: s.gameRep + earned })
          settle()
          const after = rankOf(get().rep)
          if (after.level > before.level) useToasts.getState().push({ kind: 'rank', title: tx`Rang ${after.level}: ${after.title}`, text: tx`Dein Ruf eilt dir voraus` })
        },

        markStory(id) {
          set((s) => (s.storySeen.includes(id) ? s : { storySeen: [...s.storySeen, id] }))
        },

        finishScene(scene, choice) {
          for (const effect of effectsOf(scene, choice)) {
            if ('flag' in effect) get().markStory(effect.flag)
            else if ('bix' in effect) set({ bix: effect.bix })
            else set((s) => ({ credits: s.credits + effect.credits }))
          }
          settle()
        },

        owns(id) {
          return get().owned.includes(id)
        },

        buy(id) {
          const s = get()
          const item = cosmetic(id)
          if (!item?.price || s.owned.includes(id) || s.credits < item.price) return false
          set({ credits: s.credits - item.price, owned: [...s.owned, id], look: { ...s.look, [item.kind]: id } })
          settle()
          return true
        },

        equip(id) {
          const s = get()
          const item = cosmetic(id)
          if (item && s.owned.includes(id)) set({ look: { ...s.look, [item.kind]: id } })
        },

        upgrade(moduleId) {
          const s = get()
          const module = SHIP_MODULES.find((m) => m.id === moduleId)
          const level = s.ship[moduleId] ?? 0
          const price = module?.levels[level]
          if (price === undefined || s.credits < price) return false
          set({ credits: s.credits - price, ship: { ...s.ship, [moduleId]: level + 1 } })
          settle()
          return true
        },

        setLegend(on) {
          if (!on || get().tableWins.crown) set({ legend: on })
        },

        startTour() {
          const s = get()
          if (s.tour || s.credits < TOUR_ENTRY) return false
          set({ credits: s.credits - TOUR_ENTRY, tour: { seed: randomSeed(), wins: 0 } })
          return true
        },

        cashOut() {
          const s = get()
          if (!s.tour) return 0
          const pot = tourPot(s.tour.wins)
          set({ credits: s.credits + pot, tour: null })
          settle()
          return pot
        },

        bailOutIfBroke() {
          const s = get()
          const min = TABLES[0].buyIn
          // Somebody on tour still has a pot to play for.
          if (s.credits >= min || s.tour) return 0
          const amount = bailoutAmount(s.ship, min)
          set({ credits: amount, bailouts: s.bailouts + 1 })
          settle()
          return amount
        },

        reset() {
          set(initial())
        },
      }
    },
    {
      name: 'kessel-sabacc-career',
      version: CAREER_VERSION,
      migrate: (saved, version) => migrateCareer(saved, version) as unknown as CareerState,
      partialize: ({ gameRep: _gameRep, recent: _recent, ...saved }) => saved,
      // Saves from before the collection existed lack its defaults.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<CareerState>
        return { ...current, ...s, owned: [...new Set([...Object.values(DEFAULT_LOOK), ...(s.owned ?? [])])], look: { ...DEFAULT_LOOK, ...s.look } }
      },
    },
  ),
)
