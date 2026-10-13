import { tx } from '../i18n'
/**
 * The collection: things that change how the game looks and what the player
 * is called. Some are bought with credits, some have to be earned.
 */
export type CosmeticKind = 'back' | 'felt' | 'chip' | 'title'

export interface Cosmetic {
  id: string
  kind: CosmeticKind
  name: string
  /** credits; absent for things that cannot be bought */
  price?: number
  /** earned instead of bought: an achievement id, a rank, or beating a table's rival */
  earn?: { achievement?: string; rank?: number; duel?: string }
  /** how to get it, for the collection screen */
  hint?: string
}

/** Fill gradient and line colour of a card back, per suit. */
export interface BackSkin {
  sand: [string, string, string]
  blood: [string, string, string]
}

// The pattern on a back is drawn in broad strokes, so the line colour covers
// about as much of the card as the fill does.
export const BACKS: Record<string, BackSkin> = {
  'back-standard': { sand: ['#eda240', '#c9761f', '#3a2110'], blood: ['#7a2a20', '#55170f', '#2b0d0a'] },
  'back-desert': { sand: ['#f2dcae', '#d9b877', '#7a5a2a'], blood: ['#d98a6a', '#b0583c', '#4a1c10'] },
  'back-obsidian': { sand: ['#6b5a34', '#40351c', '#0f0d0c'], blood: ['#6b2c2a', '#3d1615', '#0f0d0c'] },
  'back-holo': { sand: ['#a2f7f0', '#3fb6a9', '#0a2224'], blood: ['#f6b0ee', '#b84aa8', '#220a22'] },
  'back-syndicate': { sand: ['#d9dde6', '#9aa3b5', '#18233a'], blood: ['#e07a70', '#a83a32', '#18233a'] },
  'back-crown': { sand: ['#f6dc8a', '#c9982a', '#5a1414'], blood: ['#c4343a', '#7a1218', '#3a0a0c'] },
}

/** Felt colours from the middle of the table outwards; `null` keeps the venue's own. */
export const FELTS: Record<string, [string, string, string] | null> = {
  'felt-house': null,
  'felt-sage': ['#88a27f', '#6f8868', '#566b50'],
  'felt-midnight': ['#4a6388', '#364b6c', '#243550'],
  'felt-purple': ['#7d5a8c', '#644572', '#493055'],
  'felt-emerald': ['#3f9a78', '#2c7a5c', '#1c5a42'],
  'felt-black': ['#4a4a4a', '#333333', '#1e1e1e'],
}

/** Chip colours: body, ring and edge. */
export const CHIPS: Record<string, [string, string, string]> = {
  'chip-standard': ['#e58a22', '#f0e4cb', '#8f4d0e'],
  'chip-jade': ['#3fa87a', '#e8f3e4', '#1f5e42'],
  'chip-cobalt': ['#3f6fc9', '#e4ecf8', '#1f3a78'],
  'chip-gold': ['#e8c04a', '#fff3c0', '#8a6a14'],
  'chip-obsidian': ['#2e2e33', '#c9c9d2', '#0e0e12'],
  'chip-crown': ['#a81f2a', '#f3d27a', '#5a0e14'],
}

export const COSMETICS: Cosmetic[] = [
  { id: 'back-standard', kind: 'back', name: tx`Hausdeck` },
  { id: 'back-desert', kind: 'back', name: tx`Wüstenwind`, price: 400 },
  { id: 'back-obsidian', kind: 'back', name: tx`Obsidian`, price: 900 },
  { id: 'back-holo', kind: 'back', name: tx`Holo`, price: 1500 },
  { id: 'back-syndicate', kind: 'back', name: tx`Syndikat`, earn: { duel: 'salon' }, hint: tx`Besiege K-7 im Duell` },
  { id: 'back-crown', kind: 'back', name: tx`Kessel-Krone`, earn: { achievement: 'crown' }, hint: tx`Gewinne die Kessel-Krone` },

  { id: 'felt-house', kind: 'felt', name: tx`Hausfilz` },
  { id: 'felt-sage', kind: 'felt', name: tx`Salbei`, price: 250 },
  { id: 'felt-midnight', kind: 'felt', name: tx`Mitternacht`, price: 500 },
  { id: 'felt-purple', kind: 'felt', name: tx`Purpur`, price: 500 },
  { id: 'felt-emerald', kind: 'felt', name: tx`Smaragd`, price: 1000 },
  { id: 'felt-black', kind: 'felt', name: tx`Schwarzmarkt`, earn: { achievement: 'flawless' }, hint: tx`Gewinne eine Partie ohne verlorene Hand` },

  { id: 'chip-standard', kind: 'chip', name: tx`Hauschips` },
  { id: 'chip-jade', kind: 'chip', name: tx`Jade`, price: 300 },
  { id: 'chip-cobalt', kind: 'chip', name: tx`Kobalt`, price: 300 },
  { id: 'chip-gold', kind: 'chip', name: tx`Reingold`, price: 2000 },
  { id: 'chip-obsidian', kind: 'chip', name: tx`Obsidian`, earn: { rank: 6 }, hint: tx`Erreiche Rang 6` },
  { id: 'chip-crown', kind: 'chip', name: tx`Blutgold`, earn: { achievement: 'legend' }, hint: tx`Gewinne die Kessel-Krone als Legende` },

  { id: 'title-rank', kind: 'title', name: tx`Dein Rang` },
  { id: 'title-rivals', kind: 'title', name: tx`Rivalenschreck`, earn: { achievement: 'duelAll' }, hint: tx`Gewinne alle sechs Duelle` },
  { id: 'title-champion', kind: 'title', name: tx`Champion der Kessel-Krone`, earn: { achievement: 'crown' }, hint: tx`Gewinne die Kessel-Krone` },
  { id: 'title-ghost', kind: 'title', name: tx`Das Phantom`, earn: { achievement: 'cleanPeek' }, hint: tx`Gewinne mit drei unbemerkten Blicken` },
  { id: 'title-tour', kind: 'title', name: tx`Der Unaufhaltsame`, earn: { achievement: 'tour5' }, hint: tx`Schaffe fünf Tische am Stück auf Tour` },
  { id: 'title-legend', kind: 'title', name: tx`Legende`, earn: { achievement: 'legend' }, hint: tx`Gewinne die Kessel-Krone als Legende` },
]

export const DEFAULT_LOOK: Record<CosmeticKind, string> = {
  back: 'back-standard',
  felt: 'felt-house',
  chip: 'chip-standard',
  title: 'title-rank',
}

export const KIND_NAME: Record<CosmeticKind, string> = { back: tx`Karten`, felt: tx`Filz`, chip: tx`Chips`, title: tx`Titel` }

export function cosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id)
}
