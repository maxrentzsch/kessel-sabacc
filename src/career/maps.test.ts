import { describe, expect, it } from 'vitest'
import { CORE, KESSEL_SECTOR, MAPS as BY_ID, TARSK, TRADE_ROUTE } from './maps'
import { FIELD, TABLES } from './tables'

const MAPS = Object.values(BY_ID)

describe('maps', () => {
  for (const map of MAPS) {
    it(`${map.id}: every way leads between places on the map`, () => {
      const ids = map.places.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const route of map.routes) {
        expect(ids, route.from).toContain(route.from)
        expect(ids, route.to).toContain(route.to)
      }
    })

    it(`${map.id}: every place can be reached from the first`, () => {
      const reached = new Set([map.places[0].id])
      for (let grew = true; grew; ) {
        grew = false
        for (const { from, to } of map.routes) {
          if (reached.has(from) !== reached.has(to)) {
            reached.add(from).add(to)
            grew = true
          }
        }
      }
      expect([...reached].sort()).toEqual(map.places.map((p) => p.id).sort())
    })

    it(`${map.id}: stays within the chart`, () => {
      for (const p of map.places) {
        expect(p.x - p.r).toBeGreaterThanOrEqual(0)
        expect(p.x + p.r).toBeLessThanOrEqual(360)
        expect(p.y - p.r).toBeGreaterThanOrEqual(0)
        expect(p.y + p.r).toBeLessThanOrEqual(290)
      }
    })
  }

  it('puts every table on the map of its chapter', () => {
    const tables = (map: typeof TARSK) => map.places.filter((p) => !p.opens).map((p) => p.id).sort()
    expect(tables(TARSK)).toEqual([...TABLES.filter((t) => t.chapter === 'tarsk').map((t) => t.id), FIELD.id].sort())
    expect(tables(KESSEL_SECTOR)).toEqual(TABLES.filter((t) => t.chapter === 'kessel').map((t) => t.id).sort())
    expect(tables(TRADE_ROUTE)).toEqual(TABLES.filter((t) => t.chapter === 'trade').map((t) => t.id).sort())
    expect(tables(CORE)).toEqual(TABLES.filter((t) => t.chapter === 'core').map((t) => t.id).sort())
  })

  it('opens only maps that exist', () => {
    for (const map of MAPS) for (const p of map.places) if (p.opens) expect(BY_ID[p.opens], p.id).toBeDefined()
  })
})
