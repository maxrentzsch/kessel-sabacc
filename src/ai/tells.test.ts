import { describe, expect, it } from 'vitest'
import { Rng } from '../engine'
import { CHARACTERS } from './personalities'
import { HONESTY, showsTell, strengthOf, TELLS, tellHeld } from './tells'
import type { Tell } from './tells'

describe('tells', () => {
  it('give every character a habit of their own', () => {
    for (const id of Object.keys(CHARACTERS)) expect(TELLS[id], id).toBeDefined()
    const gestures = Object.values(TELLS).map((t) => t.gesture)
    expect(new Set(gestures).size).toBe(gestures.length)
  })

  it('reads strength from the chance to win', () => {
    expect(strengthOf(0.8)).toBe('strong')
    expect(strengthOf(0.4)).toBe('neutral')
    expect(strengthOf(0.1)).toBe('weak')
  })

  it('give away more about an easy opponent than a hard one, but something about both', () => {
    const tell: Tell = { gesture: 'x', meaning: 'strong' }
    const rng = new Rng(7)
    // Of all the times the gesture is seen, how often is the hand really strong? Hands are strong a third of the time.
    const trust = (difficulty: keyof typeof HONESTY) => {
      let shown = 0
      let honest = 0
      for (let i = 0; i < 20000; i++) {
        const strength = i % 3 === 0 ? 'strong' : i % 3 === 1 ? 'weak' : 'neutral'
        if (showsTell(tell, strength, difficulty, () => rng.next())) {
          shown++
          if (strength === 'strong') honest++
        }
      }
      return honest / shown
    }
    const easy = trust('easy')
    const hard = trust('hard')
    expect(easy).toBeGreaterThan(0.8)
    expect(hard).toBeLessThan(easy)
    // still better than the third a player would guess without it
    expect(hard).toBeGreaterThan(0.4)
  })

  it('hold true when the cards bear them out', () => {
    expect(tellHeld({ gesture: 'x', meaning: 'strong' }, { winner: true, sabacc: false })).toBe(true)
    expect(tellHeld({ gesture: 'x', meaning: 'strong' }, { winner: false, sabacc: false })).toBe(false)
    expect(tellHeld({ gesture: 'x', meaning: 'weak' }, { winner: false, sabacc: false })).toBe(true)
    expect(tellHeld({ gesture: 'x', meaning: 'weak' }, { winner: false, sabacc: true })).toBe(false)
  })
})
