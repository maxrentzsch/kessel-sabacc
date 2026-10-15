import { create } from 'zustand'
import type { TokenId } from '../engine'
import type { Session } from './game'

export type Screen =
  | 'home'
  | 'career'
  | 'free'
  | 'loadout'
  | 'table'
  | 'spike'
  | 'shift'
  | 'result'
  | 'rules'
  | 'profile'
  | 'ship'
  | 'collection'
  | 'achievements'
  | 'dossiers'
  | 'tour'
  | 'daily'

/** A game that is set up but still needs its token loadout. */
export interface PendingGame {
  session: Session
  /** tokens the player may choose from */
  pool: TokenId[]
}

interface NavState {
  screen: Screen
  pending: PendingGame | null
  go(screen: Screen): void
  prepare(pending: PendingGame): void
}

export const useNav = create<NavState>((set) => ({
  screen: 'home',
  pending: null,
  go: (screen) => set({ screen }),
  prepare: (pending) => set({ pending, screen: 'loadout' }),
}))
