import { EN } from './en'

/**
 * Two languages. The German text in the source is the key: `tx` looks it up
 * in the English catalogue and falls back to the German.
 *
 * The language is fixed when the page loads. That lets text be translated
 * where it is written down – in tables of data as well as in components –
 * without everything having to redraw when it changes. Switching reloads.
 */
export type Lang = 'de' | 'en'

const STORAGE_KEY = 'kessel-sabacc-lang'

function detect(): Lang {
  // Tests and tools run in German, the language the keys are written in.
  if (typeof window === 'undefined') return 'de'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'de' || saved === 'en') return saved
  } catch {
    /* storage may be blocked; fall through to the browser's language */
  }
  return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en'
}

export const LANG: Lang = detect()

export function setLang(lang: Lang): void {
  if (lang === LANG) return
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* nothing to remember it in */
  }
  location.reload()
}

/** German text with `{0}`, `{1}` … where values go: the key of a translation. */
function keyOf(strings: readonly string[]): string {
  return strings.reduce((key, part, i) => key + (i > 0 ? `{${i - 1}}` : '') + part, '')
}

/** Translations that are still missing, for the developer to look at. */
export const missing = new Set<string>()

function translate(key: string): string {
  if (LANG === 'de') return key
  const found = EN[key]
  if (found === undefined) missing.add(key)
  return found ?? key
}

/**
 * Text in the current language, as a tagged template: tx`Noch ${n} wählen`.
 * Space around the text stays as written; it is not part of the key.
 */
export function tx(strings: TemplateStringsArray, ...values: unknown[]): string {
  const raw = keyOf(strings)
  const key = raw.trim()
  if (!key) return raw
  const start = raw.indexOf(key)
  const text = translate(key).replace(/\{(\d+)\}/g, (_, i: string) => String(values[Number(i)]))
  return raw.slice(0, start) + text + raw.slice(start + key.length)
}
