import { TOKEN_IDS } from '../engine'
import { SHIP_MODULES } from './ship'
import { TABLES } from './tables'

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
  { id: 'firstWin', name: 'Erster Sieg', text: 'Gewinne eine Partie.', credits: 50, rep: 15, progress: stat('wins', 1) },
  { id: 'sabacc', name: 'Sabacc!', text: 'Gewinne eine Hand mit einem Sabacc.', credits: 30, rep: 10, progress: stat('sabaccWins', 1) },
  { id: 'sabacc25', name: 'Stammgast', text: 'Lege 25 Sabaccs.', credits: 200, rep: 40, progress: stat('sabaccs', 25) },
  { id: 'pure', name: 'Reinheit', text: 'Halte einen Pure Sabacc.', credits: 300, rep: 60, progress: stat('pureSabaccs', 1) },
  { id: 'prime', name: 'Erste Wahl', text: 'Gewinne eine Hand mit einem Prime Sabacc.', credits: 150, rep: 30, progress: stat('primeWins', 1) },
  { id: 'standPat', name: 'Eiskalt', text: 'Gewinne eine Hand, ohne eine Karte zu ziehen.', credits: 60, rep: 15, progress: stat('standPat', 1) },
  { id: 'impostor', name: 'Hochstapler', text: 'Gewinne eine Hand mit einem Impostor.', credits: 60, rep: 15, progress: stat('impostorWins', 1) },
  { id: 'flawless', name: 'Makellos', text: 'Gewinne eine Partie, ohne eine Hand zu verlieren.', credits: 250, rep: 50, progress: stat('flawless', 1) },
  { id: 'comeback', name: 'Letzter Chip', text: 'Gewinne eine Partie, in der du nur noch einen Chip hattest.', credits: 200, rep: 40, progress: stat('comeback', 1) },
  { id: 'bigTable', name: 'Tischräumer', text: 'Gewinne an einem Tisch mit drei Gegnern.', credits: 150, rep: 30, progress: stat('bigTableWins', 1) },
  { id: 'games50', name: 'Dauergast', text: 'Spiele 50 Partien.', credits: 300, rep: 60, progress: stat('games', 50) },

  { id: 'tokens10', name: 'Trickkiste', text: 'Spiele 10 verschiedene Shift-Tokens.', credits: 150, rep: 30, progress: (p) => [p.tokensUsed.length, 10] },
  { id: 'tokens16', name: 'Volles Sortiment', text: 'Schalte alle 16 Shift-Tokens frei.', credits: 500, rep: 80, progress: (p) => [p.unlockedTokens.length, TOKEN_IDS.length] },

  { id: 'peek10', name: 'Lange Finger', text: 'Spähe zehnmal.', credits: 100, rep: 20, progress: stat('peeks', 10) },
  { id: 'caught3', name: 'Stammkunde der Aufsicht', text: 'Lass dich dreimal erwischen.', credits: 30, rep: 5, progress: stat('caught', 3) },
  { id: 'cleanPeek', name: 'Unsichtbar', text: 'Gewinne eine Partie mit mindestens drei Blicken, ohne erwischt zu werden.', credits: 300, rep: 60, progress: stat('cleanPeekWins', 1) },

  { id: 'high', name: 'Hoher Einsatz', text: 'Gewinne mit dem Einsatz „Hoch“.', credits: 100, rep: 25, progress: stat('highWins', 1) },
  { id: 'risky', name: 'Alles oder nichts', text: 'Gewinne mit dem Einsatz „Riskant“.', credits: 250, rep: 50, progress: stat('riskyWins', 1) },
  { id: 'riskyTop', name: 'Nerven aus Durastahl', text: 'Gewinne „Riskant“ im Syndikatssalon oder an der Kessel-Krone.', credits: 1500, rep: 150, progress: stat('riskyTopWins', 1) },

  { id: 'tables3', name: 'Halbzeit', text: 'Gewinne an drei verschiedenen Tischen.', credits: 200, rep: 40, progress: (p) => [count(p.tableWins), 3] },
  { id: 'crown', name: 'Die Sandläufer fliegt wieder', text: 'Gewinne die Kessel-Krone.', credits: 1000, rep: 200, progress: (p) => [p.tableWins.crown ? 1 : 0, 1] },
  { id: 'duel', name: 'Revanche', text: 'Gewinne ein Duell gegen einen Rivalen.', credits: 100, rep: 25, progress: (p) => [Math.min(1, count(p.duelWins)), 1] },
  { id: 'duelAll', name: 'Keine Rivalen mehr', text: 'Gewinne alle sechs Duelle.', credits: 1500, rep: 200, progress: (p) => [count(p.duelWins), TABLES.length] },
  { id: 'legend', name: 'Legende', text: 'Gewinne die Kessel-Krone im Legendenmodus.', credits: 3000, rep: 400, progress: (p) => [p.legendWins.crown ? 1 : 0, 1] },

  { id: 'tour3', name: 'Auf Tour', text: 'Gewinne drei Tische am Stück auf Tour.', credits: 300, rep: 60, progress: (p) => [p.tourBest, 3] },
  { id: 'tour5', name: 'Unaufhaltsam', text: 'Gewinne fünf Tische am Stück auf Tour.', credits: 2000, rep: 250, progress: (p) => [p.tourBest, 5] },
  { id: 'daily', name: 'Tagesform', text: 'Gewinne eine Tageshand.', credits: 100, rep: 20, progress: stat('dailyWins', 1) },
  { id: 'daily5', name: 'Frühaufsteher', text: 'Gewinne fünf Tageshände.', credits: 400, rep: 60, progress: stat('dailyWins', 5) },
  { id: 'daily7', name: 'Sieben am Stück', text: 'Spiele die Tageshand an sieben Tagen in Folge.', credits: 1000, rep: 150, progress: (p) => [p.dailyBest, 7] },

  { id: 'rich', name: 'Tausender', text: 'Besitze 1000 Credits.', credits: 0, rep: 30, progress: (p) => [Math.min(p.credits, 1000), 1000] },
  { id: 'richer', name: 'Großverdiener', text: 'Besitze 10 000 Credits.', credits: 0, rep: 120, progress: (p) => [Math.min(p.credits, 10000), 10000] },
  { id: 'collector', name: 'Sammler', text: 'Besitze zehn Stücke der Sammlung.', credits: 400, rep: 60, progress: (p) => [p.owned.length, 10] },
  {
    id: 'shipshape',
    name: 'Flugbereit',
    text: 'Baue jedes Modul der Sandläufer voll aus.',
    credits: 0,
    rep: 250,
    progress: (p) => [SHIP_MODULES.reduce((sum, m) => sum + (p.ship[m.id] ?? 0), 0), SHIP_MODULES.reduce((sum, m) => sum + m.levels.length, 0)],
  },
  { id: 'bailout', name: 'Aufs Haus', text: 'Lass dir vom Wirt aus der Pleite helfen.', credits: 0, rep: 5, progress: (p) => [Math.min(1, p.bailouts), 1] },
]

export function achievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

export function isDone(a: Achievement, p: Progress): boolean {
  const [done, goal] = a.progress(p)
  return done >= goal
}
