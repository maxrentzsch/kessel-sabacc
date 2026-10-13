import { CHARACTERS } from '../ai/personalities'
import { createGame, SUITS } from '../engine'
import type { Action, Card, GameState, Suit, TokenId } from '../engine'
import { tx } from '../i18n'

/**
 * The practice hand: one fixed deal against Pim, played along a script. Every
 * step either explains something or waits for one particular move.
 */
export interface TutorialStep {
  text: string
  /** when the step is on screen */
  when: 'start' | 'turn' | 'discard'
  /** the move the player has to make; without it the step is just read and confirmed */
  expect?: (action: Action) => boolean
}

export const TUTORIAL_TOKENS: TokenId[] = ['generalTariff', 'freeDraw', 'refund']
export const TUTORIAL_OPPONENT = CHARACTERS.pim

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    when: 'start',
    text: tx`Willkommen am Übungstisch. Du hältst immer zwei Karten: eine Sand-Karte und eine Blut-Karte. Deine zeigen 5 und 2 – Differenz 3. Das Ziel ist Differenz 0: ein Sabacc.`,
  },
  {
    when: 'turn',
    text: tx`Zieh eine neue Sand-Karte: Tippe den gelben Sand-Stapel, den zweiten von links. Das kostet 1 Chip, der in deinen Einsatz wandert.`,
    expect: (a) => a.type === 'draw' && a.source === 'sandDeck',
  },
  {
    when: 'discard',
    text: tx`Eine 2! Mit deiner Blut-2 ist das ein Sabacc. Tippe die neue Karte, um sie zu behalten – die alte 5 wandert offen auf die Ablage.`,
    expect: (a) => a.type === 'discard' && a.keep === 'new',
  },
  {
    when: 'turn',
    text: tx`Sabacc 2. Pim ist stehen geblieben – das kostet nichts. Eine Hand hat drei Runden, danach decken alle auf.`,
  },
  {
    when: 'turn',
    text: tx`Shift-Tokens ändern die Regeln. Tippe unten dein Token mit den drei Pfeilen – „Allgemeiner Zoll“ – und spiele es: Pim muss einen Chip in seinen Einsatz legen.`,
    expect: (a) => a.type === 'playToken' && a.token === 'generalTariff',
  },
  {
    when: 'turn',
    text: tx`Deine Hand ist stark. Bleib stehen.`,
    expect: (a) => a.type === 'stand',
  },
  {
    when: 'turn',
    text: tx`Letzte Runde. Pim hat gezogen und damit noch einen Chip riskiert. Bleib wieder stehen – gleich wird aufgedeckt.`,
    expect: (a) => a.type === 'stand',
  },
]

export const TUTORIAL_RESULT =
  tx`Dein Sabacc gewinnt: Du bekommst deinen Einsatz zurück. Pim verliert seinen Einsatz und zahlt dazu die Differenz seiner Karten als Strafe. Wer keine Chips mehr hat, scheidet aus – wer zuletzt übrig bleibt, gewinnt die Partie.`

/** What Pim does on each of his turns. */
export function tutorialScript(): Action[] {
  return [{ type: 'stand' }, { type: 'draw', source: 'bloodDeck' }, { type: 'discard', keep: 'new' }, { type: 'stand' }]
}

/** Deal the practice hand: the same cards every time, the player opens. */
export function tutorialGame(): GameState {
  const { state } = createGame({
    seed: 1,
    startingChips: 5,
    players: [
      { name: tx`Du`, isHuman: true, tokens: TUTORIAL_TOKENS },
      { name: TUTORIAL_OPPONENT.name, isHuman: false, tokens: [] },
    ],
  })
  state.dealer = 0
  state.current = 0

  // Rearrange each suit so the right cards are in the right places.
  const plan: Record<Suit, { mine: number; theirs: number; discard: number; top: number }> = {
    sand: { mine: 5, theirs: 4, discard: 6, top: 2 },
    blood: { mine: 2, theirs: 6, discard: 4, top: 3 },
  }
  for (const suit of SUITS) {
    const pool = [...state.decks[suit], ...state.discards[suit], ...state.players.map((p) => p.hand![suit])]
    const take = (value: number): Card => pool.splice(pool.findIndex((c) => c.kind === 'number' && c.value === value), 1)[0]
    state.players[0].hand![suit] = take(plan[suit].mine)
    state.players[1].hand![suit] = take(plan[suit].theirs)
    state.discards[suit] = [take(plan[suit].discard)]
    const top = take(plan[suit].top)
    state.decks[suit] = [...pool, top]
  }
  return state
}
