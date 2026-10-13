/**
 * The Sandläufer: the freighter the whole career is about. Its modules are
 * what winnings are for – each has three levels, some with a small perk.
 */
export interface ShipModule {
  id: 'engine' | 'hull' | 'vault' | 'sensors' | 'lounge'
  name: string
  text: string
  /** price of each level */
  levels: number[]
  /** what each level does, if anything beyond looks */
  perks?: string[]
}

export const SHIP_MODULES: ShipModule[] = [
  {
    id: 'hull',
    name: 'Hülle',
    text: 'Rost runter, Farbe drauf.',
    levels: [400, 1500, 4000],
  },
  {
    id: 'engine',
    name: 'Triebwerk',
    text: 'Damit sie nicht nur schön aussieht.',
    levels: [500, 2000, 5000],
  },
  {
    id: 'vault',
    name: 'Bordkasse',
    text: 'Ein Notgroschen für schlechte Abende.',
    levels: [300, 1000, 3000],
    perks: ['Pleite-Hilfe: 100 Credits', 'Pleite-Hilfe: 200 Credits', 'Pleite-Hilfe: 300 Credits'],
  },
  {
    id: 'sensors',
    name: 'Sensorphalanx',
    text: 'Wer besser hinsieht, fällt weniger auf.',
    levels: [400, 1500, 4000],
    perks: ['Verdacht sinkt pro Hand um 16', 'Verdacht sinkt pro Hand um 20', 'Verdacht sinkt pro Hand um 24'],
  },
  {
    id: 'lounge',
    name: 'Lounge',
    text: 'Gäste an Bord reden über dich.',
    levels: [600, 2500, 6000],
    perks: ['+10 % Ruf', '+20 % Ruf', '+30 % Ruf'],
  },
]

type Levels = Record<string, number>

/** Credits the house lends a broke player. */
export function bailoutAmount(ship: Levels, base: number): number {
  return [base, 100, 200, 300][ship.vault ?? 0] ?? base
}

/** How much suspicion fades between hands. */
export function suspicionCooldown(ship: Levels): number {
  return 12 + (ship.sensors ?? 0) * 4
}

export function repMultiplier(ship: Levels): number {
  return 1 + (ship.lounge ?? 0) * 0.1
}
