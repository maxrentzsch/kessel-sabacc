import { beforeEach, describe, expect, it } from 'vitest'
import { CHARACTERS } from '../ai/personalities'
import { JOBS } from '../career/jobs'
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
