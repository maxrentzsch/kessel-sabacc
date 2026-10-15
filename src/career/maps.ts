import { tx } from '../i18n'

/**
 * The maps the player travels: places and the ways between them. One shape
 * for every scale – the planet the story starts on, a sector, later the
 * galaxy – drawn by the same chart.
 */

/** Bodies in space, and on a planet's surface the kinds of place a track leads to. */
export type PlaceKind = 'planet' | 'ringed' | 'moon' | 'station' | 'crown' | 'yard' | 'oasis' | 'port' | 'pad'

export interface Place {
  /** the table that is played here, or the map this place opens */
  id: string
  /** a place that is a whole map of its own: tapping it opens that map */
  opens?: string
  /** written next to a place that has no table to take its name from */
  name?: string
  /** position on the chart, which is 360 × 290 units */
  x: number
  y: number
  /** size of the body drawn */
  r: number
  kind: PlaceKind
  /** where the name is written */
  label: 'above' | 'below'
}

export interface Route {
  from: string
  to: string
}

export interface MapDef {
  id: string
  scale: 'planet' | 'sector' | 'galaxy'
  places: Place[]
  /** in the order the story travels them */
  routes: Route[]
}

/** Tarsk from above: the scrapyard, the desert, the spaceport and the tracks between them. */
export const TARSK: MapDef = {
  id: 'tarsk',
  scale: 'planet',
  places: [
    { id: 'anchor', x: 70, y: 214, r: 15, kind: 'yard', label: 'below' },
    { id: 'dune', x: 196, y: 196, r: 15, kind: 'oasis', label: 'below' },
    { id: 'haze', x: 136, y: 96, r: 15, kind: 'port', label: 'above' },
    { id: 'field', x: 276, y: 74, r: 15, kind: 'pad', label: 'below' },
  ],
  routes: [
    { from: 'anchor', to: 'dune' },
    { from: 'dune', to: 'haze' },
    { from: 'haze', to: 'field' },
  ],
}

/** The Kessel sector: Tarsk, where it all began, and the tables out in space. */
export const KESSEL_SECTOR: MapDef = {
  id: 'kessel',
  scale: 'sector',
  places: [
    { id: 'tarsk', opens: 'tarsk', name: tx`Tarsk`, x: 54, y: 226, r: 17, kind: 'ringed', label: 'below' },
    { id: 'lodge', x: 108, y: 144, r: 12, kind: 'moon', label: 'above' },
    { id: 'lump', x: 172, y: 92, r: 11, kind: 'moon', label: 'above' },
    { id: 'mine', x: 196, y: 206, r: 16, kind: 'planet', label: 'below' },
    { id: 'salon', x: 306, y: 200, r: 15, kind: 'station', label: 'below' },
    { id: 'hangar', x: 302, y: 112, r: 13, kind: 'station', label: 'below' },
    { id: 'crown', x: 250, y: 42, r: 17, kind: 'crown', label: 'above' },
  ],
  routes: [
    { from: 'tarsk', to: 'lodge' },
    { from: 'lodge', to: 'lump' },
    { from: 'lump', to: 'mine' },
    { from: 'mine', to: 'salon' },
    { from: 'salon', to: 'hangar' },
    { from: 'hangar', to: 'crown' },
  ],
}

export const MAPS: Record<string, MapDef> = { tarsk: TARSK, kessel: KESSEL_SECTOR }

export function placeOf(map: MapDef, id: string): Place {
  const place = map.places.find((p) => p.id === id)
  if (!place) throw new Error(`${id} is not on the map ${map.id}`)
  return place
}
