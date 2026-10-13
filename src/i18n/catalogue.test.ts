import { describe, expect, it } from 'vitest'
import { EN } from './en'

/** Every key of a tx`…` in a piece of source, nested ones included. */
function keysIn(code: string): string[] {
  const keys: string[] = []
  const tagged = (i: number) => code.slice(Math.max(0, i - 2), i) === 'tx' && !/[\w$]/.test(code[i - 3] ?? '')
  // Reads a template body from just after its opening backtick; returns the index after the closing one.
  function template(i: number, collect: boolean): number {
    let key = ''
    let slot = 0
    while (i < code.length) {
      const ch = code[i]
      if (ch === '\\') {
        key += code[i + 1] === 'n' ? '\n' : code[i + 1]
        i += 2
      } else if (ch === '`') {
        if (collect) keys.push(key.trim())
        return i + 1
      } else if (ch === '$' && code[i + 1] === '{') {
        key += `{${slot++}}`
        i = expression(i + 2)
      } else {
        key += ch
        i++
      }
    }
    return i
  }
  // Reads code up to the brace that closes a ${…}; returns the index after it.
  function expression(i: number): number {
    let depth = 0
    while (i < code.length) {
      const ch = code[i]
      if (ch === '`') i = template(i + 1, tagged(i))
      else if (ch === "'" || ch === '"') {
        i++
        while (i < code.length && code[i] !== ch) i += code[i] === '\\' ? 2 : 1
        i++
      } else if (ch === '{') {
        depth++
        i++
      } else if (ch === '}') {
        if (depth === 0) return i + 1
        depth--
        i++
      } else i++
    }
    return i
  }
  let i = 0
  while (i < code.length) {
    const ch = code[i]
    if (ch === '`') i = template(i + 1, tagged(i))
    else if (ch === '/' && code[i + 1] === '/') while (i < code.length && code[i] !== '\n') i++
    else if (ch === '/' && code[i + 1] === '*') i = code.indexOf('*/', i + 2) + 2
    else i++
  }
  return keys.filter(Boolean)
}

const sources = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('the English catalogue', () => {
  const used = new Set<string>()
  for (const [file, code] of Object.entries(sources)) {
    if (file.endsWith('.test.ts')) continue
    for (const key of keysIn(code)) used.add(key)
  }

  it('finds the texts in the source', () => {
    expect(used.size).toBeGreaterThan(500)
    expect(used.has('Karriere')).toBe(true)
    expect(used.has('Noch {0} wählen')).toBe(true)
  })

  it('has English for every text', () => {
    expect([...used].filter((key) => !(key in EN))).toEqual([])
  })

  it('holds nothing that is no longer used', () => {
    expect(Object.keys(EN).filter((key) => !used.has(key))).toEqual([])
  })

  it('keeps every placeholder of a text', () => {
    const slots = (text: string) => [...text.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort()
    for (const [de, en] of Object.entries(EN)) expect(slots(en), de).toEqual(slots(de))
  })
})
