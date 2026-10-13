import { create } from 'zustand'
import type { TokenId } from '../../engine'

/**
 * Which of the table's sheets is open. Kept apart from the table itself:
 * opening one must not make the whole table draw itself again, or the sheet
 * stutters on its way up.
 */
interface Inspect {
  /** the token being looked at, and whether it is the player's own */
  token: { token: TokenId; mine: boolean } | null
  peeking: boolean
  showToken(token: TokenId, mine: boolean): void
  showPeek(): void
  close(): void
}

export const useInspect = create<Inspect>((set) => ({
  token: null,
  peeking: false,
  showToken: (token, mine) => set({ token: { token, mine }, peeking: false }),
  showPeek: () => set({ peeking: true, token: null }),
  close: () => set({ token: null, peeking: false }),
}))
