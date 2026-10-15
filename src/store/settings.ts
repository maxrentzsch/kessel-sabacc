import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  sound: boolean
  /** cantina background noise */
  ambience: boolean
  /** iOS: keep playing when the ring/silent switch is set to silent */
  ignoreMute: boolean
  haptics: boolean
  /** show coaching hints at the table */
  hints: boolean
  fast: boolean
  /** Corellian Spike: print the value on the cards as a numeral, beside the symbols to count */
  cardNumbers: boolean
  /** the sleeve: a short test of a steady hand instead of a plain button with a fixed risk */
  steadyHand: boolean
  set(patch: Partial<Omit<SettingsState, 'set'>>): void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      ambience: true,
      ignoreMute: true,
      haptics: true,
      hints: true,
      fast: false,
      cardNumbers: true,
      steadyHand: true,
      set: (patch) => set(patch),
    }),
    { name: 'kessel-sabacc-settings', version: 1 },
  ),
)

/** Multiplier for every scripted pause and animation length. */
export function tempo(): number {
  return useSettings.getState().fast ? 0.55 : 1
}
