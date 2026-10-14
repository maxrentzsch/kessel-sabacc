/**
 * The shape of the saved career. Raise it with every change to what is saved
 * and add the step that turns the previous shape into the new one, so a save
 * from any earlier version still loads.
 */
export const CAREER_VERSION = 2

type Save = Record<string, unknown>

/** Step n turns a save of version n into one of version n + 1. */
const STEPS: Record<number, (save: Save) => Save> = {
  // 2: the backup reminder counts games since the last backup code; an old save has never made one.
  1: (save) => ({ ...save, backupAt: 0 }),
}

export function migrateCareer(save: unknown, from: number): Save {
  let next: Save = typeof save === 'object' && save !== null && !Array.isArray(save) ? { ...(save as Save) } : {}
  for (let version = from; version < CAREER_VERSION; version++) next = STEPS[version]?.(next) ?? next
  return next
}
