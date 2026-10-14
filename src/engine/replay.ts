import { applyAction, createGame } from './reducer'
import type { Action, GameConfig, GameState } from './types'

/** A game as it can be told again: how it was set up and every move made in it, in order. */
export interface GameRecord {
  config: GameConfig
  actions: Action[]
}

/** Play a recorded game through again. The engine is pure, so the result is the game exactly as it was. */
export function replay(record: GameRecord): GameState {
  let { state } = createGame(record.config)
  for (const action of record.actions) state = applyAction(state, action).state
  return state
}
