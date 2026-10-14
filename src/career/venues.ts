import { tx } from '../i18n'
/**
 * Where a table stands. Every venue repaints the same room – wall, light,
 * floor, felt – and has its own mix of background noise.
 */
export interface Venue {
  place: string
  /** custom properties for the table scene, see Backdrop and Table styles */
  colors: Record<`--${string}`, string>
  /** background noise: how busy the room is and how loud its machinery, 1 = normal */
  sound: { crowd: number; hum: number }
}

interface Paint {
  /** wall from ceiling to floor */
  wall: [string, string, string]
  niche: [string, string]
  /** pillars, frames and silhouettes */
  trim: string
  /** glowing windows, from the centre outwards */
  pane: [string, string, string]
  door: [string, string]
  lamp: string
  floor: [string, string]
  ceiling: string
  /** haze colour as an "r g b" triplet */
  haze: string
  felt: [string, string, string]
  rim: [string, string]
}

function paint(p: Paint): Venue['colors'] {
  return {
    '--wall-a': p.wall[0],
    '--wall-b': p.wall[1],
    '--wall-c': p.wall[2],
    '--niche-a': p.niche[0],
    '--niche-b': p.niche[1],
    '--trim': p.trim,
    '--pane-a': p.pane[0],
    '--pane-b': p.pane[1],
    '--pane-c': p.pane[2],
    '--door-a': p.door[0],
    '--door-b': p.door[1],
    '--lamp': p.lamp,
    '--floor-a': p.floor[0],
    '--floor-b': p.floor[1],
    '--ceiling': p.ceiling,
    '--haze': p.haze,
    '--felt-a': p.felt[0],
    '--felt-b': p.felt[1],
    '--felt-c': p.felt[2],
    '--rim-a': p.rim[0],
    '--rim-b': p.rim[1],
  }
}

/** Keyed by career table id, so every table has its own room. */
export const VENUES: Record<string, Venue> = {
  // rust and lamp oil
  anchor: {
    place: tx`Schrottwerft Tarsk`,
    sound: { crowd: 0.8, hum: 1.2 },
    colors: paint({
      wall: ['#1d120a', '#4a2b14', '#6b3d1a'],
      niche: ['#3a2110', '#7a4a22'],
      trim: '#150d08',
      pane: ['#ffe2a8', '#f0a045', '#a85a1c'],
      door: ['#f6c680', '#c9762a'],
      lamp: '#ffd9a0',
      floor: ['#3a2412', '#0d0805'],
      ceiling: '#0f0906',
      haze: '255 180 100',
      felt: ['#88a27f', '#6f8868', '#566b50'],
      rim: ['#e6dcc5', '#cfc4a9'],
    }),
  },
  // sun through the shutters
  dune: {
    place: tx`Karawanenhof Mehr`,
    sound: { crowd: 1, hum: 0.5 },
    colors: paint({
      wall: ['#3a2a14', '#8a6430', '#b98a45'],
      niche: ['#6b4c22', '#c9a060'],
      trim: '#2a1c0c',
      pane: ['#fff6d8', '#ffd77a', '#d99a2e'],
      door: ['#fff0c0', '#e9b24c'],
      lamp: '#fff0c4',
      floor: ['#6b4c26', '#1c1308'],
      ceiling: '#20160a',
      haze: '255 225 150',
      felt: ['#9aa56e', '#7f8c58', '#636e42'],
      rim: ['#efe3c4', '#d9c9a0'],
    }),
  },
  // cold fog off the docks
  haze: {
    place: tx`Dock 9, Unterstadt`,
    sound: { crowd: 0.5, hum: 1.4 },
    colors: paint({
      wall: ['#0c1518', '#1c3a40', '#2b565c'],
      niche: ['#16292d', '#3a6b70'],
      trim: '#081012',
      pane: ['#d8fff6', '#6fd0c4', '#2a7f7a'],
      door: ['#c9f3ea', '#4aa69c'],
      lamp: '#c8f5ec',
      floor: ['#173036', '#050b0c'],
      ceiling: '#060d0f',
      haze: '140 220 210',
      felt: ['#6f8f95', '#557378', '#3e585c'],
      rim: ['#d5dcd6', '#aeb9b3'],
    }),
  },
  // a back room lit in red
  lodge: {
    place: tx`Hinterzimmer der „Lange Nacht“`,
    sound: { crowd: 0.35, hum: 0.8 },
    colors: paint({
      wall: ['#170808', '#3d1414', '#5c1f1c'],
      niche: ['#2a0d0d', '#6b2622'],
      trim: '#0e0505',
      pane: ['#ffc9a8', '#e8603c', '#8a2418'],
      door: ['#ffb38a', '#c2452a'],
      lamp: '#ffb98a',
      floor: ['#2c1010', '#0a0404'],
      ceiling: '#0c0404',
      haze: '255 120 90',
      felt: ['#7d4a45', '#643733', '#4a2623'],
      rim: ['#dccdb9', '#bfae98'],
    }),
  },
  // steel, starlight and old money
  salon: {
    place: tx`Orbitalstation Vael`,
    sound: { crowd: 0.9, hum: 1.5 },
    colors: paint({
      wall: ['#0d1118', '#232c3d', '#36435c'],
      niche: ['#1a2130', '#46587a'],
      trim: '#080a10',
      pane: ['#ffffff', '#bcd6ff', '#5a7fc2'],
      door: ['#e9f1ff', '#7f9fd6'],
      lamp: '#f6e3b0',
      floor: ['#1c2434', '#06080d'],
      ceiling: '#070910',
      haze: '170 200 255',
      felt: ['#4f6f8a', '#3d5870', '#2b4156'],
      rim: ['#e8e6e0', '#c7c4bb'],
    }),
  },
  // the landing field of Tarsk at midnight: sand, floodlights, a storm coming
  field: {
    place: tx`Landefeld von Tarsk`,
    sound: { crowd: 0.3, hum: 1.6 },
    colors: paint({
      wall: ['#0a0f16', '#1c2430', '#3a3a3c'],
      niche: ['#141a22', '#4a4438'],
      trim: '#06090d',
      pane: ['#fff4d8', '#f0b860', '#8a5a24'],
      door: ['#f6d79a', '#b8792c'],
      lamp: '#ffe2b0',
      floor: ['#3a2c1c', '#0c0905'],
      ceiling: '#05070a',
      haze: '230 190 130',
      felt: ['#6f7f86', '#58676e', '#414e54'],
      rim: ['#d8d2c4', '#b4ad9c'],
    }),
  },
  // gold leaf and crimson for the final
  crown: {
    place: tx`High-Roller-Turnier`,
    sound: { crowd: 1.5, hum: 0.6 },
    colors: paint({
      wall: ['#1c0d06', '#5a2a0c', '#8a4a12'],
      niche: ['#4a1c0a', '#b0701c'],
      trim: '#170a04',
      pane: ['#fff3c0', '#ffc23a', '#c47a10'],
      door: ['#ffe9a0', '#e39a1c'],
      lamp: '#ffe7a0',
      floor: ['#4a240c', '#120703'],
      ceiling: '#140904',
      haze: '255 200 90',
      felt: ['#8c3a3a', '#732b2c', '#571e20'],
      rim: ['#f3e2ae', '#d9bf74'],
    }),
  },
}

export function venueOf(id: string | undefined): Venue {
  return (id && VENUES[id]) || VENUES.anchor
}

export function randomVenueId(): string {
  const ids = Object.keys(VENUES)
  return ids[Math.floor(Math.random() * ids.length)]
}
