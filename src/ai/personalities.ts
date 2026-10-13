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
  oshi: {
    id: 'oshi',
    name: tx`Madame Oshi`,
    title: tx`Ungeschlagen seit neun Jahren`,
    hue: 300,
    sigil: 'hood',
    profile: profile('hard', 0.0, 0.8),
    tokens: ['primeSabacc', 'immunity', 'embezzlement'],
  },
}

export const DEFAULT_PROFILES: Record<Difficulty, AiProfile> = {
  easy: profile('easy', 0.3, 0.4),
  medium: profile('medium', 0.1, 0.6),
  hard: profile('hard', 0.1, 0.7),
}
