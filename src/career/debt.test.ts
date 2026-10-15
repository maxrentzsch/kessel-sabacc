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
})
