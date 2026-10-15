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
    expect(migrated).toMatchObject({ ...SAVE_1_2, storySeen: expect.any(Array) })
    expect(migrated.backupAt).toBe(0)
  })

  it('pass through unchanged when they are already current', () => {
    const current = { ...SAVE_1_2, backupAt: 12, hasShip: false, bix: 'convor', debt: { paid: 0, extra: 0 }, standing: {}, jobsDone: [], location: 'anchor' }
    expect(migrateCareer(current, CAREER_VERSION)).toEqual(current)
  })

  it('survive storage that holds nothing usable', () => {
    const empty = { backupAt: 0, hasShip: false, bix: null, storySeen: [], debt: { paid: 0, extra: 0 }, standing: {}, jobsDone: [], location: 'anchor' }
    expect(migrateCareer(null, 1)).toEqual(empty)
    expect(migrateCareer([1, 2], 1)).toEqual(empty)
  })

  it('keep a player still on Tarsk on Tarsk, without the ship', () => {
    const migrated = migrateCareer(SAVE_1_2, 1)
    expect(migrated.hasShip).toBe(false)
    expect(migrated.bix).toBeNull()
    // they have played the opening tables already, so the new opening is not told again
    expect(migrated.storySeen).toEqual(['prologue', 'prologue-tarsk'])
  })

  it('give the ship to a player who has played out in the sector', () => {
    for (const tableWins of [{ ...SAVE_1_2.tableWins, lodge: 1 }, { ...SAVE_1_2.tableWins, lodge: 1, salon: 2, crown: 1 }]) {
      const migrated = migrateCareer({ ...SAVE_1_2, tableWins }, 2)
      expect(migrated.hasShip).toBe(true)
      expect(migrated.bix).toBeNull()
    }
  })

  it('count the first instalment as paid for a player who has won the Kessel Crown', () => {
    const champion = migrateCareer({ ...SAVE_1_2, tableWins: { ...SAVE_1_2.tableWins, lodge: 1, salon: 1, crown: 1 } }, 1)
    expect(champion.debt).toEqual({ paid: 6000, extra: 0 })
    expect(champion.location).toBe('lodge')
    expect(migrateCareer(SAVE_1_2, 1).debt).toEqual({ paid: 0, extra: 0 })
  })

  it('tell a new player the new opening', () => {
    const migrated = migrateCareer({ ...SAVE_1_2, tableWins: {}, storySeen: ['prologue'] }, 2)
    expect(migrated.storySeen).toEqual(['prologue'])
    expect(migrated.hasShip).toBe(false)
  })
})
