import { describe, expect, it } from 'vitest'
import { KESSEL_SECTOR } from './maps'
import type { MapDef } from './maps'
import { TABLES } from './tables'

const MAPS: MapDef[] = [KESSEL_SECTOR]

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

  it('the Kessel sector holds every career table', () => {
    expect(KESSEL_SECTOR.places.map((p) => p.id).sort()).toEqual(TABLES.map((t) => t.id).sort())
  })
})
