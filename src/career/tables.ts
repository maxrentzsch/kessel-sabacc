import type { Rules, TokenId } from '../engine'
import { tx } from '../i18n'

export interface TableDef {
  id: string
  name: string
  place: string
  blurb: string
  buyIn: number
  /** credits for winning: the pot plus what the house adds for the show */
  payout: number
  chips: number
  /** character ids, see ai/personalities */
  opponents: string[]
  /** shift tokens granted for the first win here */
  unlocks: TokenId[]
  /** house rules of this table, if it does not play the standard game */
  rules?: Partial<Rules>
  /** the house rule in one line, for the player */
  ruleText?: string
  /** who holds this table – and comes back for a duel once it is won */
  rival: string
  /** what the rival says before the first game and after the first win */
  intro: string
  outro: string
}

/** How much the player puts on the line: higher stakes pay more but start with fewer chips. */
export interface Stake {
  id: string
  name: string
  text: string
  /** times the buy-in */
  multiplier: number
  /** times the winnings: more than the buy-in grows by, or the missing chips would never be worth it */
  payout: number
}

export const STAKES: Stake[] = [
  { id: 'normal', name: tx`Normal`, text: tx`Einfacher Einsatz, volle Chips.`, multiplier: 1, payout: 1 },
  { id: 'high', name: tx`Hoch`, text: tx`Doppelter Einsatz, 2,5-facher Gewinn.`, multiplier: 2, payout: 2.5 },
  { id: 'risky', name: tx`Riskant`, text: tx`Dreifacher Einsatz, vierfacher Gewinn.`, multiplier: 3, payout: 4 },
]

/**
 * Chips the player gives up for a stake. A chip weighs less the more of them
 * a table starts with, so the big tables take one more.
 */
export function stakeHandicap(stake: Stake, tableChips: number): number {
  if (stake.multiplier <= 1) return 0
  return stake.multiplier - 1 + (tableChips >= 7 ? 1 : 0)
}

export const PROLOGUE =
  tx`Dein Frachter, die „Sandläufer“, steht als Pfand in Madame Oshis Hangar. Sie gibt ihn nur am Spieltisch zurück: Gewinn die Kessel-Krone, und das Schiff gehört wieder dir. Du hast 150 Credits, drei abgegriffene Shift-Tokens – und einen langen Weg durch sechs Spielhöllen vor dir.`

export const STARTING_CREDITS = 150
export const STARTING_TOKENS: TokenId[] = ['freeDraw', 'refund', 'generalTariff']

export const TABLES: TableDef[] = [
  {
    id: 'anchor',
    name: tx`Zum Rostigen Anker`,
    place: tx`Schrottwerft Tarsk`,
    blurb: tx`Klebrige Tische, kleine Einsätze. Hier fängt jeder an.`,
    buyIn: 50,
    payout: 120,
    chips: 4,
    opponents: ['pim'],
    unlocks: ['embargo', 'targetTariff'],
    rival: 'pim',
    intro: tx`Neu hier? Setz dich! Wir spielen um Kleingeld – und ich verlier sowieso meistens.`,
    outro: tx`Du hast Talent! Im Dünenposten zahlen sie besser. Sag Brakk nur nicht, dass ich dich geschickt hab.`,
  },
  {
    id: 'dune',
    name: tx`Dünenposten`,
    place: tx`Karawanenhof Mehr`,
    blurb: tx`Zwei Stammgäste, die sich seit Jahren gegenseitig ausnehmen.`,
    buyIn: 100,
    payout: 350,
    chips: 5,
    opponents: ['brakk', 'mira'],
    unlocks: ['immunity', 'extraRefund', 'markdown'],
    rules: { sylops: 2 },
    ruleText: tx`Zwei Sylops pro Deck – mehr Sabaccs, mehr Ärger.`,
    rival: 'brakk',
    intro: tx`Der Schrottsammler hat von dir erzählt. Hier liegen zwei Sylops in jedem Deck. Und hier wird gezahlt, nicht gebettelt.`,
    outro: tx`Hmpf. Glück. Im Nebelhafen sitzt der alte Kessk – der zählt jede Karte.`,
  },
  {
    id: 'haze',
    name: tx`Nebelhafen`,
    place: tx`Dock 9, Unterstadt`,
    blurb: tx`Wer hier steht, wird geprüft. Wer zieht, wird beobachtet.`,
    buyIn: 200,
    payout: 800,
    chips: 6,
    opponents: ['kessk', 'zula'],
    unlocks: ['generalAudit', 'majorFraud', 'exhaustion'],
    rules: { rounds: 2 },
    ruleText: tx`Kurze Hände: nur zwei Runden bis zum Aufdecken.`,
    rival: 'kessk',
    intro: tx`Im Nebelhafen spielt man kurz. Zwei Runden, dann liegen die Karten. Denk schneller, Kind.`,
    outro: tx`Schnell gelernt. In der Schmugglerloge ist ein Stuhl frei. Zähl dort hinterher deine Finger nach.`,
  },
  {
    id: 'lodge',
    name: tx`Schmugglerloge`,
    place: tx`Hinterzimmer der „Lange Nacht“`,
    blurb: tx`Vier Stühle, kein Fenster, und niemand spielt sauber.`,
    buyIn: 400,
    payout: 1600,
    chips: 6,
    opponents: ['tevin', 'brakk', 'ilsa'],
    unlocks: ['targetAudit', 'embezzlement'],
    rules: { impostors: 5 },
    ruleText: tx`Fünf Impostoren pro Deck – hier würfelt jeder sein Glück selbst.`,
    rival: 'tevin',
    intro: tx`Willkommen in der Loge. Fünf Impostoren in jedem Deck. Vertrau den Würfeln – mir besser nicht.`,
    outro: tx`Na schön. Das Syndikat hat schon von dir gehört. Die laden nur einmal ein.`,
  },
  {
    id: 'salon',
    name: tx`Syndikatssalon`,
    place: tx`Orbitalstation Vael`,
    blurb: tx`Samt, Messing und ein Droide, der sich nie verrechnet.`,
    buyIn: 800,
    payout: 3000,
    chips: 7,
    opponents: ['unit7', 'zula', 'dray'],
    unlocks: ['cookTheBooks', 'directTransaction'],
    rules: { penaltyBonus: 1 },
    ruleText: tx`Syndikatssteuer: jede verlorene Hand kostet 1 Chip extra.`,
    rival: 'unit7',
    intro: tx`Das Syndikat erhebt eine Steuer: jede verlorene Hand kostet einen Chip zusätzlich. Das ist kalkuliert.`,
    outro: tx`Ergebnis: unerwartet. Madame Oshi wurde informiert. Sie erwartet Sie.`,
  },
  {
    id: 'crown',
    name: tx`Die Kessel-Krone`,
    place: tx`High-Roller-Turnier`,
    blurb: tx`Das Finale. Madame Oshi hat diesen Tisch noch nie verloren.`,
    buyIn: 1500,
    payout: 6000,
    chips: 8,
    opponents: ['ilsa', 'dray', 'oshi'],
    unlocks: ['primeSabacc'],
    rival: 'oshi',
    intro: tx`Du willst dein Schiff zurück. Wie rührend. Acht Chips, keine Sonderregeln, keine Ausreden.`,
    outro: tx`… Die Schlüssel liegen im Hangar. Flieg, bevor ich es mir anders überlege.`,
  },
]

export function tableById(id: string): TableDef | undefined {
  return TABLES.find((t) => t.id === id)
}

export function payoutFor(table: TableDef): number {
  return table.payout
}

/** A duel against the table's rival costs twice the buy-in and pays it back fourfold. */
export function duelBuyIn(table: TableDef): number {
  return table.buyIn * 2
}

export function duelPayout(table: TableDef): number {
  return table.buyIn * 4
}

/** Table that grants a given token, for "unlock at …" hints. */
export function tableUnlocking(token: TokenId): TableDef | undefined {
  return TABLES.find((t) => t.unlocks.includes(token))
}
