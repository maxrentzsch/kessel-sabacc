import { describe, expect, it } from 'vitest'
import { CAREER_VERSION, migrateCareer } from './migrate'

/** What version 1.2 of the app wrote to storage for a player some way into the career. */
const SAVE_1_2 = {
  credits: 2400,
  rep: 900,
  tableWins: { anchor: 2, dune: 1, haze: 1 },
  duelWins: { anchor: 1 },
  legendWins: {},
  unlockedTokens: ['freeDraw', 'refund', 'generalTariff', 'embargo'],
  tokensUsed: ['freeDraw'],
  loadout: ['freeDraw', 'refund', 'generalTariff'],
  owned: ['back-standard', 'felt-standard'],
  look: { back: 'back-standard' },
  stats: { games: 14, wins: 6 },
  bailouts: 0,
  storySeen: ['prologue'],
  achievements: { firstWin: 1 },
  ship: { hull: 1 },
  legend: false,
  tour: { seed: 42, wins: 2 },
  tourBest: 3,
  daily: { date: '2026-10-13', won: true },
  dailyStreak: 3,
  dailyBest: 3,
}

describe('saved careers', () => {
  it('load from 1.2 with everything they had', () => {
    const migrated = migrateCareer(SAVE_1_2, 1)
    expect(migrated).toMatchObject(SAVE_1_2)
    expect(migrated.backupAt).toBe(0)
  })

  it('pass through unchanged when they are already current', () => {
    const current = { ...SAVE_1_2, backupAt: 12 }
    expect(migrateCareer(current, CAREER_VERSION)).toEqual(current)
  })

  it('survive storage that holds nothing usable', () => {
    expect(migrateCareer(null, 1)).toEqual({ backupAt: 0 })
    expect(migrateCareer([1, 2], 1)).toEqual({ backupAt: 0 })
  })
})
