import { decodeSave, encodeSave } from '../career/backup'
import { DEFAULT_LOOK } from '../career/cosmetics'
import { useCareer } from './career'
import { useGame } from './game'

/** Everything about the career that is kept between sessions. */
function careerData(): Record<string, unknown> {
  const { gameRep: _gameRep, recent: _recent, ...state } = useCareer.getState()
  return Object.fromEntries(Object.entries(state).filter(([, value]) => typeof value !== 'function'))
}

/** The whole career as a code to copy somewhere safe or to another device. */
export function exportSave(): string {
  const code = encodeSave({ career: careerData(), savedAt: new Date().toISOString() })
  useCareer.getState().noteBackup()
  return code
}

export type ImportResult = 'ok' | 'format' | 'damaged' | 'version'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Replace the career on this device with the one in the code. */
export function importSave(code: string): ImportResult {
  const decoded = decodeSave(code)
  if (!decoded.ok) return decoded.reason
  const career = isRecord(decoded.data) ? decoded.data.career : null
  if (!isRecord(career) || typeof career.credits !== 'number' || !Array.isArray(career.unlockedTokens) || !isRecord(career.tableWins)) return 'damaged'

  // Take only what a career is made of, with the type it has here.
  const known = careerData()
  const loaded: Record<string, unknown> = {}
  for (const key of Object.keys(known)) {
    const value = career[key]
    if (value === undefined) continue
    const same = known[key] === null || value === null || (Array.isArray(known[key]) ? Array.isArray(value) : typeof value === typeof known[key])
    if (same) loaded[key] = value
  }
  const owned = Array.isArray(loaded.owned) ? (loaded.owned as string[]) : []
  const look = isRecord(loaded.look) ? (loaded.look as Record<string, string>) : {}

  // A game in progress belongs to the career that is being replaced.
  useGame.getState().clear()
  useCareer.getState().reset()
  useCareer.setState({ ...loaded, owned: [...new Set([...Object.values(DEFAULT_LOOK), ...owned])], look: { ...DEFAULT_LOOK, ...look } })
  return 'ok'
}
