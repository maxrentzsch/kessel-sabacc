import { beforeEach, describe, expect, it } from 'vitest'
import { CHARACTERS } from '../ai/personalities'
import { JOBS } from '../career/jobs'
import { endingOpen, finalSeats } from '../career/route'
import { FIELD, tableById } from '../career/tables'
import { useCareer } from './career'
import type { Session } from './game'

const stake: Session = {
  mode: 'career',
  kind: 'stake',
  table: FIELD,
  title: FIELD.name,
  buyIn: 0,
  payout: 0,
  seats: [null, CHARACTERS.mira],
  startingChips: FIELD.chips,
}

describe('the stake game on Tarsk', () => {
  beforeEach(() => useCareer.getState().reset())

  it('opens once the last table on Tarsk is won', () => {
    const career = useCareer.getState()
    expect(career.isUnlocked(FIELD)).toBe(false)
    useCareer.setState({ tableWins: { anchor: 1, dune: 1, haze: 1 } })
    expect(useCareer.getState().isUnlocked(FIELD)).toBe(true)
  })

  it('keeps the tables out in the sector shut until the ship is won', () => {
    useCareer.setState({ tableWins: { anchor: 1, dune: 1, haze: 1 } })
    const lodge = tableById('lodge')!
    expect(useCareer.getState().isUnlocked(lodge)).toBe(false)
    const credits = useCareer.getState().credits
    const summary = useCareer.getState().finishGame(stake, true)
    expect(useCareer.getState().hasShip).toBe(true)
    expect(useCareer.getState().isUnlocked(lodge)).toBe(true)
    // the prize is the ship, not money
    expect(summary.payout).toBe(0)
    expect(useCareer.getState().credits).toBeGreaterThanOrEqual(credits)
  })

  it('leaves the ship with Mira after a lost stake game', () => {
    useCareer.getState().finishGame(stake, false)
    expect(useCareer.getState().hasShip).toBe(false)
  })
})

describe('the trade route', () => {
  const act1 = { anchor: 1, dune: 1, haze: 1, lodge: 1, lump: 1, mine: 1, salon: 1, hangar: 1 }
  const table = (id: string) => tableById(id)!
  beforeEach(() => {
    useCareer.getState().reset()
    useCareer.setState({ hasShip: true, debt: { paid: 6000, extra: 0 }, tableWins: { ...act1 } })
  })

  it('opens once the Kessel Crown is won', () => {
    expect(useCareer.getState().isUnlocked(table('hallis1'))).toBe(false)
    useCareer.setState({ tableWins: { ...act1, crown: 1 } })
    expect(useCareer.getState().isUnlocked(table('hallis1'))).toBe(true)
    expect(useCareer.getState().isUnlocked(table('convoy'))).toBe(false)
  })

  it('lets a player who knows Corellian Spike skip the learning tables', () => {
    useCareer.setState({ tableWins: { ...act1, crown: 1 }, storySeen: ['spike-known'] })
    expect(useCareer.getState().isUnlocked(table('convoy'))).toBe(true)
    expect(useCareer.getState().isUnlocked(table('swoop'))).toBe(false)
  })

  it('keeps the banquet shut until the keys and the second instalment are there', () => {
    const route = ['hallis1', 'hallis2', 'hallis3', 'convoy', 'swoop', 'barge', 'archive', 'casino']
    useCareer.setState({ tableWins: { ...act1, crown: 1, ...Object.fromEntries(route.map((id) => [id, 1])) }, storySeen: ['patron-seal', 'key-seal'] })
    const banquet = table('banquet')
    expect(useCareer.getState().isUnlocked(banquet)).toBe(false)
    // a key bought from the board
    useCareer.setState({ credits: 10000 })
    const buy = JOBS.find((j) => j.id === 'buy-key-glass')!
    expect(useCareer.getState().payJob(buy)).toBe(true)
    expect(useCareer.getState().storySeen).toContain('key-glass')
    useCareer.getState().gainKey('scrap')
    expect(useCareer.getState().isUnlocked(banquet)).toBe(false)
    useCareer.setState({ debt: { paid: 18000, extra: 0 } })
    expect(useCareer.getState().isUnlocked(banquet)).toBe(true)
  })

  it('lets a courier pay less, but wants Oshi’s freight delivered first', () => {
    const route = ['hallis1', 'hallis2', 'hallis3', 'convoy', 'swoop', 'barge', 'archive', 'casino']
    useCareer.setState({
      tableWins: { ...act1, crown: 1, ...Object.fromEntries(route.map((id) => [id, 1])) },
      storySeen: ['oshi-courier', 'key-seal', 'key-glass', 'key-scrap'],
      debt: { paid: 15000, extra: 0 },
    })
    expect(useCareer.getState().isUnlocked(table('banquet'))).toBe(false)
    useCareer.setState({ jobsDone: ['oshi-run'] })
    expect(useCareer.getState().isUnlocked(table('banquet'))).toBe(true)
  })
})

describe('the core', () => {
  const done = ['anchor', 'dune', 'haze', 'lodge', 'lump', 'mine', 'salon', 'hangar', 'crown', 'hallis1', 'hallis2', 'hallis3', 'convoy', 'swoop', 'barge', 'archive', 'casino']
  const table = (id: string) => tableById(id)!
  const core: Session = { variant: 'shift', mode: 'career', kind: 'table', table: tableById('penthouse')!, title: 'x', buyIn: 0, payout: 0, seats: [null, CHARACTERS.aldric], startingChips: 10 }
  beforeEach(() => {
    useCareer.getState().reset()
    useCareer.setState({ hasShip: true, debt: { paid: 18000, extra: 0 }, tableWins: Object.fromEntries(done.map((id) => [id, 1])) })
  })

  it('opens once the banquet is won', () => {
    expect(useCareer.getState().isUnlocked(table('level1'))).toBe(false)
    useCareer.setState({ tableWins: { ...useCareer.getState().tableWins, banquet: 1 } })
    expect(useCareer.getState().isUnlocked(table('level1'))).toBe(true)
  })

  it('keeps the residence shut until the debt is paid – or the ledger is gone', () => {
    const route = ['banquet', 'level1', 'level2', 'level3', 'penthouse', 'yacht', 'customs', 'arena']
    useCareer.setState({ tableWins: { ...useCareer.getState().tableWins, ...Object.fromEntries(route.map((id) => [id, 1])) } })
    expect(useCareer.getState().isUnlocked(table('residence'))).toBe(false)
    useCareer.setState({ storySeen: ['ledger-stolen'] })
    expect(useCareer.getState().isUnlocked(table('residence'))).toBe(true)
    useCareer.setState({ storySeen: [], debt: { paid: 40000, extra: 0 } })
    expect(useCareer.getState().isUnlocked(table('residence'))).toBe(true)
  })

  it('cools the garrison with every game in the core, and clears it for a won customs hand', () => {
    useCareer.setState({ heat: 60 })
    useCareer.getState().finishGame(core, false, { handsLost: 1, minChips: 1, peeks: 0, caught: 0 })
    expect(useCareer.getState().heat).toBe(50)
    const customs: Session = { ...core, kind: 'customs', table: null }
    useCareer.getState().finishGame(customs, true, { handsLost: 0, minChips: 1, peeks: 0, caught: 0 })
    expect(useCareer.getState().heat).toBe(0)
  })

  it('makes the ledger job wipe out the debt and turn Oshi against the player', () => {
    useCareer.setState({ standing: { oshi: 1 } })
    const yacht: Session = { ...core, table: tableById('yacht')!, job: 'ledger' }
    const summary = useCareer.getState().finishGame(yacht, true, { handsLost: 0, minChips: 5, peeks: 1, caught: 0, tokensPlayed: 0, startChips: 10, finalChips: 12 })
    expect(summary.job).toEqual({ id: 'ledger', done: true })
    expect(useCareer.getState().storySeen).toContain('ledger-stolen')
    // the first win on her yacht counts for her, the theft twice against
    expect(useCareer.getState().standing.oshi).toBe(1 + 1 - 2)
  })
})

describe('the Empty Crown', () => {
  it('opens once the residence is won', () => {
    useCareer.getState().reset()
    useCareer.setState({ hasShip: true, tableWins: { arena: 1 } })
    expect(useCareer.getState().isUnlocked(tableById('promenade')!)).toBe(false)
    useCareer.setState({ tableWins: { arena: 1, residence: 1 } })
    expect(useCareer.getState().isUnlocked(tableById('promenade')!)).toBe(true)
  })

  it('seats Oshi, Dray unless he was beaten for good, and the champion who likes the player least', () => {
    const base = { storySeen: [], debt: { paid: 0, extra: 0 }, jobsDone: [] as string[], duelWins: {} as Record<string, number> }
    expect(finalSeats({ ...base, standing: { seal: 1, glass: -1, scrap: 2 } })).toEqual(['oshi', 'dray', 'sable'])
    expect(finalSeats({ ...base, standing: { scrap: -2 }, duelWins: { casino: 1 } })).toEqual(['oshi', 'grex', 'ilsa'])
  })

  it('opens the endings to those who earned them', () => {
    const base = { jobsDone: [], standing: {} }
    expect(endingOpen('debt-free', { ...base, storySeen: [], debt: { paid: 40000, extra: 0 } })).toBe(true)
    expect(endingOpen('debt-free', { ...base, storySeen: ['ledger-stolen'], debt: { paid: 6000, extra: 0 } })).toBe(false)
    expect(endingOpen('trusted', { ...base, storySeen: ['patron-glass'], debt: { paid: 0, extra: 0 }, standing: { glass: 2 } })).toBe(true)
    expect(endingOpen('trusted', { ...base, storySeen: ['patron-glass'], debt: { paid: 0, extra: 0 }, standing: { glass: 1 } })).toBe(false)
  })
})
