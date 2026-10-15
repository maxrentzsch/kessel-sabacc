/**
 * The shape of the saved career. Raise it with every change to what is saved
 * and add the step that turns the previous shape into the new one, so a save
 * from any earlier version still loads.
 */
export const CAREER_VERSION = 7

type Save = Record<string, unknown>

/** Step n turns a save of version n into one of version n + 1. */
const STEPS: Record<number, (save: Save) => Save> = {
  // 2: the backup reminder counts games since the last backup code; an old save has never made one.
  1: (save) => ({ ...save, backupAt: 0 }),
  // 3: the story starts on Tarsk and the ship is won in the stake game. A save that already played
  // out in the sector has the ship; one that won anything has been through the opening on Tarsk.
  2: (save) => {
    const wins = { ...(record(save.tableWins) ?? {}), ...(record(save.legendWins) ?? {}) }
    const won = (id: string) => (Number(wins[id]) || 0) > 0
    const seen = Array.isArray(save.storySeen) ? (save.storySeen as unknown[]).filter((id) => typeof id === 'string') : []
    return {
      ...save,
      hasShip: ['lodge', 'salon', 'crown'].some(won),
      bix: null,
      storySeen: Object.keys(wins).some(won) && !seen.includes('prologue-tarsk') ? [...seen, 'prologue-tarsk'] : seen,
    }
  },
  // 4: act 1 brings Oshi's instalment, standing with the syndicates, jobs and travel. Whoever has
  // already won the Kessel Crown has, in the story's terms, paid the first instalment.
  3: (save) => ({
    ...save,
    debt: { paid: (Number(record(save.tableWins)?.crown) || 0) > 0 ? 6000 : 0, extra: 0 },
    standing: {},
    jobsDone: [],
    location: save.hasShip ? 'lodge' : 'anchor',
  }),
  // 5: a file on every opponent, filled from here on
  4: (save) => ({ ...save, dossiers: {} }),
  // 6: cards for the sleeve
  5: (save) => ({ ...save, sleeves: 0 }),
  // 7: act 3 brings the garrison, and how much attention the player draws from it
  6: (save) => ({ ...save, heat: 0 }),
}

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export function migrateCareer(save: unknown, from: number): Save {
  let next: Save = typeof save === 'object' && save !== null && !Array.isArray(save) ? { ...(save as Save) } : {}
  for (let version = from; version < CAREER_VERSION; version++) next = STEPS[version]?.(next) ?? next
  return next
}
