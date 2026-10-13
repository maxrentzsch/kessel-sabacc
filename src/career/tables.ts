import type { Rules, TokenId } from '../engine'

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
  { id: 'normal', name: 'Normal', text: 'Einfacher Einsatz, volle Chips.', multiplier: 1, payout: 1 },
  { id: 'high', name: 'Hoch', text: 'Doppelter Einsatz, 2,5-facher Gewinn.', multiplier: 2, payout: 2.5 },
  { id: 'risky', name: 'Riskant', text: 'Dreifacher Einsatz, vierfacher Gewinn.', multiplier: 3, payout: 4 },
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
  'Dein Frachter, die „Sandläufer“, steht als Pfand in Madame Oshis Hangar. Sie gibt ihn nur am Spieltisch zurück: Gewinn die Kessel-Krone, und das Schiff gehört wieder dir. Du hast 150 Credits, drei abgegriffene Shift-Tokens – und einen langen Weg durch sechs Spielhöllen vor dir.'

export const STARTING_CREDITS = 150
export const STARTING_TOKENS: TokenId[] = ['freeDraw', 'refund', 'generalTariff']

export const TABLES: TableDef[] = [
  {
    id: 'anchor',
    name: 'Zum Rostigen Anker',
    place: 'Schrottwerft Tarsk',
    blurb: 'Klebrige Tische, kleine Einsätze. Hier fängt jeder an.',
    buyIn: 50,
    payout: 120,
    chips: 4,
    opponents: ['pim'],
    unlocks: ['embargo', 'targetTariff'],
    rival: 'pim',
    intro: 'Neu hier? Setz dich! Wir spielen um Kleingeld – und ich verlier sowieso meistens.',
    outro: 'Du hast Talent! Im Dünenposten zahlen sie besser. Sag Brakk nur nicht, dass ich dich geschickt hab.',
  },
  {
    id: 'dune',
    name: 'Dünenposten',
    place: 'Karawanenhof Mehr',
    blurb: 'Zwei Stammgäste, die sich seit Jahren gegenseitig ausnehmen.',
    buyIn: 100,
    payout: 350,
    chips: 5,
    opponents: ['brakk', 'mira'],
    unlocks: ['immunity', 'extraRefund', 'markdown'],
    rules: { sylops: 2 },
    ruleText: 'Zwei Sylops pro Deck – mehr Sabaccs, mehr Ärger.',
    rival: 'brakk',
    intro: 'Der Schrottsammler hat von dir erzählt. Hier liegen zwei Sylops in jedem Deck. Und hier wird gezahlt, nicht gebettelt.',
    outro: 'Hmpf. Glück. Im Nebelhafen sitzt der alte Kessk – der zählt jede Karte.',
  },
  {
    id: 'haze',
    name: 'Nebelhafen',
    place: 'Dock 9, Unterstadt',
    blurb: 'Wer hier steht, wird geprüft. Wer zieht, wird beobachtet.',
    buyIn: 200,
    payout: 800,
    chips: 6,
    opponents: ['kessk', 'zula'],
    unlocks: ['generalAudit', 'majorFraud', 'exhaustion'],
    rules: { rounds: 2 },
    ruleText: 'Kurze Hände: nur zwei Runden bis zum Aufdecken.',
    rival: 'kessk',
    intro: 'Im Nebelhafen spielt man kurz. Zwei Runden, dann liegen die Karten. Denk schneller, Kind.',
    outro: 'Schnell gelernt. In der Schmugglerloge ist ein Stuhl frei. Zähl dort hinterher deine Finger nach.',
  },
  {
    id: 'lodge',
    name: 'Schmugglerloge',
    place: 'Hinterzimmer der „Lange Nacht“',
    blurb: 'Vier Stühle, kein Fenster, und niemand spielt sauber.',
    buyIn: 400,
    payout: 1600,
    chips: 6,
    opponents: ['tevin', 'brakk', 'ilsa'],
    unlocks: ['targetAudit', 'embezzlement'],
    rules: { impostors: 5 },
    ruleText: 'Fünf Impostoren pro Deck – hier würfelt jeder sein Glück selbst.',
    rival: 'tevin',
    intro: 'Willkommen in der Loge. Fünf Impostoren in jedem Deck. Vertrau den Würfeln – mir besser nicht.',
    outro: 'Na schön. Das Syndikat hat schon von dir gehört. Die laden nur einmal ein.',
  },
  {
    id: 'salon',
    name: 'Syndikatssalon',
    place: 'Orbitalstation Vael',
    blurb: 'Samt, Messing und ein Droide, der sich nie verrechnet.',
    buyIn: 800,
    payout: 3000,
    chips: 7,
    opponents: ['unit7', 'zula', 'dray'],
    unlocks: ['cookTheBooks', 'directTransaction'],
    rules: { penaltyBonus: 1 },
    ruleText: 'Syndikatssteuer: jede verlorene Hand kostet 1 Chip extra.',
    rival: 'unit7',
    intro: 'Das Syndikat erhebt eine Steuer: jede verlorene Hand kostet einen Chip zusätzlich. Das ist kalkuliert.',
    outro: 'Ergebnis: unerwartet. Madame Oshi wurde informiert. Sie erwartet Sie.',
  },
  {
    id: 'crown',
    name: 'Die Kessel-Krone',
    place: 'High-Roller-Turnier',
    blurb: 'Das Finale. Madame Oshi hat diesen Tisch noch nie verloren.',
    buyIn: 1500,
    payout: 6000,
    chips: 8,
    opponents: ['ilsa', 'dray', 'oshi'],
    unlocks: ['primeSabacc'],
    rival: 'oshi',
    intro: 'Du willst dein Schiff zurück. Wie rührend. Acht Chips, keine Sonderregeln, keine Ausreden.',
    outro: '… Die Schlüssel liegen im Hangar. Flieg, bevor ich es mir anders überlege.',
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
