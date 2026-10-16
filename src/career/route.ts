import { COURIER_RELIEF, debtLeft, instalmentDue } from './debt'
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

// ── Act 4 ──

export interface EndingState extends RouteState {
  standing: Partial<Record<Syndicate, number>>
}

/** Who has earned which ending: debt-free asks for every credit paid, a new Crown for a patron who trusts the player. */
export function endingOpen(requires: 'debt-free' | 'trusted', s: EndingState): boolean {
  if (requires === 'debt-free') return !s.storySeen.includes('ledger-stolen') && debtLeft(s.debt) === 0
  const patron = patronOf(s.storySeen)
  return !!patron && (s.standing[patron] ?? 0) >= 2
}

/** Each syndicate of the route sends its champion to the Crown. */
export const CHAMPION: Record<Syndicate, string> = { seal: 'veyra', glass: 'sable', scrap: 'ilsa', oshi: 'oshi' }

/**
 * Who sits at the final table: Madame Oshi; Dray Venn, unless he was beaten
 * for good in a duel, else Grex; and the champion of the syndicate that
 * likes the player least.
 */
export function finalSeats(s: EndingState & { duelWins: Record<string, number> }): string[] {
  const drayBeaten = (s.duelWins.casino ?? 0) > 0 || s.jobsDone.includes('steal-key-seal')
  const coldest = KEY_HOLDERS.reduce((a, b) => ((s.standing[b] ?? 0) < (s.standing[a] ?? 0) ? b : a))
  return ['oshi', drayBeaten ? 'grex' : 'dray', CHAMPION[coldest]]
}

/** After the outlaw ending a bounty hunter sits at every table of legend mode. */
export const HUNTERS = ['kael', 'nyra']
