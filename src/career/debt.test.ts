import { describe, expect, it } from 'vitest'
import { fuelCost, hops, instalmentDue, INSTALMENTS, DEBT } from './debt'
import { TABLES } from './tables'

describe('the debt', () => {
  it('is paid off in three instalments', () => {
    expect(INSTALMENTS.reduce((a, b) => a + b, 0)).toBe(DEBT)
  })

  it('grows its first instalment by what Oshi lent', () => {
    expect(instalmentDue({ paid: 0, extra: 0 })).toBe(6000)
    expect(instalmentDue({ paid: 2500, extra: 300 })).toBe(3800)
    expect(instalmentDue({ paid: 9000, extra: 0 })).toBe(0)
  })

  it('adds up the instalments act by act, less a courier’s relief', () => {
    expect(instalmentDue({ paid: 6000, extra: 0 }, 1)).toBe(12000)
    expect(instalmentDue({ paid: 6000, extra: 0 }, 1, 3000)).toBe(9000)
    expect(instalmentDue({ paid: 20000, extra: 500 }, 1)).toBe(0)
  })

  it('lets act 2 pay its instalment and the banquet from its own tables', () => {
    const tables = TABLES.filter((t) => t.chapter === 'trade' && !t.finale)
    const net = tables.reduce((sum, t) => sum + t.payout - t.buyIn, 0)
    const banquet = TABLES.find((t) => t.id === 'banquet')!
    expect(net).toBeGreaterThanOrEqual(INSTALMENTS[1] + banquet.buyIn)
  })

  it('lets act 3 pay its instalment and the residence from its own tables', () => {
    const tables = TABLES.filter((t) => t.chapter === 'core' && !t.finale)
    const net = tables.reduce((sum, t) => sum + t.payout - t.buyIn, 0)
    const residence = TABLES.find((t) => t.id === 'residence')!
    // a courier owes Oshi's relief on top, but saved it on the second instalment
    expect(net).toBeGreaterThanOrEqual(INSTALMENTS[2] + residence.buyIn)
  })

  it('can be met from the act’s own tables', () => {
    // net winnings of a first win at each table in the sector before the Crown
    const net = TABLES.filter((t) => t.chapter === 'kessel' && t.id !== 'crown').reduce((sum, t) => sum + t.payout - t.buyIn, 0)
    const crown = TABLES.find((t) => t.id === 'crown')!
    expect(net).toBeGreaterThanOrEqual(INSTALMENTS[0] + crown.buyIn)
  })
})

describe('travel', () => {
  it('costs nothing on Tarsk and fuel for every jump in the sector', () => {
    expect(hops('anchor', 'haze')).toBe(0)
    expect(hops('anchor', 'lodge')).toBe(1)
    expect(hops('lodge', 'crown')).toBe(5)
    expect(fuelCost('anchor', 'dune', 0)).toBe(0)
    expect(fuelCost('lodge', 'lump', 0)).toBe(25)
    expect(fuelCost('lodge', 'lump', 2)).toBe(15)
  })

  it('takes the long jump between the sectors', () => {
    // crown → route is one jump, then the long one, then on to the first table of Hallis
    expect(hops('crown', 'hallis1')).toBe(1 + 4 + 1)
    expect(hops('hallis1', 'banquet')).toBe(8)
    expect(hops('anchor', 'convoy')).toBe(hops('anchor', 'crown') + hops('crown', 'convoy'))
  })
})
