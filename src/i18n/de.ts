import type { ChipReason, DrawSource, HandScore, Suit, TokenId } from '../engine'

export const SUIT_NAME: Record<Suit, string> = { sand: 'Sand', blood: 'Blut' }

export const SOURCE_NAME: Record<DrawSource, string> = {
  sandDeck: 'Sand-Stapel',
  bloodDeck: 'Blut-Stapel',
  sandDiscard: 'Sand-Ablage',
  bloodDiscard: 'Blut-Ablage',
}

export interface TokenText {
  name: string
  /** one line for buttons and banners */
  short: string
  /** full rule text */
  long: string
}

export const TOKEN_TEXT: Record<TokenId, TokenText> = {
  freeDraw: {
    name: 'Gratiszug',
    short: 'Ziehen kostet in diesem Zug nichts.',
    long: 'Dein nächstes Ziehen in diesem Zug kostet keinen Chip.',
  },
  refund: {
    name: 'Rückerstattung',
    short: '2 Chips aus dem Einsatz zurück.',
    long: 'Hol dir bis zu 2 Chips aus deinem Einsatz zurück in den Vorrat.',
  },
  extraRefund: {
    name: 'Große Rückerstattung',
    short: '3 Chips aus dem Einsatz zurück.',
    long: 'Hol dir bis zu 3 Chips aus deinem Einsatz zurück in den Vorrat.',
  },
  generalTariff: {
    name: 'Allgemeiner Zoll',
    short: 'Alle Gegner zahlen 1 Chip.',
    long: 'Jeder Gegner muss 1 Chip aus seinem Vorrat in seinen Einsatz legen.',
  },
  targetTariff: {
    name: 'Gezielter Zoll',
    short: 'Ein Gegner zahlt 2 Chips.',
    long: 'Ein Gegner deiner Wahl muss 2 Chips aus seinem Vorrat in seinen Einsatz legen.',
  },
  embargo: {
    name: 'Embargo',
    short: 'Der nächste Spieler muss stehen.',
    long: 'Der Spieler nach dir darf in seinem nächsten Zug nicht ziehen.',
  },
  markdown: {
    name: 'Preissturz',
    short: 'Sylop zählt 0 bis zum Aufdecken.',
    long: 'Bis zum Aufdecken ist jeder Sylop 0 wert, statt die andere Karte zu kopieren. Nur zwei Sylops bleiben ein Pure Sabacc.',
  },
  immunity: {
    name: 'Immunität',
    short: 'Schutz vor gegnerischen Tokens.',
    long: 'Bis zum Aufdecken treffen dich keine Zölle, Prüfungen, Embargos, Veruntreuungen oder Kartentausch. Regeländerungen für den ganzen Tisch gelten trotzdem.',
  },
  generalAudit: {
    name: 'Allgemeine Prüfung',
    short: 'Stehende Gegner zahlen 2 Chips.',
    long: 'Jeder Gegner, der zuletzt gestanden hat, muss 2 Chips in seinen Einsatz legen.',
  },
  targetAudit: {
    name: 'Gezielte Prüfung',
    short: 'Ein stehender Gegner zahlt 3 Chips.',
    long: 'Ein Gegner deiner Wahl, der zuletzt gestanden hat, muss 3 Chips in seinen Einsatz legen.',
  },
  majorFraud: {
    name: 'Großbetrug',
    short: 'Impostor zählt 6 bis zum Aufdecken.',
    long: 'Bis zum Aufdecken ist jeder Impostor fest 6 wert – es wird nicht gewürfelt.',
  },
  embezzlement: {
    name: 'Veruntreuung',
    short: 'Nimm jedem Gegner 1 Chip weg.',
    long: 'Du nimmst jedem Gegner 1 Chip aus dem Vorrat und legst ihn in deinen eigenen.',
  },
  cookTheBooks: {
    name: 'Bücher frisieren',
    short: 'Sabacc-Rang wird umgedreht.',
    long: 'Bis zum Aufdecken ist die Sabacc-Rangfolge umgekehrt: 6/6 ist der beste, 1/1 der schwächste Sabacc.',
  },
  exhaustion: {
    name: 'Erschöpfung',
    short: 'Ein Gegner bekommt eine neue Hand.',
    long: 'Ein Gegner deiner Wahl wirft beide Karten ab und zieht zwei neue.',
  },
  directTransaction: {
    name: 'Direkter Handel',
    short: 'Tausche deine Hand mit einem Gegner.',
    long: 'Du tauschst deine beiden Karten mit einem Gegner deiner Wahl.',
  },
  primeSabacc: {
    name: 'Prime Sabacc',
    short: 'Würfle den besten Sabacc aus.',
    long: 'Wirf zwei Würfel und wähle einen Wert. Ein Sabacc mit diesem Wert schlägt bis zum Aufdecken alles außer Pure Sabacc.',
  },
}

export function scoreLabel(score: HandScore): string {
  switch (score.category) {
    case 'pure':
      return 'Pure Sabacc'
    case 'prime':
      return `Prime Sabacc ${score.sandValue}`
    case 'sabacc':
      return `Sabacc ${score.sandValue}`
    case 'none':
      return `Differenz ${score.diff}`
  }
}

export const CHIP_REASON: Record<ChipReason, string> = {
  draw: 'Ziehen',
  refund: 'Rückerstattung',
  tariff: 'Zoll',
  audit: 'Prüfung',
  embezzle: 'Veruntreuung',
  win: 'Einsatz zurück',
  lossInvested: 'Einsatz verloren',
  penalty: 'Strafe',
  fine: 'Erwischt',
}

export function chipsText(n: number): string {
  return n === 1 ? '1 Chip' : `${n} Chips`
}
