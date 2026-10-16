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
  // spice dust and work lamps, deep underground
  mine: {
    place: tx`Schacht 4, Kessel`,
    sound: { crowd: 0.9, hum: 1.8 },
    colors: paint({
      wall: ['#14100c', '#3a2a1c', '#5a3e26'],
      niche: ['#2a1e14', '#7a5430'],
      trim: '#0c0906',
      pane: ['#fff1c8', '#f2a24a', '#9a4e1a'],
      door: ['#ffd99a', '#c96f22'],
      lamp: '#ffd38a',
      floor: ['#2a1c10', '#080503'],
      ceiling: '#0a0705',
      haze: '230 150 80',
      felt: ['#7a6a5a', '#62554a', '#4a3f36'],
      rim: ['#d6c8b0', '#b5a68c'],
    }),
  },
  // a casino hollowed out of rock, violet lamps on bare stone
  lump: {
    place: tx`Der Brocken, Ring 3`,
    sound: { crowd: 1.3, hum: 0.9 },
    colors: paint({
      wall: ['#120c18', '#2e2238', '#4a3a56'],
      niche: ['#20182a', '#6a4a7a'],
      trim: '#0a070e',
      pane: ['#f6e0ff', '#c58ae0', '#6a3a8a'],
      door: ['#ecd0ff', '#a463c8'],
      lamp: '#f0d8ff',
      floor: ['#241a2c', '#07050a'],
      ceiling: '#08060b',
      haze: '200 160 230',
      felt: ['#5a7a8a', '#476270', '#344a56'],
      rim: ['#e2dce6', '#c2b9c8'],
    }),
  },
  // a hangar of seized ships: steel, warning lights, oil
  hangar: {
    place: tx`Dockring von Kessel`,
    sound: { crowd: 0.4, hum: 2 },
    colors: paint({
      wall: ['#0e1114', '#262c32', '#3e464e'],
      niche: ['#181d22', '#55606a'],
      trim: '#07090b',
      pane: ['#fff0e0', '#ff8a5a', '#a8341e'],
      door: ['#ffd2b8', '#d8562c'],
      lamp: '#ffe0c8',
      floor: ['#1c2024', '#050607'],
      ceiling: '#060708',
      haze: '255 150 120',
      felt: ['#6a6e72', '#55595d', '#404448'],
      rim: ['#d8d8d4', '#b6b6b0'],
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
  // ── Act 2: the trade route ──
  // a shipyard canteen: work lamps, welding glow, steel tables
  hallis: {
    place: tx`Werft Hallis, Kantine`,
    sound: { crowd: 1.1, hum: 1.6 },
    colors: paint({
      wall: ['#10141a', '#2a3440', '#45525e'],
      niche: ['#1c242c', '#5c6e7c'],
      trim: '#0a0d10',
      pane: ['#fff2d6', '#ffb35c', '#b35a1a'],
      door: ['#ffd9a8', '#e0782a'],
      lamp: '#ffe6bf',
      floor: ['#262c33', '#08090b'],
      ceiling: '#07090b',
      haze: '255 170 90',
      felt: ['#4f7a6e', '#3e6358', '#2d4b42'],
      rim: ['#d9d6cf', '#b8b3a8'],
    }),
  },
  // a cargo hold between two jumps: crates, strapping, blue hyperspace light
  convoy: {
    place: tx`Laderaum der „Lange Leine“`,
    sound: { crowd: 0.5, hum: 2 },
    colors: paint({
      wall: ['#0a0e16', '#1a2638', '#2c3e58'],
      niche: ['#141c2a', '#3e5c86'],
      trim: '#06080d',
      pane: ['#e8f4ff', '#7fb8ff', '#2a5aa8'],
      door: ['#cfe4ff', '#4a86d8'],
      lamp: '#dceaff',
      floor: ['#1a2230', '#05070a'],
      ceiling: '#05070b',
      haze: '130 180 255',
      felt: ['#6a6450', '#55503f', '#403c2f'],
      rim: ['#d6d3c8', '#b3ae9f'],
    }),
  },
  // a bar over the track: neon, exhaust and the roar from below
  swoop: {
    place: tx`Rennplanet Teska`,
    sound: { crowd: 1.6, hum: 1.3 },
    colors: paint({
      wall: ['#160a12', '#3c1430', '#5e1e4a'],
      niche: ['#2a0e22', '#8a2a6a'],
      trim: '#0c050a',
      pane: ['#ffe0f4', '#ff5ab8', '#a8186e'],
      door: ['#ffc2e6', '#e03a96'],
      lamp: '#ffd6ee',
      floor: ['#2a1022', '#090408'],
      ceiling: '#0a0408',
      haze: '255 90 180',
      felt: ['#3e6a7a', '#305563', '#22404b'],
      rim: ['#e2d8de', '#c4b6be'],
    }),
  },
  // a casino adrift in a gas giant: amber clouds through every window
  barge: {
    place: tx`In den Wolken von Yavvis`,
    sound: { crowd: 1, hum: 1.1 },
    colors: paint({
      wall: ['#1a0f06', '#4a2a10', '#7a4a1c'],
      niche: ['#33200c', '#a8682a'],
      trim: '#120a04',
      pane: ['#fff0d0', '#ffb860', '#c4661c'],
      door: ['#ffdca0', '#e88a30'],
      lamp: '#ffe8c0',
      floor: ['#3a2210', '#0e0804'],
      ceiling: '#100803',
      haze: '255 180 110',
      felt: ['#6e3a5a', '#592e49', '#432237'],
      rim: ['#ecdcc4', '#d2bea0'],
    }),
  },
  // shelves of secrets in green archive light
  archive: {
    place: tx`Datenstation Mirr`,
    sound: { crowd: 0.25, hum: 1.2 },
    colors: paint({
      wall: ['#06100c', '#12302a', '#1e4a40'],
      niche: ['#0c2018', '#2a7060'],
      trim: '#040a08',
      pane: ['#e0fff4', '#6ee0b8', '#1e8a66'],
      door: ['#c4f8e4', '#3ab890'],
      lamp: '#d4fff0',
      floor: ['#10261f', '#040907'],
      ceiling: '#040a08',
      haze: '110 230 190',
      felt: ['#5a4a6e', '#483b59', '#352b43'],
      rim: ['#d8e0dc', '#b6c2bc'],
    }),
  },
  // crystal and crimson: the Red Seal's own house
  casino: {
    place: tx`Siegelstadt, Orbitalring`,
    sound: { crowd: 1.4, hum: 0.7 },
    colors: paint({
      wall: ['#1a0608', '#4a1018', '#781a26'],
      niche: ['#300a10', '#a82a3a'],
      trim: '#120406',
      pane: ['#fff0f0', '#ff8a96', '#b01e30'],
      door: ['#ffd0d6', '#d83a4c'],
      lamp: '#fff0e6',
      floor: ['#300c12', '#0c0305'],
      ceiling: '#0e0306',
      haze: '255 110 120',
      felt: ['#1f5a4a', '#18493c', '#11382e'],
      rim: ['#f0e2c8', '#d8c49c'],
    }),
  },
  // the merchants' banquet: candlelight, silverware, a long table
  banquet: {
    place: tx`Handelsposten Ashe`,
    sound: { crowd: 1.2, hum: 0.5 },
    colors: paint({
      wall: ['#14100a', '#3a2e1a', '#5e4a28'],
      niche: ['#2a2010', '#8a6e36'],
      trim: '#0e0a06',
      pane: ['#fffbe8', '#ffe08a', '#c49a2a'],
      door: ['#fff0c0', '#e2b84a'],
      lamp: '#fff4d0',
      floor: ['#2c2212', '#0a0805'],
      ceiling: '#0c0905',
      haze: '255 220 140',
      felt: ['#2e3e6a', '#243256', '#1a2542'],
      rim: ['#f4ead2', '#dccba4'],
    }),
  },
  // ── Act 3: the core ──
  // a gambling hall a thousand levels down: neon through the smog
  level: {
    place: tx`Ebene 1313, Coruscant`,
    sound: { crowd: 1.3, hum: 1.4 },
    colors: paint({
      wall: ['#0a0c14', '#1c2236', '#2e3858'],
      niche: ['#12162a', '#3a4a8a'],
      trim: '#06070c',
      pane: ['#f0f4ff', '#8aa8ff', '#3a54c4'],
      door: ['#d4e0ff', '#5a7ae8'],
      lamp: '#e0e8ff',
      floor: ['#161a28', '#050609'],
      ceiling: '#05060a',
      haze: '140 160 255',
      felt: ['#6a4a3a', '#563c2f', '#422e24'],
      rim: ['#d8d4cc', '#b6b0a6'],
    }),
  },
  // above the clouds: white stone, gold trim, the evening sun
  penthouse: {
    place: tx`Senatsbezirk, Ebene 4000`,
    sound: { crowd: 0.6, hum: 0.5 },
    colors: paint({
      wall: ['#1a1610', '#4a4030', '#8a7a5a'],
      niche: ['#2e281e', '#b8a070'],
      trim: '#14110c',
      pane: ['#fffaf0', '#ffd9a0', '#d48a3a'],
      door: ['#fff0d4', '#e8a85a'],
      lamp: '#fff6e4',
      floor: ['#3a3226', '#0e0c08'],
      ceiling: '#100d09',
      haze: '255 220 170',
      felt: ['#3a5a7a', '#2f4a65', '#243a50'],
      rim: ['#f4ecdc', '#dccfb2'],
    }),
  },
  // an orbital yacht: violet night, the planet's lights below
  yacht: {
    place: tx`Orbitaljacht über Coruscant`,
    sound: { crowd: 1.1, hum: 0.8 },
    colors: paint({
      wall: ['#120a18', '#30183e', '#4e2a64'],
      niche: ['#1e1028', '#7a4a9a'],
      trim: '#0a050e',
      pane: ['#fbeaff', '#d08aff', '#7a2ab8'],
      door: ['#f0d4ff', '#b05ae8'],
      lamp: '#f6e4ff',
      floor: ['#24142e', '#08040a'],
      ceiling: '#09040c',
      haze: '210 140 255',
      felt: ['#2a5a5a', '#214a4a', '#183a3a'],
      rim: ['#ece2f0', '#d0c2d8'],
    }),
  },
  // the garrison's customs hangar: grey steel and white floodlight
  customs: {
    place: tx`Raumhafen Westportal`,
    sound: { crowd: 0.4, hum: 1.9 },
    colors: paint({
      wall: ['#0e1012', '#2a2e32', '#4a5056'],
      niche: ['#1a1d20', '#6a737c'],
      trim: '#08090a',
      pane: ['#ffffff', '#dfe8f0', '#8a9aa8'],
      door: ['#f0f4f8', '#a8b8c6'],
      lamp: '#f6faff',
      floor: ['#202428', '#060708'],
      ceiling: '#07080a',
      haze: '210 225 240',
      felt: ['#5a5a4a', '#4a4a3c', '#3a3a2e'],
      rim: ['#dcdcd6', '#bcbcb4'],
    }),
  },
  // an arena under spotlights, a thousand faces in the dark
  arena: {
    place: tx`Unterstadt, Sektor Null`,
    sound: { crowd: 2, hum: 1 },
    colors: paint({
      wall: ['#120806', '#3a1a0e', '#6a2e14'],
      niche: ['#24100a', '#a04a1e'],
      trim: '#0c0504',
      pane: ['#fff2e0', '#ffa860', '#c4501a'],
      door: ['#ffdcc0', '#e8743a'],
      lamp: '#fff0dc',
      floor: ['#2e140a', '#0c0503'],
      ceiling: '#0e0604',
      haze: '255 160 100',
      felt: ['#2e4a3a', '#253d30', '#1c3026'],
      rim: ['#ecdccc', '#d2bea8'],
    }),
  },
  // a crystal tower: pale blue glass and old silver
  residence: {
    place: tx`Kristallturm, oberste Ebene`,
    sound: { crowd: 0.5, hum: 0.6 },
    colors: paint({
      wall: ['#0c1218', '#22323e', '#3e5868'],
      niche: ['#16222c', '#5a8296'],
      trim: '#070a0d',
      pane: ['#f4fcff', '#b8e4f4', '#5aa0c0'],
      door: ['#e4f6ff', '#86c4de'],
      lamp: '#f0faff',
      floor: ['#1c2a34', '#06090b'],
      ceiling: '#060a0c',
      haze: '190 230 250',
      felt: ['#5a2a3a', '#4a2230', '#3a1a26'],
      rim: ['#eef2f4', '#d2dadf'],
    }),
  },
  // ── Act 4: the Empty Crown ──
  // an old casino station waking up: dust, gold and flickering lamps
  promenade: {
    place: tx`Die Leere Krone, Promenadendeck`,
    sound: { crowd: 1.2, hum: 1.3 },
    colors: paint({
      wall: ['#0e0c0a', '#2e2618', '#4e4026'],
      niche: ['#1c1810', '#7a6438'],
      trim: '#090806',
      pane: ['#fff4d8', '#e8b860', '#946a24'],
      door: ['#f4dcaa', '#c8963e'],
      lamp: '#fff0cc',
      floor: ['#221c12', '#070605'],
      ceiling: '#080706',
      haze: '230 190 120',
      felt: ['#3a4a5a', '#2e3c4a', '#232e3a'],
      rim: ['#e4dcc8', '#c8bea4'],
    }),
  },
  // the tournament hall: black marble and the Crown's own gold
  tourney: {
    place: tx`Die Leere Krone, Spielsaal`,
    sound: { crowd: 1.6, hum: 0.8 },
    colors: paint({
      wall: ['#08080a', '#1c1a22', '#34303e'],
      niche: ['#121018', '#5a4e6e'],
      trim: '#050506',
      pane: ['#fffbe8', '#ffd76a', '#b8861a'],
      door: ['#fff0b8', '#e0b23a'],
      lamp: '#fff6d4',
      floor: ['#16141a', '#040405'],
      ceiling: '#050506',
      haze: '255 215 120',
      felt: ['#6a1e2a', '#561822', '#42121a'],
      rim: ['#f0e2b8', '#d8c48a'],
    }),
  },
  // before the vault door: one lamp, cold steel, the hum of the old reactor
  finaltable: {
    place: tx`Die Leere Krone, Tresorsaal`,
    sound: { crowd: 0.3, hum: 2 },
    colors: paint({
      wall: ['#06080a', '#141c22', '#26323c'],
      niche: ['#0c1216', '#3e5462'],
      trim: '#030405',
      pane: ['#f0fbff', '#9ad8ee', '#3a8aa8'],
      door: ['#d8f2fc', '#62b2d0'],
      lamp: '#eafaff',
      floor: ['#10161a', '#030405'],
      ceiling: '#030405',
      haze: '160 220 240',
      felt: ['#2a2a2e', '#222226', '#1a1a1e'],
      rim: ['#f2e6c2', '#dac896'],
    }),
  },
}

// the three learning tables share the canteen
VENUES.hallis1 = VENUES.hallis2 = VENUES.hallis3 = VENUES.hallis
// and the three of the core the gambling hall
VENUES.level1 = VENUES.level2 = VENUES.level3 = VENUES.level
// the three rounds of the tournament its hall
VENUES.round1 = VENUES.round2 = VENUES.round3 = VENUES.tourney

export function venueOf(id: string | undefined): Venue {
  return (id && VENUES[id]) || VENUES.anchor
}

export function randomVenueId(): string {
  const ids = Object.keys(VENUES)
  return ids[Math.floor(Math.random() * ids.length)]
}
