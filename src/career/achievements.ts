import { TOKEN_IDS } from '../engine'
import { SHIP_MODULES } from './ship'
import { TABLES } from './tables'
import { tx } from '../i18n'

/** Everything an achievement may look at. The career store is one of these. */
export interface Progress {
  credits: number
  rep: number
  tableWins: Record<string, number>
  duelWins: Record<string, number>
  legendWins: Record<string, number>
  unlockedTokens: string[]
  tokensUsed: string[]
  owned: string[]
  bailouts: number
  tourBest: number
  dailyBest: number
  ship: Record<string, number>
  stats: Record<string, number>
  /** story beats and facts, such as the ending chosen */
  storySeen?: string[]
}

export interface Achievement {
  id: string
  name: string
  text: string
  /** what unlocking it pays */
  credits: number
  rep: number
  /** how far along the player is, as [done, goal] */
  progress(p: Progress): [number, number]
}

const count = (record: Record<string, number>) => Object.values(record).filter((n) => n > 0).length
const stat = (key: string, goal: number) => (p: Progress): [number, number] => [p.stats[key] ?? 0, goal]

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'firstWin', name: tx`Erster Sieg`, text: tx`Gewinne eine Partie.`, credits: 50, rep: 15, progress: stat('wins', 1) },
  { id: 'sabacc', name: tx`Sabacc!`, text: tx`Gewinne eine Hand mit einem Sabacc.`, credits: 30, rep: 10, progress: stat('sabaccWins', 1) },
  { id: 'sabacc25', name: tx`Stammgast`, text: tx`Lege 25 Sabaccs.`, credits: 200, rep: 40, progress: stat('sabaccs', 25) },
  { id: 'pure', name: tx`Reinheit`, text: tx`Halte einen Pure Sabacc.`, credits: 300, rep: 60, progress: stat('pureSabaccs', 1) },
  { id: 'prime', name: tx`Erste Wahl`, text: tx`Gewinne eine Hand mit einem Prime Sabacc.`, credits: 150, rep: 30, progress: stat('primeWins', 1) },
  { id: 'standPat', name: tx`Eiskalt`, text: tx`Gewinne eine Hand, ohne eine Karte zu ziehen.`, credits: 60, rep: 15, progress: stat('standPat', 1) },
  { id: 'impostor', name: tx`Hochstapler`, text: tx`Gewinne eine Hand mit einem Impostor.`, credits: 60, rep: 15, progress: stat('impostorWins', 1) },
  { id: 'flawless', name: tx`Makellos`, text: tx`Gewinne eine Partie, ohne eine Hand zu verlieren.`, credits: 250, rep: 50, progress: stat('flawless', 1) },
  { id: 'comeback', name: tx`Letzter Chip`, text: tx`Gewinne eine Partie, in der du nur noch einen Chip hattest.`, credits: 200, rep: 40, progress: stat('comeback', 1) },
  { id: 'bigTable', name: tx`Tischräumer`, text: tx`Gewinne an einem Tisch mit drei Gegnern.`, credits: 150, rep: 30, progress: stat('bigTableWins', 1) },
  { id: 'games50', name: tx`Dauergast`, text: tx`Spiele 50 Partien.`, credits: 300, rep: 60, progress: stat('games', 50) },

  { id: 'tokens10', name: tx`Trickkiste`, text: tx`Spiele 10 verschiedene Shift-Tokens.`, credits: 150, rep: 30, progress: (p) => [p.tokensUsed.length, 10] },
  { id: 'tokens16', name: tx`Volles Sortiment`, text: tx`Schalte alle 16 Shift-Tokens frei.`, credits: 500, rep: 80, progress: (p) => [p.unlockedTokens.length, TOKEN_IDS.length] },

  { id: 'peek10', name: tx`Lange Finger`, text: tx`Spähe zehnmal.`, credits: 100, rep: 20, progress: stat('peeks', 10) },
  { id: 'caught3', name: tx`Stammkunde der Aufsicht`, text: tx`Lass dich dreimal erwischen.`, credits: 30, rep: 5, progress: stat('caught', 3) },
  { id: 'cleanPeek', name: tx`Unsichtbar`, text: tx`Gewinne eine Partie mit mindestens drei Blicken, ohne erwischt zu werden.`, credits: 300, rep: 60, progress: stat('cleanPeekWins', 1) },

  { id: 'high', name: tx`Hoher Einsatz`, text: tx`Gewinne mit dem Einsatz „Hoch“.`, credits: 100, rep: 25, progress: stat('highWins', 1) },
  { id: 'risky', name: tx`Alles oder nichts`, text: tx`Gewinne mit dem Einsatz „Riskant“.`, credits: 250, rep: 50, progress: stat('riskyWins', 1) },
  { id: 'riskyTop', name: tx`Nerven aus Durastahl`, text: tx`Gewinne „Riskant“ im Syndikatssalon oder an der Kessel-Krone.`, credits: 1500, rep: 150, progress: stat('riskyTopWins', 1) },

  { id: 'tables3', name: tx`Halbzeit`, text: tx`Gewinne an drei verschiedenen Tischen.`, credits: 200, rep: 40, progress: (p) => [count(p.tableWins), 3] },
  { id: 'crown', name: tx`Die Siegel fallen`, text: tx`Gewinne die Kessel-Krone.`, credits: 1000, rep: 200, progress: (p) => [p.tableWins.crown ? 1 : 0, 1] },
  { id: 'duel', name: tx`Revanche`, text: tx`Gewinne ein Duell gegen einen Rivalen.`, credits: 100, rep: 25, progress: (p) => [Math.min(1, count(p.duelWins)), 1] },
  { id: 'duelAll', name: tx`Keine Rivalen mehr`, text: tx`Gewinne jedes Duell gegen die Rivalen der Karriere.`, credits: 1500, rep: 200, progress: (p) => [count(p.duelWins), TABLES.length] },
  { id: 'legend', name: tx`Legende`, text: tx`Gewinne die Kessel-Krone im Legendenmodus.`, credits: 3000, rep: 400, progress: (p) => [p.legendWins.crown ? 1 : 0, 1] },
  { id: 'endFree', name: tx`Schuldenfrei`, text: tx`Gib die Leere Krone frei – ohne einen Credit Schulden.`, credits: 5000, rep: 500, progress: (p) => [p.storySeen?.includes('ending-free') ? 1 : 0, 1] },
  { id: 'endCrown', name: tx`Eine neue Krone`, text: tx`Übernimm die Leere Krone mit deinem Schutzherrn.`, credits: 5000, rep: 500, progress: (p) => [p.storySeen?.includes('ending-crown') ? 1 : 0, 1] },
  { id: 'endOutlaw', name: tx`Outlaw`, text: tx`Nimm den Tresor der Krone und spring.`, credits: 2000, rep: 500, progress: (p) => [p.storySeen?.includes('ending-outlaw') ? 1 : 0, 1] },

  { id: 'tour3', name: tx`Auf Tour`, text: tx`Gewinne drei Tische am Stück auf Tour.`, credits: 300, rep: 60, progress: (p) => [p.tourBest, 3] },
  { id: 'tour5', name: tx`Unaufhaltsam`, text: tx`Gewinne fünf Tische am Stück auf Tour.`, credits: 2000, rep: 250, progress: (p) => [p.tourBest, 5] },
  { id: 'daily', name: tx`Tagesform`, text: tx`Gewinne eine Tageshand.`, credits: 100, rep: 20, progress: stat('dailyWins', 1) },
  { id: 'daily5', name: tx`Frühaufsteher`, text: tx`Gewinne fünf Tageshände.`, credits: 400, rep: 60, progress: stat('dailyWins', 5) },
  { id: 'daily7', name: tx`Sieben am Stück`, text: tx`Spiele die Tageshand an sieben Tagen in Folge.`, credits: 1000, rep: 150, progress: (p) => [p.dailyBest, 7] },

  { id: 'rich', name: tx`Tausender`, text: tx`Besitze 1000 Credits.`, credits: 0, rep: 30, progress: (p) => [Math.min(p.credits, 1000), 1000] },
  { id: 'richer', name: tx`Großverdiener`, text: tx`Besitze 10 000 Credits.`, credits: 0, rep: 120, progress: (p) => [Math.min(p.credits, 10000), 10000] },
  { id: 'collector', name: tx`Sammler`, text: tx`Besitze zehn Stücke der Sammlung.`, credits: 400, rep: 60, progress: (p) => [p.owned.length, 10] },
  {
    id: 'shipshape',
    name: tx`Flugbereit`,
    text: tx`Baue jedes Modul der Sandläufer voll aus.`,
    credits: 0,
    rep: 250,
    progress: (p) => [SHIP_MODULES.reduce((sum, m) => sum + (p.ship[m.id] ?? 0), 0), SHIP_MODULES.reduce((sum, m) => sum + m.levels.length, 0)],
  },
  { id: 'bailout', name: tx`Aufs Haus`, text: tx`Lass dir vom Wirt aus der Pleite helfen.`, credits: 0, rep: 5, progress: (p) => [Math.min(1, p.bailouts), 1] },
]

export function achievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

export function isDone(a: Achievement, p: Progress): boolean {
  const [done, goal] = a.progress(p)
  return done >= goal
}
