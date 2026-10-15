import type { TokenId } from '../engine'
import type { AiProfile, Difficulty } from './policy'
import { tx } from '../i18n'

export interface Character {
  id: string
  name: string
  /** short line shown under the name */
  title: string
  /** hue of the avatar and seat accents */
  hue: number
  /** avatar silhouette */
  sigil: 'horns' | 'visor' | 'hood' | 'crest' | 'tusks' | 'droid'
  profile: AiProfile
  tokens: TokenId[]
}

const profile = (difficulty: Difficulty, aggression: number, tokenRate: number): AiProfile => ({
  difficulty,
  aggression,
  tokenRate,
})

export const CHARACTERS: Record<string, Character> = {
  pim: {
    id: 'pim',
    name: tx`Pim Odo`,
    title: tx`Schrottsammler`,
    hue: 32,
    sigil: 'visor',
    profile: profile('easy', 0.3, 0.3),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  brakk: {
    id: 'brakk',
    name: tx`Brakk`,
    title: tx`Türsteher mit Spielschulden`,
    hue: 8,
    sigil: 'tusks',
    profile: profile('easy', 0.8, 0.5),
    tokens: ['generalTariff', 'targetTariff', 'freeDraw'],
  },
  mira: {
    id: 'mira',
    name: tx`Mira Sol`,
    title: tx`Frachtpilotin`,
    hue: 190,
    sigil: 'crest',
    profile: profile('medium', 0.1, 0.5),
    tokens: ['freeDraw', 'embargo', 'refund'],
  },
  kessk: {
    id: 'kessk',
    name: tx`Der alte Kessk`,
    title: tx`Zählt jede Karte. Langsam.`,
    hue: 95,
    sigil: 'hood',
    profile: profile('medium', -0.5, 0.3),
    tokens: ['immunity', 'extraRefund', 'markdown'],
  },
  zula: {
    id: 'zula',
    name: tx`Zula Marn`,
    title: tx`Zollbeamtin außer Dienst`,
    hue: 280,
    sigil: 'horns',
    profile: profile('medium', 0.2, 0.9),
    tokens: ['generalAudit', 'targetTariff', 'embargo'],
  },
  tevin: {
    id: 'tevin',
    name: tx`Tevin Rho`,
    title: tx`Falschspieler`,
    hue: 330,
    sigil: 'visor',
    profile: profile('medium', 0.6, 0.8),
    tokens: ['majorFraud', 'exhaustion', 'freeDraw'],
  },
  unit7: {
    id: 'unit7',
    name: tx`K-7 „Kalkül“`,
    title: tx`Buchhaltungsdroide`,
    hue: 210,
    sigil: 'droid',
    profile: profile('hard', -0.2, 0.5),
    tokens: ['targetAudit', 'extraRefund', 'immunity'],
  },
  ilsa: {
    id: 'ilsa',
    name: tx`Ilsa Korr`,
    title: tx`Schmugglerin`,
    hue: 150,
    sigil: 'crest',
    profile: profile('hard', 0.4, 0.7),
    tokens: ['targetAudit', 'directTransaction', 'freeDraw'],
  },
  dray: {
    id: 'dray',
    name: tx`Dray Venn`,
    title: tx`Syndikats-Kassierer`,
    hue: 48,
    sigil: 'horns',
    profile: profile('hard', 0.1, 0.9),
    tokens: ['cookTheBooks', 'targetAudit', 'embezzlement'],
  },
  varra: {
    id: 'varra',
    name: tx`Varra Kel`,
    title: tx`Schichtleiterin der Gewürzmine`,
    hue: 18,
    sigil: 'crest',
    profile: profile('hard', 0.3, 0.6),
    tokens: ['embezzlement', 'targetTariff', 'immunity'],
  },
  tok: {
    id: 'tok',
    name: tx`Tok`,
    title: tx`Hauer, spielt um Lohnmarken`,
    hue: 70,
    sigil: 'tusks',
    profile: profile('medium', 0.5, 0.4),
    tokens: ['freeDraw', 'generalTariff', 'refund'],
  },
  sesk: {
    id: 'sesk',
    name: tx`Sesk Dorn`,
    title: tx`Wirt im Brocken`,
    hue: 262,
    sigil: 'horns',
    profile: profile('hard', 0.2, 0.7),
    tokens: ['cookTheBooks', 'markdown', 'exhaustion'],
  },
  lio: {
    id: 'lio',
    name: tx`Lio Vant`,
    title: tx`Kurierfliegerin`,
    hue: 168,
    sigil: 'visor',
    profile: profile('hard', 0.4, 0.6),
    tokens: ['directTransaction', 'freeDraw', 'embargo'],
  },
  grex: {
    id: 'grex',
    name: tx`Grex`,
    title: tx`Hangarmeister bei Madame Oshi`,
    hue: 352,
    sigil: 'tusks',
    profile: profile('hard', 0.6, 0.6),
    tokens: ['generalAudit', 'majorFraud', 'targetTariff'],
  },
  oshi: {
    id: 'oshi',
    name: tx`Madame Oshi`,
    title: tx`Ungeschlagen seit neun Jahren`,
    hue: 300,
    sigil: 'hood',
    profile: profile('hard', 0.0, 0.8),
    tokens: ['primeSabacc', 'immunity', 'embezzlement'],
  },
  // ── Act 2: the trade route, where Corellian Spike is played ──
  dessa: {
    id: 'dessa',
    name: tx`Dessa Varn`,
    title: tx`Werftvorarbeiterin auf Hallis`,
    hue: 24,
    sigil: 'crest',
    profile: profile('easy', -0.2, 0.3),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  rook: {
    id: 'rook',
    name: tx`Rook`,
    title: tx`Schweißer-Lehrling`,
    hue: 205,
    sigil: 'visor',
    profile: profile('easy', 0.5, 0.4),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  mags: {
    id: 'mags',
    name: tx`Mags Tallow`,
    title: tx`Kranführerin`,
    hue: 130,
    sigil: 'horns',
    profile: profile('easy', 0.1, 0.4),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  quill: {
    id: 'quill',
    name: tx`Quartiermeister Quill`,
    title: tx`Zahlmeister des Konvois`,
    hue: 265,
    sigil: 'hood',
    profile: profile('medium', -0.3, 0.5),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  juno: {
    id: 'juno',
    name: tx`Juno Vask`,
    title: tx`Swoop-Rennfahrerin`,
    hue: 345,
    sigil: 'crest',
    profile: profile('medium', 0.9, 0.6),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  harl: {
    id: 'harl',
    name: tx`Harl`,
    title: tx`Buchmacher an der Bahn`,
    hue: 55,
    sigil: 'tusks',
    profile: profile('medium', 0.4, 0.5),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  vesh: {
    id: 'vesh',
    name: tx`Vesh Corra`,
    title: tx`Croupière der Gasbarke`,
    hue: 285,
    sigil: 'horns',
    profile: profile('hard', 0.2, 0.6),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  sable: {
    id: 'sable',
    name: tx`Archivarin Sable`,
    title: tx`Hüterin der Glasfinger`,
    hue: 170,
    sigil: 'hood',
    profile: profile('hard', -0.4, 0.7),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  veyra: {
    id: 'veyra',
    name: tx`Veyra Thane`,
    title: tx`Matriarchin des Roten Siegels`,
    hue: 355,
    sigil: 'crest',
    profile: profile('hard', 0.3, 0.7),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
  corvin: {
    id: 'corvin',
    name: tx`Corvin Ashe`,
    title: tx`Handelsfürst`,
    hue: 45,
    sigil: 'visor',
    profile: profile('hard', 0.0, 0.8),
    tokens: ['freeDraw', 'refund', 'generalTariff'],
  },
}

export const DEFAULT_PROFILES: Record<Difficulty, AiProfile> = {
  easy: profile('easy', 0.3, 0.4),
  medium: profile('medium', 0.1, 0.6),
  hard: profile('hard', 0.1, 0.7),
}
