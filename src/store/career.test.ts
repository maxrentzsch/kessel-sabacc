import { beforeEach, describe, expect, it } from 'vitest'
import { CHARACTERS } from '../ai/personalities'
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
