import { CORE, KESSEL_SECTOR, STATION, TRADE_ROUTE } from './maps'
import { tableById } from './tables'

/**
 * Oshi's note on the Sandrunner: one instalment per act. The act's last
 * table opens only once its instalment is paid; nothing grows while the
 * player is away.
 */
export const DEBT = 40000
export const INSTALMENTS = [6000, 12000, 22000] as const

export interface DebtState {
  /** credits paid towards the debt so far */
  paid: number
  /** what Oshi lent on top when the player was broke; due with the next instalment */
  extra: number
}

/** What Oshi takes off the second instalment for a courier; it is owed with the third instead. */
export const COURIER_RELIEF = 3000

/**
 * What is still owed on an instalment: the first is due before the Kessel
 * Crown, the second before the merchants' banquet. Everything paid counts
 * towards the earliest one; `relief` is taken off this instalment.
 */
export function instalmentDue(debt: DebtState, act = 0, relief = 0): number {
  const owed = INSTALMENTS.slice(0, act + 1).reduce((a, b) => a + b, 0) - relief
  return Math.max(0, owed + debt.extra - debt.paid)
}

/** What the whole debt still stands at. */
export function debtLeft(debt: DebtState): number {
  return Math.max(0, DEBT + debt.extra - debt.paid)
}

// ── Travel ────────────────────────────────────────────────────────────────────

/** Credits of fuel for each jump between two places on the sector chart. */
export const FUEL_PER_HOP = 25

/** The jump between the Kessel sector and the trade route counts as this many ordinary ones. */
export const SECTOR_JUMP = 4

/** Where on the charts a table is: anything on Tarsk is Tarsk on the sector chart. */
export function sectorPlace(tableId: string): string {
  return tableById(tableId)?.chapter === 'tarsk' ? 'tarsk' : tableId
}

/** Every way through space, the long jump between the two sectors included. */
const LANES: { from: string; to: string; length: number }[] = [
  ...[...KESSEL_SECTOR.routes, ...TRADE_ROUTE.routes, ...CORE.routes, ...STATION.routes].map((r) => ({ ...r, length: 1 })),
  { from: 'route', to: 'kesselgate', length: SECTOR_JUMP },
  { from: 'coregate', to: 'tradegate', length: SECTOR_JUMP },
  // the Crown lies at the edge of the galaxy: the longest jump of all
  { from: 'stationgate', to: 'corelink', length: SECTOR_JUMP * 2 },
]

/** How many jumps lie between two places, on one chart or across both. */
export function hops(from: string, to: string): number {
  const a = sectorPlace(from)
  const b = sectorPlace(to)
  if (a === b) return 0
  // the shortest way: few places, so a plain search for the nearest unvisited one will do
  const best = new Map([[a, 0]])
  const done = new Set<string>()
  for (;;) {
    let at: string | null = null
    for (const [id, d] of best) if (!done.has(id) && (at === null || d < best.get(at)!)) at = id
    if (at === null) return 0
    if (at === b) return best.get(at)!
    done.add(at)
    for (const lane of LANES) {
      const next = lane.from === at ? lane.to : lane.to === at ? lane.from : null
      if (next && best.get(at)! + lane.length < (best.get(next) ?? Infinity)) best.set(next, best.get(at)! + lane.length)
    }
  }
}

/** What a trip costs: fuel for every jump, less with a better engine. On Tarsk the speeder is free. */
export function fuelCost(from: string, to: string, engineLevel: number): number {
  return Math.round(hops(from, to) * FUEL_PER_HOP * (1 - 0.2 * engineLevel))
}
