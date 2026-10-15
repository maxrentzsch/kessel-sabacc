import { tx } from '../../i18n'
import type { ShiftEvent, ShiftScore, ShiftState, ShiftSuit, ShiftTarget } from '../../shift'
import { isYou } from '../../store/game'
import { signed } from '../spike/texts'

export const SUIT_LABEL: Record<ShiftSuit, string> = { circle: tx`Kreis`, triangle: tx`Dreieck`, square: tx`Quadrat` }

/** The target as the dice show it, in a few words. */
export const targetText = (target: ShiftTarget) => tx`Ziel ${signed(target.value)} · ${SUIT_LABEL[target.suit]}`

/** A selection against the target: its sum and how far off it is. */
export function scoreText(score: ShiftScore): string {
  return score.distance === 0 ? tx`${signed(score.total)} · Treffer` : tx`${signed(score.total)} · ${score.distance} daneben`
}

/** One line describing an event for the status line under the table. */
export function describeShift(event: ShiftEvent, game: ShiftState): string | null {
  const name = (id: number) => game.players[id].name
  const you = (id: number) => isYou(game, id)
  switch (event.type) {
    case 'handStart':
      return tx`Hand ${event.hand} – ${targetText(event.target)}`
    case 'selected':
      return you(event.playerId) ? tx`Du legst ${event.count} beiseite` : tx`${name(event.playerId)} legt ${event.count} beiseite`
    case 'shifted':
      return tx`Sabacc Shift: neue Karten`
    case 'improved':
      if (event.count === 0) return you(event.playerId) ? tx`Du lässt deine Auswahl, wie sie ist` : tx`${name(event.playerId)} lässt die Auswahl, wie sie ist`
      return you(event.playerId) ? tx`Du legst ${event.count} dazu` : tx`${name(event.playerId)} legt ${event.count} dazu`
    case 'checked':
      return you(event.playerId) ? tx`Du schiebst` : tx`${name(event.playerId)} schiebt`
    case 'bet':
      if (you(event.playerId)) return event.raise ? tx`Du erhöhst` : tx`Du setzt ${event.amount}`
      return event.raise ? tx`${name(event.playerId)} erhöht` : tx`${name(event.playerId)} setzt ${event.amount}`
    case 'called':
      return you(event.playerId) ? tx`Du gehst mit` : tx`${name(event.playerId)} geht mit`
    case 'folded':
      return you(event.playerId) ? tx`Du steigst aus` : tx`${name(event.playerId)} steigt aus`
    case 'reshuffled':
      return tx`Die Ablage wird neu gemischt`
    case 'eliminated':
      return you(event.playerId) ? tx`Du bist raus.` : tx`${name(event.playerId)} ist raus.`
    default:
      return null
  }
}

/** What an opponent just did, for the note over their head. */
export function shiftSeatNote(event: ShiftEvent, playerId: number): string | null {
  if (!('playerId' in event) || event.playerId !== playerId) return null
  switch (event.type) {
    case 'selected':
      return tx`Legt ${event.count} beiseite`
    case 'improved':
      return event.count ? tx`Legt ${event.count} dazu` : tx`Bleibt dabei`
    case 'checked':
      return tx`Schiebt`
    case 'bet':
      return event.raise ? tx`Erhöht` : tx`Setzt ${event.amount}`
    case 'called':
      return tx`Geht mit`
    case 'folded':
      return tx`Steigt aus`
    default:
      return null
  }
}
