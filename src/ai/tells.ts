import type { Difficulty } from './policy'
import { tx } from '../i18n'

/**
 * Every character has a habit that gives their hand away: a gesture that
 * comes with a strong hand, or with a weak one. It is shown at the table,
 * never explained; the player has to work out what it means.
 */
export interface Tell {
  /** what the player sees, as an action */
  gesture: string
  /** what it usually means */
  meaning: 'strong' | 'weak'
}

export const TELLS: Record<string, Tell> = {
  pim: { gesture: tx`reibt sich das Visier`, meaning: 'strong' },
  brakk: { gesture: tx`lässt die Knöchel knacken`, meaning: 'weak' },
  mira: { gesture: tx`summt leise vor sich hin`, meaning: 'strong' },
  kessk: { gesture: tx`zählt an den Fingern ab`, meaning: 'weak' },
  zula: { gesture: tx`stempelt mit dem Finger auf den Tisch`, meaning: 'strong' },
  tevin: { gesture: tx`grinst ein bisschen zu breit`, meaning: 'weak' },
  unit7: { gesture: tx`lässt die Optik zweimal flackern`, meaning: 'strong' },
  ilsa: { gesture: tx`schiebt ihre Chips zu einem Turm`, meaning: 'strong' },
  dray: { gesture: tx`rückt seine Manschetten zurecht`, meaning: 'weak' },
  varra: { gesture: tx`klopft Staub vom Ärmel`, meaning: 'strong' },
  tok: { gesture: tx`kaut auf seiner Lohnmarke`, meaning: 'weak' },
  sesk: { gesture: tx`streicht über seine Hörner`, meaning: 'strong' },
  lio: { gesture: tx`tippt mit dem Fuß`, meaning: 'weak' },
  grex: { gesture: tx`starrt auf die Ablage`, meaning: 'weak' },
  oshi: { gesture: tx`legt die Hände zusammen`, meaning: 'strong' },
  dessa: { gesture: tx`wischt sich Öl von den Fingern`, meaning: 'strong' },
  rook: { gesture: tx`wippt mit dem Knie`, meaning: 'weak' },
  mags: { gesture: tx`legt die Karten ordentlich übereinander`, meaning: 'strong' },
  quill: { gesture: tx`richtet die Brille`, meaning: 'weak' },
  juno: { gesture: tx`trommelt einen Rennrhythmus`, meaning: 'strong' },
  harl: { gesture: tx`kaut auf dem Stift`, meaning: 'weak' },
  vesh: { gesture: tx`dreht ihren Ring`, meaning: 'strong' },
  sable: { gesture: tx`blättert in einem leeren Notizbuch`, meaning: 'weak' },
  veyra: { gesture: tx`lächelt nur mit einem Mundwinkel`, meaning: 'strong' },
  corvin: { gesture: tx`schwenkt sein Glas`, meaning: 'weak' },
  orrin: { gesture: tx`dreht einen Würfel zwischen den Fingern`, meaning: 'strong' },
}

/**
 * How often the gesture tells the truth. Easy opponents cannot hide it,
 * hard ones put it on now and then to mislead.
 */
export const HONESTY: Record<Difficulty, number> = { easy: 0.92, medium: 0.78, hard: 0.62 }

/** How often a gesture shows when the hand is what it gives away. */
export const SHOW_RATE = 0.55

/** A hand read from the inside: strong, weak or nothing worth a gesture. */
export type Strength = 'strong' | 'weak' | 'neutral'

/** Strength from the chance to win the hand. */
export function strengthOf(winChance: number): Strength {
  return winChance >= 0.6 ? 'strong' : winChance <= 0.25 ? 'weak' : 'neutral'
}

/**
 * Does the character show their tell now? An honest gesture comes with the
 * hand it belongs to; a dishonest one is put on when the hand is anything else.
 */
export function showsTell(tell: Tell, strength: Strength, difficulty: Difficulty, roll: () => number, often = 1): boolean {
  const rate = Math.min(1, SHOW_RATE * often)
  if (strength === tell.meaning) return roll() < rate * HONESTY[difficulty]
  return roll() < rate * (1 - HONESTY[difficulty])
}

/** A tell is written into the dossier once it has proved true this often. */
export const TELL_PROOF = 3

/** Did the hand that was revealed bear the gesture out? */
export function tellHeld(tell: Tell, hand: { winner: boolean; sabacc: boolean }): boolean {
  return tell.meaning === 'strong' ? hand.winner || hand.sabacc : !hand.winner && !hand.sabacc
}
