/**
 * A saved game as a line of text that can be copied to another device.
 * `KS1.<payload>.<checksum>`: the payload is the save as JSON in URL-safe
 * base64, the checksum catches a code that was cut short or mistyped.
 */
const PREFIX = 'KS1'

function checksum(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36).padStart(7, '0')
}

export function encodeSave(data: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${PREFIX}.${payload}.${checksum(payload)}`
}

export type Decoded = { ok: true; data: unknown } | { ok: false; reason: 'format' | 'damaged' | 'version' }

export function decodeSave(code: string): Decoded {
  // Messengers like to wrap long lines and add spaces.
  const parts = code.replace(/\s+/g, '').split('.')
  if (parts.length !== 3 || !/^KS\d+$/.test(parts[0])) return { ok: false, reason: 'format' }
  if (parts[0] !== PREFIX) return { ok: false, reason: 'version' }
  const [, payload, check] = parts
  if (checksum(payload) !== check) return { ok: false, reason: 'damaged' }
  try {
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) }
  } catch {
    return { ok: false, reason: 'damaged' }
  }
}
