import type { Rules, TokenId } from '../engine'
import type { SpikeRules } from '../spike'
import type { Syndicate } from './syndicates'
import { tx } from '../i18n'

export interface TableDef {
  id: string
  /** on Tarsk, reached by speeder; out in the Kessel sector, which needs the ship; or on the trade route of act 2 */
  chapter: 'tarsk' | 'kessel' | 'trade'
  /** which Sabacc is played here; Kessel Sabacc when left out */
  variant?: 'spike'
  /** Corellian Spike: what this table changes about the rules */
  spikeRules?: Partial<SpikeRules>
  /** the last table of an act */
  finale?: boolean
  /** the syndicate that runs the table; standing with it counts here */
  syndicate?: Syndicate
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
  /** who welcomes the player when it is not the rival */
  host?: string
  /** what the rival (or host) says before the first game and after the first win */
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

export const STARTING_CREDITS = 150
export const STARTING_TOKENS: TokenId[] = ['freeDraw', 'refund', 'generalTariff']

export const TABLES: TableDef[] = [
  {
    id: 'anchor',
    chapter: 'tarsk',
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
    chapter: 'tarsk',
    syndicate: 'scrap',
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
    chapter: 'tarsk',
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
    outro: tx`Schnell gelernt. Und jetzt verschwinde, bevor dich hier jemand für einen Glückspilz hält.`,
  },
  {
    id: 'lodge',
    chapter: 'kessel',
    syndicate: 'glass',
    name: tx`Schmugglerloge`,
    place: tx`„Lange Nacht“, Mond Varr`,
    blurb: tx`Vier Stühle, kein Fenster, und niemand spielt sauber.`,
    buyIn: 300,
    payout: 1100,
    chips: 6,
    opponents: ['tevin', 'brakk', 'ilsa'],
    unlocks: ['targetAudit'],
    rules: { impostors: 5 },
    ruleText: tx`Fünf Impostoren pro Deck – hier würfelt jeder sein Glück selbst.`,
    rival: 'tevin',
    intro: tx`Willkommen in der Loge. Fünf Impostoren in jedem Deck. Vertrau den Würfeln – mir besser nicht.`,
    outro: tx`Na schön. Im Brocken suchen sie immer Leute, die nicht wissen, wann Schluss ist.`,
  },
  {
    id: 'lump',
    chapter: 'kessel',
    name: tx`Der Brocken`,
    place: tx`Ausgehöhlter Asteroid, Ring 3`,
    blurb: tx`Ein Casino im Fels. Die Luft ist geliehen, die Einsätze nicht.`,
    buyIn: 450,
    payout: 1600,
    chips: 7,
    opponents: ['sesk', 'lio', 'ilsa'],
    unlocks: ['cookTheBooks'],
    rules: { rounds: 4 },
    ruleText: tx`Lange Hände: vier Runden bis zum Aufdecken.`,
    rival: 'sesk',
    intro: tx`Im Brocken spielt man lang. Vier Runden. Wer zu früh steht, hat schon verloren.`,
    outro: tx`Ein Gast, der gewinnt, ist schlecht fürs Geschäft. Auf Kessel, in der Gewürzmine, spielen sie um Lohn. Versuch's da.`,
  },  {
    id: 'mine',
    chapter: 'kessel',
    syndicate: 'scrap',
    name: tx`Gewürzmine Ost`,
    place: tx`Schacht 4, Kessel`,
    blurb: tx`Nach der Schicht wird um Lohnmarken gespielt. Wer verliert, fährt morgen doppelt ein.`,
    buyIn: 650,
    payout: 2300,
    chips: 6,
    opponents: ['varra', 'tok', 'brakk'],
    unlocks: ['embezzlement'],
    rules: { sylops: 3 },
    ruleText: tx`Drei Sylops pro Deck – Glück ist hier unten so knapp wie Luft.`,
    rival: 'varra',
    intro: tx`Hier unten zählt, wer durchhält. Drei Sylops pro Deck, und keiner hilft dir, wenn du fällst.`,
    outro: tx`Du hältst durch. Das spricht sich rum – sogar bis zum Roten Siegel auf Vael.`,
  },

  {
    id: 'salon',
    chapter: 'kessel',
    syndicate: 'seal',
    name: tx`Syndikatssalon`,
    place: tx`Orbitalstation Vael`,
    blurb: tx`Samt, Messing und ein Droide, der sich nie verrechnet.`,
    buyIn: 900,
    payout: 3200,
    chips: 7,
    opponents: ['unit7', 'zula', 'dray'],
    unlocks: ['directTransaction'],
    rules: { penaltyBonus: 1 },
    ruleText: tx`Syndikatssteuer: jede verlorene Hand kostet 1 Chip extra.`,
    rival: 'unit7',
    intro: tx`Das Syndikat erhebt eine Steuer: jede verlorene Hand kostet einen Chip zusätzlich. Das ist kalkuliert.`,
    outro: tx`Ergebnis: unerwartet. Madame Oshi wurde informiert. Sie erwartet Sie in ihrem Hangar.`,
  },
  {
    id: 'hangar',
    chapter: 'kessel',
    syndicate: 'oshi',
    name: tx`Oshis Hangar`,
    place: tx`Dockring von Kessel`,
    blurb: tx`Ein Tisch zwischen gepfändeten Schiffen. Jedes davon hat einmal jemandem gehört, der hier gespielt hat.`,
    buyIn: 1200,
    payout: 4300,
    chips: 7,
    opponents: ['grex', 'dray', 'unit7'],
    unlocks: [],
    rules: { rounds: 2 },
    ruleText: tx`Kurze Hände: zwei Runden. Oshi lässt nicht lange bitten.`,
    rival: 'grex',
    intro: tx`Schau dich ruhig um. Die Schiffe hier gehörten alle mal Leuten wie dir. Zwei Runden, dann wird abgerechnet.`,
    outro: tx`Du hast gewonnen. Aber du hast auch gesehen, was in der Kiste lag. Das gefällt Oshi nicht.`,
  },
  {
    id: 'crown',
    chapter: 'kessel',
    syndicate: 'oshi',
    name: tx`Die Kessel-Krone`,
    place: tx`High-Roller-Turnier`,
    blurb: tx`Das Finale. Madame Oshi hat diesen Tisch noch nie verloren.`,
    buyIn: 1500,
    payout: 6000,
    chips: 8,
    opponents: ['ilsa', 'dray', 'oshi'],
    unlocks: ['primeSabacc'],
    rival: 'oshi',
    finale: true,
    intro: tx`Du willst deine Sperre los sein. Wie rührend. Acht Chips, keine Sonderregeln, keine Ausreden.`,
    outro: tx`… Die Sperre ist aufgehoben. Flieg, bevor ich es mir anders überlege.`,
  },
  // ── Act 2: the trade route. Corellian Spike from here on; the first three tables teach it. ──
  {
    id: 'hallis1',
    chapter: 'trade',
    variant: 'spike',
    name: tx`Kantine: Tisch eins`,
    place: tx`Werft Hallis, Kantine`,
    blurb: tx`Nur Karten, ein Topf. Wer am nächsten an null ist, gewinnt. Dessa erklärt.`,
    buyIn: 150,
    payout: 500,
    chips: 10,
    opponents: ['dessa', 'rook'],
    unlocks: [],
    spikeRules: { betting: false, dice: false, simple: true },
    ruleText: tx`Lerntisch: kein Setzen, keine Würfel, keine benannten Hände.`,
    rival: 'rook',
    host: 'dessa',
    intro: tx`Hier lernt jeder Neue. Ohne Setzen, ohne Würfel. Nur du, deine Karten und die Null.`,
    outro: tx`Nicht schlecht. Am zweiten Tisch wird gesetzt – dann wird's ernst.`,
  },
  {
    id: 'hallis2',
    chapter: 'trade',
    variant: 'spike',
    name: tx`Kantine: Tisch zwei`,
    place: tx`Werft Hallis, Kantine`,
    blurb: tx`Jetzt wird nach jeder Kartenrunde gesetzt. Wer aussteigt, verliert, was er im Topf hat.`,
    buyIn: 250,
    payout: 850,
    chips: 12,
    opponents: ['dessa', 'mags'],
    unlocks: [],
    spikeRules: { dice: false, simple: true },
    ruleText: tx`Lerntisch: mit Setzen, aber ohne Würfel und benannte Hände.`,
    rival: 'mags',
    host: 'dessa',
    intro: tx`Jetzt kostet Mut was. Nach jeder Kartenrunde wird gesetzt. Mitgehen, erhöhen – oder aussteigen.`,
    outro: tx`Du weißt, wann man aussteigt. Das können die wenigsten. Am letzten Tisch rollen die Würfel.`,
  },
  {
    id: 'hallis3',
    chapter: 'trade',
    variant: 'spike',
    name: tx`Kantine: Schichtende`,
    place: tx`Werft Hallis, Kantine`,
    blurb: tx`Das ganze Spiel: zwei Töpfe, Spike-Würfel und die benannten Hände. Danach kann dir keiner mehr was erklären.`,
    buyIn: 400,
    payout: 1400,
    chips: 14,
    opponents: ['dessa', 'rook', 'mags'],
    unlocks: [],
    rival: 'dessa',
    intro: tx`Schichtende. Jetzt spielen wir richtig: zwei Töpfe, die Würfel, und eine Null mit Namen schlägt eine ohne.`,
    outro: tx`Dann bist du so weit. Draußen auf der Route spielt keiner mehr nett.`,
  },
  {
    id: 'convoy',
    chapter: 'trade',
    variant: 'spike',
    name: tx`Konvoi „Lange Leine“`,
    place: tx`Frachtkonvoi im Korridor`,
    blurb: tx`Ein Tisch im Laderaum, der mit dem Konvoi reist. Gespielt wird zwischen zwei Sprüngen.`,
    buyIn: 600,
    payout: 2100,
    chips: 16,
    opponents: ['quill', 'ilsa', 'rook'],
    unlocks: [],
    rival: 'quill',
    intro: tx`Willkommen an Bord. Ihr Einsatz wird verbucht, Ihr Verlust ebenfalls.`,
    outro: tx`Ihr Gewinn ist verbucht. Man hat sich nach Ihnen erkundigt. Drei Syndikate, um genau zu sein.`,
  },
  {
    id: 'swoop',
    chapter: 'trade',
    variant: 'spike',
    syndicate: 'scrap',
    name: tx`Bar an der Swoop-Bahn`,
    place: tx`Rennplanet Teska`,
    blurb: tx`Unten heulen die Swoops, oben fliegen die Einsätze. Die Schrottkrone hält die Bahn.`,
    buyIn: 850,
    payout: 2900,
    chips: 18,
    opponents: ['juno', 'harl', 'ilsa'],
    unlocks: [],
    spikeRules: { anteEvery: 3 },
    ruleText: tx`Renntempo: der Grundeinsatz steigt alle drei Hände.`,
    rival: 'juno',
    intro: tx`Hier geht alles schneller. Der Grundeinsatz auch. Halt mit, oder sieh von der Tribüne zu.`,
    outro: tx`Zu schnell für mich? Das hat noch keiner geschafft. Revanche, wann immer du willst.`,
  },
  {
    id: 'barge',
    chapter: 'trade',
    variant: 'spike',
    name: tx`Gasbarke „Corona“`,
    place: tx`In den Wolken von Yavvis`,
    blurb: tx`Ein Casino, das durch die Wolken eines Gasriesen treibt. Wer zu hoch setzt, fällt tief.`,
    buyIn: 1100,
    payout: 3800,
    chips: 18,
    opponents: ['vesh', 'harl', 'tevin'],
    unlocks: [],
    spikeRules: { maxRaises: 3 },
    ruleText: tx`Hohe Wolken: dreimal erhöhen pro Setzrunde.`,
    rival: 'vesh',
    intro: tx`Willkommen an Bord der Corona. Hier darf dreimal erhöht werden. Die Luft ist dünn, die Einsätze nicht.`,
    outro: tx`Sie fallen nicht. Bemerkenswert. Die Glasfinger werden von Ihnen hören wollen.`,
  },
  {
    id: 'archive',
    chapter: 'trade',
    variant: 'spike',
    syndicate: 'glass',
    name: tx`Archiv der Glasfinger`,
    place: tx`Datenstation Mirr`,
    blurb: tx`Zwischen Regalen voller Geheimnisse wird leise gespielt. Jede Hand wird mitgeschrieben.`,
    buyIn: 1500,
    payout: 5000,
    chips: 20,
    opponents: ['sable', 'tevin', 'juno'],
    unlocks: [],
    spikeRules: { handLimit: 4 },
    ruleText: tx`Knappe Akten: höchstens vier Karten auf der Hand.`,
    rival: 'sable',
    intro: tx`Sprechen Sie leise. Mehr als vier Karten duldet das Archiv nicht. Ordnung ist alles.`,
    outro: tx`Ihre Akte wird dicker. Das Rote Siegel liest übrigens mit.`,
  },
  {
    id: 'casino',
    chapter: 'trade',
    variant: 'spike',
    syndicate: 'seal',
    name: tx`Großes Casino des Siegels`,
    place: tx`Siegelstadt, Orbitalring`,
    blurb: tx`Kristallleuchter, rote Teppiche und Einsätze, für die anderswo Schiffe den Besitzer wechseln.`,
    buyIn: 2000,
    payout: 6600,
    chips: 20,
    opponents: ['veyra', 'dray', 'vesh'],
    unlocks: [],
    spikeRules: { bets: [2, 2, 4] },
    ruleText: tx`Siegelpreise: jeder Einsatz kostet das Doppelte.`,
    rival: 'dray',
    host: 'veyra',
    intro: tx`Im Haus des Siegels setzt man doppelt. Und Dray wartet schon auf Sie – er wartet immer.`,
    outro: tx`Das Siegel ist … überrascht. Das kommt selten vor.`,
  },
  {
    id: 'banquet',
    chapter: 'trade',
    variant: 'spike',
    name: tx`Bankett der Händler`,
    place: tx`Handelsposten Ashe`,
    blurb: tx`Einmal im Jahr laden die Handelsfürsten zum Spiel. Wer hier gewinnt, bekommt, was er verlangt.`,
    buyIn: 2600,
    payout: 9000,
    chips: 20,
    opponents: ['corvin', 'veyra', 'sable'],
    unlocks: [],
    rival: 'corvin',
    finale: true,
    intro: tx`Drei Schlüssel, eine Rate, ein Platz an meiner Tafel. Sie haben sich das verdient. Jetzt beweisen Sie es.`,
    outro: tx`Der Navcomputer gehört entsperrt. Was Sie darin finden, ist Ihr Problem.`,
  },
]

/**
 * The stake game on the landing field of Tarsk: Mira's freighter against
 * 2,000 borrowed credits. Not one of the career's tables – nothing to pay,
 * nothing paid out, but a ship to win.
 */
export const FIELD: TableDef = {
  id: 'field',
  chapter: 'tarsk',
  name: tx`Das Pfandspiel`,
  place: tx`Landefeld von Tarsk, Mitternacht`,
  blurb: tx`Miras Frachter gegen 2.000 geliehene Credits. Eine Partie, und es geht um alles.`,
  buyIn: 0,
  payout: 0,
  chips: 5,
  opponents: ['mira'],
  unlocks: [],
  rival: 'mira',
  intro: tx`Ein Frachter gegen zweitausend. Eine Partie. Bist du so weit?`,
  outro: tx`Sie gehört dir. Pass gut auf sie auf.`,
}

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
