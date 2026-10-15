import { COURIER_RELIEF, instalmentDue } from './debt'
import type { DebtState } from './debt'
import type { Syndicate } from './syndicates'
import { tx } from '../i18n'

/**
 * Act 2 in rules: the nav data of the Sandrunner is locked three times, and
 * each of the three syndicates of the trade route holds one key. The
 * merchants' banquet waits for all three, and for the second instalment.
 */
export const KEY_HOLDERS: Syndicate[] = ['seal', 'glass', 'scrap']

export const keyFlag = (syndicate: Syndicate) => `key-${syndicate}`
export const patronFlag = (syndicate: Syndicate) => `patron-${syndicate}`

export function keysHeld(flags: string[]): Syndicate[] {
  return KEY_HOLDERS.filter((s) => flags.includes(keyFlag(s)))
}

export function patronOf(flags: string[]): Syndicate | null {
  return KEY_HOLDERS.find((s) => flags.includes(patronFlag(s))) ?? null
}

/** Flying for Oshi makes the second instalment smaller, but her job has to be done first. */
export function courier(flags: string[]): boolean {
  return flags.includes('oshi-courier')
}

/** What is still owed before the banquet. */
export function secondInstalmentDue(debt: DebtState, flags: string[]): number {
  return instalmentDue(debt, 1, courier(flags) ? COURIER_RELIEF : 0)
}

export interface RouteState {
  storySeen: string[]
  debt: DebtState
  jobsDone: string[]
}

// ── Act 3 ──

/** The third instalment, due before the residence: what is left of the whole note, unless the ledger is gone. */
export function thirdInstalmentDue(debt: DebtState, flags: string[]): number {
  return flags.includes('ledger-stolen') ? 0 : instalmentDue(debt, 2)
}

/** What still stands between the player and the residence. */
export function residenceMissing(s: RouteState): string[] {
  const due = thirdInstalmentDue(s.debt, s.storySeen)
  return due > 0 ? [tx`die dritte Rate (fehlen ${due}) – oder das Schuldbuch`] : []
}

/** Everything still standing between the player and the banquet, in a few words each; empty once it may open. */
export function banquetMissing(s: RouteState): string[] {
  const missing: string[] = []
  const keys = keysHeld(s.storySeen).length
  if (keys < KEY_HOLDERS.length) missing.push(keys === 2 ? tx`noch ein Schlüssel` : tx`noch ${KEY_HOLDERS.length - keys} Schlüssel`)
  const due = secondInstalmentDue(s.debt, s.storySeen)
  if (due > 0) missing.push(tx`die zweite Rate (fehlen ${due})`)
  if (courier(s.storySeen) && !s.jobsDone.includes('oshi-run')) missing.push(tx`Oshis Fracht`)
  return missing
}
