import { applyShiftAction, createShiftGame } from './reducer'
import type { ShiftAction, ShiftConfig, ShiftState } from './types'

/** A Coruscant Shift game as it can be told again: its setup and every move made in it, in order. */
export interface ShiftRecord {
  config: ShiftConfig
  actions: ShiftAction[]
}

/** Play a recorded game through again; the engine is pure, so the result is the game exactly as it was. */
export function replayShift(record: ShiftRecord): ShiftState {
  let { state } = createShiftGame(record.config)
  for (const action of record.actions) state = applyShiftAction(state, action).state
  return state
}
