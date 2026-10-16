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
  /** written next to the place, instead of the table's name where that is too long for the chart */
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
    { id: 'route', opens: 'trade', name: tx`Handelsroute`, x: 318, y: 46, r: 12, kind: 'ringed', label: 'below' },
  ],
  routes: [
    { from: 'tarsk', to: 'lodge' },
    { from: 'lodge', to: 'lump' },
    { from: 'lump', to: 'mine' },
    { from: 'mine', to: 'salon' },
    { from: 'salon', to: 'hangar' },
    { from: 'hangar', to: 'crown' },
    { from: 'crown', to: 'route' },
  ],
}

/** Act 2: the trade route, from Hallis shipyard to the merchants' banquet. */
export const TRADE_ROUTE: MapDef = {
  id: 'trade',
  scale: 'sector',
  places: [
    { id: 'kesselgate', opens: 'kessel', name: tx`Kessel`, x: 32, y: 128, r: 14, kind: 'ringed', label: 'below' },
    { id: 'hallis1', name: tx`Hallis I`, x: 74, y: 214, r: 9, kind: 'station', label: 'below' },
    { id: 'hallis2', name: tx`Hallis II`, x: 128, y: 252, r: 9, kind: 'station', label: 'below' },
    { id: 'hallis3', name: tx`Hallis III`, x: 132, y: 188, r: 9, kind: 'station', label: 'above' },
    { id: 'convoy', name: tx`Konvoi`, x: 196, y: 244, r: 10, kind: 'station', label: 'below' },
    { id: 'swoop', name: tx`Swoop-Bahn`, x: 248, y: 182, r: 14, kind: 'planet', label: 'below' },
    { id: 'barge', name: tx`Corona`, x: 164, y: 104, r: 18, kind: 'ringed', label: 'above' },
    { id: 'archive', name: tx`Archiv`, x: 252, y: 92, r: 11, kind: 'station', label: 'below' },
    { id: 'casino', name: tx`Casino`, x: 318, y: 150, r: 14, kind: 'station', label: 'below' },
    { id: 'banquet', name: tx`Bankett`, x: 310, y: 40, r: 16, kind: 'crown', label: 'below' },
    { id: 'coregate', opens: 'core', name: tx`Kern`, x: 336, y: 250, r: 13, kind: 'ringed', label: 'below' },
  ],
  routes: [
    { from: 'kesselgate', to: 'hallis1' },
    { from: 'hallis1', to: 'hallis2' },
    { from: 'hallis2', to: 'hallis3' },
    { from: 'hallis3', to: 'convoy' },
    { from: 'convoy', to: 'swoop' },
    { from: 'swoop', to: 'barge' },
    { from: 'barge', to: 'archive' },
    { from: 'archive', to: 'casino' },
    { from: 'casino', to: 'banquet' },
    { from: 'banquet', to: 'coregate' },
  ],
}

/** Act 3: Coruscant, from a gambling hall a thousand levels down to the crystal towers. */
export const CORE: MapDef = {
  id: 'core',
  scale: 'sector',
  places: [
    { id: 'tradegate', opens: 'trade', name: tx`Route`, x: 30, y: 46, r: 13, kind: 'ringed', label: 'below' },
    { id: 'level1', name: tx`1313 I`, x: 70, y: 236, r: 9, kind: 'station', label: 'below' },
    { id: 'level2', name: tx`1313 II`, x: 128, y: 262, r: 9, kind: 'station', label: 'above' },
    { id: 'level3', name: tx`1313 III`, x: 140, y: 196, r: 9, kind: 'station', label: 'above' },
    { id: 'penthouse', name: tx`Penthouse`, x: 104, y: 112, r: 12, kind: 'station', label: 'above' },
    { id: 'yacht', name: tx`Aurora`, x: 190, y: 60, r: 11, kind: 'station', label: 'below' },
    { id: 'customs', name: tx`Zollhangar`, x: 214, y: 158, r: 13, kind: 'planet', label: 'below' },
    { id: 'arena', name: tx`Arena`, x: 290, y: 226, r: 15, kind: 'planet', label: 'below' },
    { id: 'residence', name: tx`Residenz`, x: 306, y: 86, r: 16, kind: 'crown', label: 'below' },
    { id: 'stationgate', opens: 'station', name: tx`Die Krone`, x: 326, y: 254, r: 13, kind: 'ringed', label: 'below' },
  ],
  routes: [
    { from: 'tradegate', to: 'level1' },
    { from: 'level1', to: 'level2' },
    { from: 'level2', to: 'level3' },
    { from: 'level3', to: 'penthouse' },
    { from: 'penthouse', to: 'yacht' },
    { from: 'yacht', to: 'customs' },
    { from: 'customs', to: 'arena' },
    { from: 'arena', to: 'residence' },
    { from: 'residence', to: 'stationgate' },
  ],
}

/** Act 4: the Empty Crown, a casino station at the edge of the galaxy, and its tournament. */
export const STATION: MapDef = {
  id: 'station',
  scale: 'sector',
  places: [
    { id: 'corelink', opens: 'core', name: tx`Kern`, x: 34, y: 240, r: 13, kind: 'ringed', label: 'below' },
    { id: 'promenade', name: tx`Promenade`, x: 96, y: 170, r: 13, kind: 'station', label: 'below' },
    { id: 'round1', name: tx`Runde 1`, x: 150, y: 96, r: 12, kind: 'station', label: 'above' },
    { id: 'round2', name: tx`Runde 2`, x: 222, y: 150, r: 12, kind: 'station', label: 'below' },
    { id: 'round3', name: tx`Runde 3`, x: 270, y: 70, r: 12, kind: 'station', label: 'below' },
    { id: 'finaltable', name: tx`Finaltisch`, x: 300, y: 210, r: 18, kind: 'crown', label: 'below' },
  ],
  routes: [
    { from: 'corelink', to: 'promenade' },
    { from: 'promenade', to: 'round1' },
    { from: 'round1', to: 'round2' },
    { from: 'round2', to: 'round3' },
    { from: 'round3', to: 'finaltable' },
  ],
}

export const MAPS: Record<string, MapDef> = { tarsk: TARSK, kessel: KESSEL_SECTOR, trade: TRADE_ROUTE, core: CORE, station: STATION }

export function placeOf(map: MapDef, id: string): Place {
  const place = map.places.find((p) => p.id === id)
  if (!place) throw new Error(`${id} is not on the map ${map.id}`)
  return place
}
