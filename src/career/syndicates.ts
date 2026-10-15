import { tx } from '../i18n'

/**
 * The four syndicates of the Kessel sector. Each runs some of the tables;
 * how it regards the player decides prices there and who sits at the table.
 */
export type Syndicate = 'oshi' | 'seal' | 'scrap' | 'glass'

export const SYNDICATES: Syndicate[] = ['oshi', 'seal', 'scrap', 'glass']

export interface SyndicateDef {
  id: Syndicate
  name: string
  /** what it is, in a few words */
  trade: string
  /** who it sends to sit at a table when it has turned against the player */
  enforcer: string
}

export const SYNDICATE: Record<Syndicate, SyndicateDef> = {
  oshi: { id: 'oshi', name: tx`Haus Oshi`, trade: tx`Hangars, Docks, Schuldscheine`, enforcer: 'brakk' },
  seal: { id: 'seal', name: tx`Rotes Siegel`, trade: tx`Altes Geld, saubere Casinos`, enforcer: 'dray' },
  scrap: { id: 'scrap', name: tx`Schrottkrone`, trade: tx`Schmuggler und Schrotthändler`, enforcer: 'ilsa' },
  glass: { id: 'glass', name: tx`Glasfinger`, trade: tx`Händler mit Geheimnissen`, enforcer: 'tevin' },
}

/** Standing runs from −2 (hostile) to 3 (trusted); everybody starts neutral. */
export const STANDING_MIN = -2
export const STANDING_MAX = 3

export function standingName(level: number): string {
  return [tx`feindlich`, tx`misstrauisch`, tx`neutral`, tx`bekannt`, tx`geschätzt`, tx`vertraut`][clampStanding(level) - STANDING_MIN]
}

export function clampStanding(level: number): number {
  return Math.max(STANDING_MIN, Math.min(STANDING_MAX, Math.round(level)))
}

/** What standing does at a syndicate's tables: a hostile one sends an enforcer, a friendly one pays better. */
export function standingEffects(level: number): { enforcer: boolean; payout: number; buyIn: number } {
  return {
    enforcer: level <= STANDING_MIN,
    payout: level >= 2 ? 1.1 : 1,
    buyIn: level >= STANDING_MAX ? 0.8 : 1,
  }
}
