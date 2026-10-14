/**
 * The maps the player travels: places and the ways between them. One shape
 * for every scale – the planet the story starts on, a sector, later the
 * galaxy – drawn by the same chart.
 */

export type PlaceKind = 'planet' | 'ringed' | 'moon' | 'station' | 'crown'

export interface Place {
  /** the table that is played here */
  id: string
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

export const KESSEL_SECTOR: MapDef = {
  id: 'kessel',
  scale: 'sector',
  places: [
    { id: 'anchor', x: 66, y: 232, r: 15, kind: 'ringed', label: 'below' },
    { id: 'dune', x: 150, y: 196, r: 17, kind: 'planet', label: 'below' },
    { id: 'haze', x: 78, y: 126, r: 14, kind: 'planet', label: 'above' },
    { id: 'lodge', x: 196, y: 108, r: 12, kind: 'moon', label: 'below' },
    { id: 'salon', x: 296, y: 160, r: 15, kind: 'station', label: 'below' },
    { id: 'crown', x: 286, y: 54, r: 17, kind: 'crown', label: 'above' },
  ],
  routes: [
    { from: 'anchor', to: 'dune' },
    { from: 'dune', to: 'haze' },
    { from: 'haze', to: 'lodge' },
    { from: 'lodge', to: 'salon' },
    { from: 'salon', to: 'crown' },
  ],
}

export function placeOf(map: MapDef, id: string): Place {
  const place = map.places.find((p) => p.id === id)
  if (!place) throw new Error(`${id} is not on the map ${map.id}`)
  return place
}
