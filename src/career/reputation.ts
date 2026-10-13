/** Reputation: every game earns some, and enough of it is a new rank. */
export interface Rank {
  level: number
  title: string
  /** reputation needed to reach this rank */
  at: number
}

export const RANKS: Rank[] = [
  { level: 1, title: 'Niemand', at: 0 },
  { level: 2, title: 'Glücksritter', at: 60 },
  { level: 3, title: 'Kartenhai', at: 160 },
  { level: 4, title: 'Zocker', at: 320 },
  { level: 5, title: 'Schlitzohr', at: 550 },
  { level: 6, title: 'Tischschreck', at: 850 },
  { level: 7, title: 'Hochstapler', at: 1250 },
  { level: 8, title: 'Syndikatsliebling', at: 1750 },
  { level: 9, title: 'Sabacc-Meister', at: 2400 },
  { level: 10, title: 'Kessel-Veteran', at: 3200 },
  { level: 11, title: 'Unantastbar', at: 4200 },
  { level: 12, title: 'Legende von Kessel', at: 5500 },
]

export function rankOf(rep: number): Rank {
  return [...RANKS].reverse().find((r) => rep >= r.at) ?? RANKS[0]
}

/** Progress towards the next rank, 0…1; 1 at the top rank. */
export function rankProgress(rep: number): { rank: Rank; next: Rank | null; share: number } {
  const rank = rankOf(rep)
  const next = RANKS[rank.level] ?? null
  return { rank, next, share: next ? (rep - rank.at) / (next.at - rank.at) : 1 }
}

/** Reputation for finishing a game. `tier` is how hard the table was, from 1. */
export const REP = {
  game: 8,
  handWon: 2,
  sabacc: 3,
  tableWin: (tier: number) => 25 * tier,
  duelWin: (tier: number) => 20 * tier,
  tourStage: (stage: number) => 20 * stage,
  dailyWin: 40,
  freeWin: 10,
}
