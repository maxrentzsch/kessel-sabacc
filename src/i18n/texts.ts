import type { ChipReason, DrawSource, HandScore, Suit, TokenId } from '../engine'
import { tx } from './index'

export const SUIT_NAME: Record<Suit, string> = { sand: tx`Sand`, blood: tx`Blut` }

export const SOURCE_NAME: Record<DrawSource, string> = {
  sandDeck: tx`Sand-Stapel`,
  bloodDeck: tx`Blut-Stapel`,
  sandDiscard: tx`Sand-Ablage`,
  bloodDiscard: tx`Blut-Ablage`,
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
    name: tx`Gratiszug`,
    short: tx`Ziehen kostet in diesem Zug nichts.`,
    long: tx`Dein nächstes Ziehen in diesem Zug kostet keinen Chip.`,
  },
  refund: {
    name: tx`Rückerstattung`,
    short: tx`2 Chips aus dem Einsatz zurück.`,
    long: tx`Hol dir bis zu 2 Chips aus deinem Einsatz zurück in den Vorrat.`,
  },
  extraRefund: {
    name: tx`Große Rückerstattung`,
    short: tx`3 Chips aus dem Einsatz zurück.`,
    long: tx`Hol dir bis zu 3 Chips aus deinem Einsatz zurück in den Vorrat.`,
  },
  generalTariff: {
    name: tx`Allgemeiner Zoll`,
    short: tx`Alle Gegner zahlen 1 Chip.`,
    long: tx`Jeder Gegner muss 1 Chip aus seinem Vorrat in seinen Einsatz legen.`,
  },
  targetTariff: {
    name: tx`Gezielter Zoll`,
    short: tx`Ein Gegner zahlt 2 Chips.`,
    long: tx`Ein Gegner deiner Wahl muss 2 Chips aus seinem Vorrat in seinen Einsatz legen.`,
  },
  embargo: {
    name: tx`Embargo`,
    short: tx`Der nächste Spieler muss stehen.`,
    long: tx`Der Spieler nach dir darf in seinem nächsten Zug nicht ziehen.`,
  },
  markdown: {
    name: tx`Preissturz`,
    short: tx`Sylop zählt 0 bis zum Aufdecken.`,
    long: tx`Bis zum Aufdecken ist jeder Sylop 0 wert, statt die andere Karte zu kopieren. Nur zwei Sylops bleiben ein Pure Sabacc.`,
  },
  immunity: {
    name: tx`Immunität`,
    short: tx`Schutz vor gegnerischen Tokens.`,
    long: tx`Bis zum Aufdecken treffen dich keine Zölle, Prüfungen, Embargos, Veruntreuungen oder Kartentausch. Regeländerungen für den ganzen Tisch gelten trotzdem.`,
  },
  generalAudit: {
    name: tx`Allgemeine Prüfung`,
    short: tx`Stehende Gegner zahlen 2 Chips.`,
    long: tx`Jeder Gegner, der zuletzt gestanden hat, muss 2 Chips in seinen Einsatz legen.`,
  },
  targetAudit: {
    name: tx`Gezielte Prüfung`,
    short: tx`Ein stehender Gegner zahlt 3 Chips.`,
    long: tx`Ein Gegner deiner Wahl, der zuletzt gestanden hat, muss 3 Chips in seinen Einsatz legen.`,
  },
  majorFraud: {
    name: tx`Großbetrug`,
    short: tx`Impostor zählt 6 bis zum Aufdecken.`,
    long: tx`Bis zum Aufdecken ist jeder Impostor fest 6 wert – es wird nicht gewürfelt.`,
  },
  embezzlement: {
    name: tx`Veruntreuung`,
    short: tx`Nimm jedem Gegner 1 Chip weg.`,
    long: tx`Du nimmst jedem Gegner 1 Chip aus dem Vorrat und legst ihn in deinen eigenen.`,
  },
  cookTheBooks: {
    name: tx`Bücher frisieren`,
    short: tx`Sabacc-Rang wird umgedreht.`,
    long: tx`Bis zum Aufdecken ist die Sabacc-Rangfolge umgekehrt: 6/6 ist der beste, 1/1 der schwächste Sabacc.`,
  },
  exhaustion: {
    name: tx`Erschöpfung`,
    short: tx`Ein Gegner bekommt eine neue Hand.`,
    long: tx`Ein Gegner deiner Wahl wirft beide Karten ab und zieht zwei neue.`,
  },
  directTransaction: {
    name: tx`Direkter Handel`,
    short: tx`Tausche deine Hand mit einem Gegner.`,
    long: tx`Du tauschst deine beiden Karten mit einem Gegner deiner Wahl.`,
  },
  primeSabacc: {
    name: tx`Prime Sabacc`,
    short: tx`Würfle den besten Sabacc aus.`,
    long: tx`Wirf zwei Würfel und wähle einen Wert. Ein Sabacc mit diesem Wert schlägt bis zum Aufdecken alles außer Pure Sabacc.`,
  },
}

export function scoreLabel(score: HandScore): string {
  switch (score.category) {
    case 'pure':
      return tx`Pure Sabacc`
    case 'prime':
      return tx`Prime Sabacc ${score.sandValue}`
    case 'sabacc':
      return tx`Sabacc ${score.sandValue}`
    case 'none':
      return tx`Differenz ${score.diff}`
  }
}

export const CHIP_REASON: Record<ChipReason, string> = {
  draw: tx`Ziehen`,
  refund: tx`Rückerstattung`,
  tariff: tx`Zoll`,
  audit: tx`Prüfung`,
  embezzle: tx`Veruntreuung`,
  win: tx`Einsatz zurück`,
  lossInvested: tx`Einsatz verloren`,
  penalty: tx`Strafe`,
  fine: tx`Erwischt`,
}

export function chipsText(n: number): string {
  return n === 1 ? tx`1 Chip` : tx`${n} Chips`
}
