import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, isDone } from './achievements'
import { decodeSave, encodeSave } from './backup'
import type { Progress } from './achievements'
import { COSMETICS } from './cosmetics'
import { rankOf, rankProgress, RANKS } from './reputation'
import { payoutFor, stakeHandicap, STAKES, TABLES } from './tables'
import { dailyReward, dailyStop, dayBefore, tourPot, tourStop } from './tour'

const fresh = (): Progress => ({
  credits: 150,
  rep: 0,
  tableWins: {},
  duelWins: {},
  legendWins: {},
  unlockedTokens: ['freeDraw', 'refund', 'generalTariff'],
  tokensUsed: [],
  owned: [],
  bailouts: 0,
  tourBest: 0,
  dailyBest: 0,
  ship: {},
  stats: {},
})

describe('reputation', () => {
  it('maps reputation to ranks', () => {
    expect(rankOf(0).level).toBe(1)
    expect(rankOf(159).level).toBe(2)
    expect(rankOf(160).level).toBe(3)
    expect(rankOf(999999).level).toBe(RANKS.length)
    expect(rankProgress(110).share).toBeCloseTo(0.5)
    expect(rankProgress(999999).next).toBeNull()
  })
})

describe('achievements', () => {
  it('start locked and have unique ids', () => {
    const p = fresh()
    expect(ACHIEVEMENTS.filter((a) => isDone(a, p))).toEqual([])
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('unlock from the progress they describe', () => {
    const p = fresh()
    p.stats = { wins: 1, sabaccs: 25, riskyTopWins: 1 }
    p.tableWins = { anchor: 2, dune: 1, haze: 1 }
    p.tourBest = 5
    const done = ACHIEVEMENTS.filter((a) => isDone(a, p)).map((a) => a.id)
    expect(done).toEqual(expect.arrayContaining(['firstWin', 'sabacc25', 'riskyTop', 'tables3', 'tour3', 'tour5']))
    expect(done).not.toContain('crown')
  })

  it('every earned piece of the collection points at a real achievement', () => {
    for (const c of COSMETICS) {
      if (c.earn?.achievement) expect(ACHIEVEMENTS.some((a) => a.id === c.earn!.achievement)).toBe(true)
    }
  })
})

describe('tour and daily hand', () => {
  it('builds the same stop for the same seed and stage', () => {
    expect(tourStop(42, 3)).toEqual(tourStop(42, 3))
    expect(tourStop(42, 3)).not.toEqual(tourStop(42, 4))
  })

  it('gets harder and pays more with every stop', () => {
    const hard = (stage: number) => tourStop(7, stage).opponents.filter((c) => c.profile.difficulty === 'hard').length
    expect(tourStop(7, 1).opponents).toHaveLength(1)
    expect(hard(1)).toBe(0)
    expect(hard(7)).toBe(2)
    expect(tourStop(7, 20).opponents).toHaveLength(3)
    for (let wins = 1; wins < 10; wins++) expect(tourPot(wins + 1)).toBeGreaterThan(tourPot(wins))
    expect(tourPot(0)).toBe(0)
  })

  it('deals one fixed table per day', () => {
    const a = dailyStop('2026-10-13')
    expect(a).toEqual(dailyStop('2026-10-13'))
    expect(a.seed).not.toBe(dailyStop('2026-10-14').seed)
    expect(a.tokens).toHaveLength(3)
    expect(a.opponents).toHaveLength(2)
  })

  it('knows yesterday across month ends and caps the streak bonus', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28')
    expect(dayBefore('2026-01-01')).toBe('2025-12-31')
    expect(dailyReward(3)).toBeGreaterThan(dailyReward(1))
    expect(dailyReward(30)).toBe(dailyReward(7))
  })
})

describe('table money', () => {
  it('pays every table well above its buy-in, and more the further up within an act', () => {
    // Tarsk and the Kessel sector are one climb; the trade route starts small again with its learning tables.
    const climbs = [TABLES.filter((t) => t.chapter === 'tarsk' || t.chapter === 'kessel'), TABLES.filter((t) => t.chapter === 'trade'), TABLES.filter((t) => t.chapter === 'core')]
    for (const climb of climbs) {
      climb.forEach((table, i) => {
        expect(payoutFor(table)).toBeGreaterThan(table.buyIn * 2)
        if (i > 0) {
          expect(table.buyIn).toBeGreaterThan(climb[i - 1].buyIn)
          // what a win leaves over pays for a seat at the next table
          expect(payoutFor(climb[i - 1]) - climb[i - 1].buyIn).toBeGreaterThanOrEqual(i === 1 ? table.buyIn / 2 : table.buyIn)
        }
      })
    }
  })

  it('makes a higher stake pay more than it costs, for fewer chips', () => {
    const [normal, high, risky] = STAKES
    expect(stakeHandicap(normal, 8)).toBe(0)
    expect([4, 6, 7, 8].map((chips) => stakeHandicap(high, chips))).toEqual([1, 1, 2, 2])
    expect([4, 6, 7, 8].map((chips) => stakeHandicap(risky, chips))).toEqual([2, 2, 3, 3])
    for (const stake of [high, risky]) expect(stake.payout).toBeGreaterThan(stake.multiplier)
    // nobody starts a game without a chip
    for (const table of TABLES) expect(table.chips - stakeHandicap(risky, table.chips)).toBeGreaterThanOrEqual(2)
  })
})

describe('save codes', () => {
  const save = { career: { credits: 1234, tableWins: { anchor: 2 }, look: { title: 'Glücksritter „Ω“' } } }

  it('survive being copied, wrapped and pasted', () => {
    const code = encodeSave(save)
    expect(code).toMatch(/^KS1\.[A-Za-z0-9_-]+\.[a-z0-9]{7}$/)
    expect(decodeSave(code)).toEqual({ ok: true, data: save })
    expect(decodeSave(`  ${code.slice(0, 20)}\n${code.slice(20)} `)).toEqual({ ok: true, data: save })
  })

  it('refuse a code that is cut short, mistyped or from somewhere else', () => {
    const code = encodeSave(save)
    expect(decodeSave(code.slice(0, -3))).toEqual({ ok: false, reason: 'damaged' })
    expect(decodeSave(code.replace(/\.(.)/, (_, ch) => `.${ch === 'e' ? 'f' : 'e'}`))).toEqual({ ok: false, reason: 'damaged' })
    expect(decodeSave('hallo')).toEqual({ ok: false, reason: 'format' })
    expect(decodeSave(code.replace('KS1', 'KS9'))).toEqual({ ok: false, reason: 'version' })
  })
})
