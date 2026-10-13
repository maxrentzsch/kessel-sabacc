/** mulberry32 – small seedable PRNG whose whole state is one 32-bit integer. */
export function nextRandom(state: number): { value: number; state: number } {
  const s = (state + 0x6d2b79f5) | 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: s }
}

/** Mutable wrapper for code that draws many numbers in a row. */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    const r = nextRandom(this.state)
    this.state = r.state
    return r.value
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive)
  }

  die(): number {
    return this.int(6) + 1
  }

  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1)
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) | 0
}
