import { KESSEL_SECTOR } from './maps'
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

/** What is still owed on the first instalment, the one due before the Kessel Crown. */
export function instalmentDue(debt: DebtState): number {
  return Math.max(0, INSTALMENTS[0] + debt.extra - debt.paid)
}

/** What the whole debt still stands at. */
export function debtLeft(debt: DebtState): number {
  return Math.max(0, DEBT + debt.extra - debt.paid)
}

// ── Travel ────────────────────────────────────────────────────────────────────

/** Credits of fuel for each jump between two places on the sector chart. */
export const FUEL_PER_HOP = 25

/** Where on the sector chart a table is: anything on Tarsk is Tarsk. */
export function sectorPlace(tableId: string): string {
  return tableById(tableId)?.chapter === 'kessel' ? tableId : 'tarsk'
}

/** How many jumps lie between two places on the sector chart. */
export function hops(from: string, to: string): number {
  const a = sectorPlace(from)
  const b = sectorPlace(to)
  if (a === b) return 0
  const seen = new Map([[a, 0]])
  const queue = [a]
  while (queue.length) {
    const at = queue.shift()!
    for (const { from: x, to: y } of KESSEL_SECTOR.routes) {
      const next = x === at ? y : y === at ? x : null
      if (next && !seen.has(next)) {
        seen.set(next, seen.get(at)! + 1)
        if (next === b) return seen.get(next)!
        queue.push(next)
      }
    }
  }
  return 0
}

/** What a trip costs: fuel for every jump, less with a better engine. On Tarsk the speeder is free. */
export function fuelCost(from: string, to: string, engineLevel: number): number {
  return Math.round(hops(from, to) * FUEL_PER_HOP * (1 - 0.2 * engineLevel))
}
