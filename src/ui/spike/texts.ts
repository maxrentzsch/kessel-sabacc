import { tx } from '../../i18n'
import type { HandKind, SpikeCard, SpikeEvent, SpikeScore, SpikeState } from '../../spike'
import { isYou } from '../../store/game'

/** The hands keep their names in every language. */
const HAND_NAME: Record<Exclude<HandKind, 'nulrhek'>, string> = {
  pure: 'Pure Sabacc',
  full: 'Full Sabacc',
  fleet: 'Fleet',
  yeehaa: 'Yee-Haa',
  rhylet: 'Rhylet',
  squadron: 'Squadron',
  geewhiz: 'Gee Whiz',
  straight: 'Straight Khyron',
  banthas: 'Banthas Wild',
  ruleOfTwo: 'Rule of Two',
  sabacc: 'Sabacc',
  zero: 'Sabacc',
}

export const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0')

/** `simple`: the learning tables know no named hands, so a zero is just that. */
export function handName(score: SpikeScore, simple = false): string {
  if (simple) return score.kind === 'zero' ? tx`Null` : tx`Summe ${signed(score.total)}`
  return score.kind === 'nulrhek' ? `Nulrhek ${signed(score.total)}` : HAND_NAME[score.kind]
}

export function cardsText(cards: SpikeCard[]): string {
  return cards.map((c) => signed(c.value)).join('  ')
}

export const chipsText = (n: number) => (n === 1 ? tx`1 Chip` : tx`${n} Chips`)

/** One line describing an event for the status line under the table. */
export function describeSpike(event: SpikeEvent, game: SpikeState): string | null {
  const name = (id: number) => game.players[id].name
  const you = (id: number) => isYou(game, id)
  switch (event.type) {
    case 'handStart':
      if (event.ante <= game.rules.ante) return tx`Hand ${event.hand}`
      return game.rules.simple ? tx`Hand ${event.hand} – Grundeinsatz jetzt ${event.ante}` : tx`Hand ${event.hand} – Grundeinsatz jetzt ${event.ante} je Topf`
    case 'gained':
      if (you(event.playerId)) return event.discarded ? tx`Du wirfst ab und nimmst eine Karte` : tx`Du nimmst eine Karte`
      return event.discarded ? tx`${name(event.playerId)} wirft ab und nimmt eine Karte` : tx`${name(event.playerId)} nimmt eine Karte`
    case 'swapped':
      return you(event.playerId) ? tx`Du tauschst mit der Ablage` : tx`${name(event.playerId)} tauscht mit der Ablage`
    case 'stood':
      return you(event.playerId) ? tx`Du stehst` : tx`${name(event.playerId)} steht`
    case 'junked':
      return you(event.playerId) ? tx`Du steigst aus` : tx`${name(event.playerId)} steigt aus`
    case 'checked':
      return you(event.playerId) ? tx`Du schiebst` : tx`${name(event.playerId)} schiebt`
    case 'bet':
      if (you(event.playerId)) return event.raise ? tx`Du erhöhst` : tx`Du setzt ${event.amount}`
      return event.raise ? tx`${name(event.playerId)} erhöht` : tx`${name(event.playerId)} setzt ${event.amount}`
    case 'called':
      return you(event.playerId) ? tx`Du gehst mit` : tx`${name(event.playerId)} geht mit`
    case 'reshuffled':
      return tx`Die Ablage wird neu gemischt`
    case 'eliminated':
      return you(event.playerId) ? tx`Du bist raus.` : tx`${name(event.playerId)} ist raus.`
    default:
      return null
  }
}

/** What an opponent just did, for the note over their head. */
export function seatNote(event: SpikeEvent, playerId: number): string | null {
  if (!('playerId' in event) || event.playerId !== playerId) return null
  switch (event.type) {
    case 'gained':
      return tx`Nimmt`
    case 'swapped':
      return tx`Tauscht`
    case 'stood':
      return tx`Steht`
    case 'junked':
      return tx`Steigt aus`
    case 'checked':
      return tx`Schiebt`
    case 'bet':
      return event.raise ? tx`Erhöht` : tx`Setzt ${event.amount}`
    case 'called':
      return tx`Geht mit`
    default:
      return null
  }
}
