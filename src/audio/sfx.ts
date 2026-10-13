import { useSettings } from '../store/settings'

/**
 * All sound is synthesised with the Web Audio API – no audio files.
 *
 *   effects ─┬────────────────┐
 *            └─► reverb ──────┼─► compressor ─► speakers
 *   ambience ─┴───────────────┘
 */
interface Graph {
  ctx: AudioContext
  effects: GainNode
  ambience: GainNode
  reverb: GainNode
  noise: AudioBuffer
}

let graph: Graph | null = null

function noiseBuffer(ctx: AudioContext, seconds: number, brown = false): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    // Brown noise: a leaky integrator over white noise – a soft rumble instead of a hiss.
    last = brown ? (last + 0.02 * white) / 1.02 : white
    data[i] = brown ? last * 3.5 : white
  }
  return buffer
}

/** Impulse response of a mid-sized room: decaying noise, duller towards the end. */
function roomImpulse(ctx: AudioContext): AudioBuffer {
  const seconds = 1.5
  const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    let smooth = 0
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length
      smooth += (Math.random() * 2 - 1 - smooth) * (1 - t * 0.85)
      data[i] = smooth * Math.pow(1 - t, 2.6)
    }
  }
  return buffer
}

function build(): Graph | null {
  if (graph) return graph
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()

    const out = ctx.createDynamicsCompressor()
    out.threshold.value = -16
    out.ratio.value = 4
    out.connect(ctx.destination)

    const effects = ctx.createGain()
    // Phone speakers are quiet; the compressor behind this catches the peaks.
    effects.gain.value = 1.6
    effects.connect(out)
    const reverb = ctx.createGain()
    const room = ctx.createConvolver()
    room.buffer = roomImpulse(ctx)
    const wet = ctx.createGain()
    wet.gain.value = 0.5
    reverb.connect(room).connect(wet).connect(out)

    // The whole room sits behind one fader, including its share of the reverb.
    const ambience = ctx.createGain()
    ambience.gain.value = 0
    ambience.connect(out)
    const ambienceRoom = ctx.createGain()
    ambienceRoom.gain.value = 0.7
    ambience.connect(ambienceRoom).connect(reverb)

    graph = { ctx, effects, ambience, reverb, noise: noiseBuffer(ctx, 2) }
    return graph
  } catch {
    return null
  }
}

// ── Getting sound out of a phone ─────────────────────────────────────────────

/**
 * iOS routes Web Audio through the "ambient" session by default, which the
 * ring/silent switch mutes. "playback" behaves like a media app instead.
 */
function applyAudioSession(): void {
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
  if (!session) return
  try {
    session.type = useSettings.getState().ignoreMute ? 'playback' : 'ambient'
  } catch {
    /* older Safari: keep the default */
  }
}

/**
 * Start (or restart) audio. Must run inside a real user gesture: browsers keep
 * an AudioContext suspended until then, and iOS suspends it again whenever the
 * app goes to the background.
 */
export function unlockAudio(): void {
  const g = build()
  if (!g) return
  applyAudioSession()
  if (g.ctx.state !== 'running') void g.ctx.resume().then(syncAmbience, () => undefined)
  // A silent blip inside the gesture is what actually opens the output on iOS.
  const blip = g.ctx.createBufferSource()
  blip.buffer = g.ctx.createBuffer(1, 1, g.ctx.sampleRate)
  blip.connect(g.ctx.destination)
  blip.start()
  syncAmbience()
}

/**
 * Keep audio unlocked for the lifetime of the page. `pointerdown` alone is not
 * enough – on iOS a touch only counts as a user gesture once the finger lifts.
 */
export function installAudioUnlock(): () => void {
  const events = ['touchend', 'pointerup', 'click', 'keydown'] as const
  const onGesture = () => {
    if (!graph || graph.ctx.state !== 'running') unlockAudio()
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') syncAmbience()
  }
  for (const e of events) window.addEventListener(e, onGesture, { capture: true, passive: true })
  document.addEventListener('visibilitychange', onVisible)
  const unsubscribe = useSettings.subscribe(() => {
    applyAudioSession()
    syncAmbience()
  })
  return () => {
    for (const e of events) window.removeEventListener(e, onGesture, { capture: true })
    document.removeEventListener('visibilitychange', onVisible)
    unsubscribe()
  }
}

// ── Building blocks ──────────────────────────────────────────────────────────

function live(): Graph | null {
  if (!useSettings.getState().sound) return null
  return graph && graph.ctx.state === 'running' ? graph : null
}

interface ToneOptions {
  type?: OscillatorType
  gain?: number
  delay?: number
  slideTo?: number
  /** 0…1: how much of the sound goes into the room reverb */
  room?: number
  attack?: number
}

function tone(freq: number, duration: number, o: ToneOptions = {}): void {
  const g = live()
  if (!g) return
  const start = g.ctx.currentTime + (o.delay ?? 0)
  const osc = g.ctx.createOscillator()
  const gain = g.ctx.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, start)
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, start + duration)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(o.gain ?? 0.12, start + (o.attack ?? 0.006))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  route(g, gain, o.room ?? 0.2)
  osc.start(start)
  osc.stop(start + duration + 0.03)
}

interface NoiseOptions {
  freq?: number
  sweepTo?: number
  q?: number
  filter?: BiquadFilterType
  gain?: number
  delay?: number
  room?: number
  attack?: number
}

function noise(duration: number, o: NoiseOptions = {}): void {
  const g = live()
  if (!g) return
  const start = g.ctx.currentTime + (o.delay ?? 0)
  const src = g.ctx.createBufferSource()
  src.buffer = g.noise
  const filter = g.ctx.createBiquadFilter()
  filter.type = o.filter ?? 'bandpass'
  filter.frequency.setValueAtTime(o.freq ?? 2400, start)
  if (o.sweepTo) filter.frequency.exponentialRampToValueAtTime(o.sweepTo, start + duration)
  filter.Q.value = o.q ?? 0.8
  const gain = g.ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(o.gain ?? 0.18, start + (o.attack ?? 0.004))
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  src.connect(filter).connect(gain)
  route(g, gain, o.room ?? 0.2)
  src.start(start, Math.random(), duration + 0.03)
}

function route(g: Graph, node: AudioNode, room: number): void {
  node.connect(g.effects)
  if (room > 0) {
    const send = g.ctx.createGain()
    send.gain.value = room
    node.connect(send).connect(g.reverb)
  }
}

function buzz(pattern: number | number[]): void {
  if (!useSettings.getState().haptics) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported (e.g. iOS) */
  }
}

const jitter = (amount: number) => 1 + (Math.random() - 0.5) * amount

// ── Sound effects ────────────────────────────────────────────────────────────

export const sfx = {
  tap() {
    tone(680, 0.045, { type: 'triangle', gain: 0.05, slideTo: 520, room: 0.05 })
    buzz(8)
  },
  /** A card sliding over felt and landing. */
  card(delay = 0) {
    noise(0.13, { freq: 2600 * jitter(0.3), sweepTo: 900, q: 0.7, gain: 0.16, delay, attack: 0.02 })
    tone(150 * jitter(0.2), 0.07, { gain: 0.1, slideTo: 85, delay: delay + 0.09, room: 0.3 })
  },
  deal(count: number) {
    for (let i = 0; i < count; i++) sfx.card(i * 0.12)
  },
  /** Ceramic chips clacking onto each other. */
  chip(count = 1) {
    for (let i = 0; i < Math.min(count, 5); i++) {
      const delay = i * 0.075 + Math.random() * 0.015
      noise(0.025, { filter: 'highpass', freq: 3200, gain: 0.12, delay })
      tone(2500 * jitter(0.25), 0.07, { type: 'triangle', gain: 0.07, delay, room: 0.35 })
      tone(3900 * jitter(0.2), 0.045, { gain: 0.035, delay, room: 0.35 })
    }
    buzz(10)
  },
  /** Two knuckle knocks on the table. */
  stand() {
    for (const delay of [0, 0.12]) {
      tone(125, 0.09, { gain: 0.16, slideTo: 70, delay, room: 0.4 })
      noise(0.03, { freq: 700, q: 1.5, gain: 0.07, delay })
    }
  },
  /** A shift token powering up. */
  token() {
    tone(180, 0.55, { type: 'sawtooth', gain: 0.045, slideTo: 720, room: 0.6, attack: 0.05 })
    noise(0.5, { freq: 900, sweepTo: 6500, q: 3, gain: 0.07, room: 0.6, attack: 0.25 })
    ;[660, 990, 1320].forEach((f, i) => tone(f, 0.45, { gain: 0.07, delay: 0.3 + i * 0.07, room: 0.7 }))
    buzz([12, 40, 24])
  },
  blocked() {
    tone(220, 0.14, { type: 'square', gain: 0.045, slideTo: 180 })
    tone(165, 0.2, { type: 'square', gain: 0.045, slideTo: 130, delay: 0.13 })
  },
  /** Dice rattling across the table, then settling. */
  dice() {
    let t = 0
    for (let i = 0; i < 9; i++) {
      noise(0.03, { freq: 1700 + Math.random() * 1600, q: 4, gain: 0.17 - i * 0.008, delay: t, room: 0.3 })
      tone(900 * jitter(0.5), 0.03, { type: 'triangle', gain: 0.04, delay: t })
      t += 0.05 + i * 0.012 + Math.random() * 0.02
    }
    buzz([8, 60, 8, 60, 8])
  },
  /** The table falls silent: a swell and a low hit as the cards turn over. */
  reveal() {
    noise(0.7, { freq: 400, sweepTo: 3200, q: 1.2, gain: 0.08, attack: 0.55, room: 0.6 })
    tone(82, 0.5, { gain: 0.22, slideTo: 44, delay: 0.62, room: 0.5 })
    noise(0.08, { freq: 500, q: 1, gain: 0.1, delay: 0.62 })
  },
  win() {
    ;[523, 659, 784, 1047].forEach((f, i) => {
      tone(f, 0.4, { type: 'triangle', gain: 0.1, delay: i * 0.1, room: 0.6 })
      tone(f * 2, 0.25, { gain: 0.03, delay: i * 0.1, room: 0.6 })
    })
    buzz([20, 50, 20, 50, 60])
  },
  lose() {
    ;[392, 311, 233].forEach((f, i) => tone(f, 0.5, { type: 'triangle', gain: 0.09, delay: i * 0.16, room: 0.6 }))
    tone(70, 0.5, { gain: 0.16, slideTo: 40, delay: 0.5, room: 0.4 })
    buzz(120)
  },
  /** A shimmer for a Sabacc. */
  sabacc() {
    ;[1319, 1760, 2093, 2637].forEach((f, i) => tone(f, 0.6, { gain: 0.05, delay: i * 0.06, room: 0.8 }))
  },
  /** The dealer calls the next round. */
  round() {
    tone(392, 0.22, { type: 'triangle', gain: 0.06, room: 0.6 })
    tone(587, 0.4, { type: 'triangle', gain: 0.06, delay: 0.14, room: 0.6 })
  },
  /** A quiet chime: it is your turn. */
  turn() {
    tone(880, 0.25, { gain: 0.045, room: 0.5 })
    tone(1320, 0.35, { gain: 0.04, delay: 0.09, room: 0.5 })
  },
  /**
   * A few syllables of alien gibberish. `hue` gives every character their own
   * pitch; droids beep instead.
   */
  voice(hue: number, syllables: number, droid = false) {
    const base = droid ? 520 + (hue % 90) * 3 : 115 + (hue % 180) * 0.9
    let t = 0
    for (let i = 0; i < syllables; i++) {
      const pitch = base * (0.85 + Math.random() * 0.45)
      const length = 0.06 + Math.random() * 0.07
      if (droid) {
        tone(pitch, length, { type: 'square', gain: 0.03, slideTo: pitch * (Math.random() > 0.5 ? 1.5 : 0.7), delay: t, room: 0.3 })
      } else {
        tone(pitch, length, { type: 'sawtooth', gain: 0.05, slideTo: pitch * (0.8 + Math.random() * 0.4), delay: t, room: 0.5, attack: 0.015 })
        noise(length, { freq: 600 + Math.random() * 900, q: 4, gain: 0.05, delay: t, room: 0.5, attack: 0.015 })
      }
      t += length + 0.02 + Math.random() * 0.05
    }
  },
  eliminated() {
    tone(60, 0.9, { gain: 0.25, slideTo: 32, room: 0.6 })
    noise(0.4, { filter: 'lowpass', freq: 300, gain: 0.12, room: 0.5 })
  },
}

// ── Cantina ambience ─────────────────────────────────────────────────────────

let ambienceLevel = 0
let ambienceStarted = false
/** how busy and how mechanical the current room sounds, 1 = normal */
let ambienceMix = { crowd: 1, hum: 1 }
let ambienceParts: { crowd: GainNode; hum: GainNode } | null = null

/** How present the room is: 0 = off, 1 = sitting at the table. */
export function setAmbience(level: number): void {
  ambienceLevel = level
  syncAmbience()
}

/** Every venue has its own balance of voices and machinery. */
export function setAmbienceMix(mix: { crowd: number; hum: number }): void {
  ambienceMix = mix
  syncAmbience()
}

function syncAmbience(): void {
  const g = graph
  if (!g || g.ctx.state !== 'running') return
  const { ambience, sound } = useSettings.getState()
  const target = ambience && sound && document.visibilityState === 'visible' ? ambienceLevel : 0
  if (target > 0 && !ambienceStarted) startAmbience(g)
  g.ambience.gain.setTargetAtTime(target, g.ctx.currentTime, 0.6)
  if (ambienceParts) {
    ambienceParts.crowd.gain.setTargetAtTime(ambienceMix.crowd, g.ctx.currentTime, 0.8)
    ambienceParts.hum.gain.setTargetAtTime(ambienceMix.hum, g.ctx.currentTime, 0.8)
  }
}

function startAmbience(g: Graph): void {
  ambienceStarted = true
  const { ctx } = g
  const loop = (buffer: AudioBuffer) => {
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.start(0, Math.random() * buffer.duration)
    return src
  }
  const crowd = ctx.createGain()
  crowd.gain.value = ambienceMix.crowd
  crowd.connect(g.ambience)
  const hum = ctx.createGain()
  hum.gain.value = ambienceMix.hum
  hum.connect(g.ambience)
  ambienceParts = { crowd, hum }
  const toRoom = (node: AudioNode, level: number, bus: AudioNode = g.ambience) => {
    const out = ctx.createGain()
    out.gain.value = level
    node.connect(out).connect(bus)
  }

  // Air and distance: a low, soft rumble.
  const air = ctx.createBiquadFilter()
  air.type = 'lowpass'
  air.frequency.value = 420
  loop(noiseBuffer(ctx, 5, true)).connect(air)
  toRoom(air, 0.16)

  // Machinery somewhere in the walls.
  for (const [freq, level] of [[55, 0.03], [82.5, 0.014], [110.4, 0.008]] as const) {
    const osc = ctx.createOscillator()
    osc.frequency.value = freq
    const wobble = ctx.createOscillator()
    wobble.frequency.value = 0.07 + Math.random() * 0.1
    const depth = ctx.createGain()
    depth.gain.value = level * 0.4
    const gain = ctx.createGain()
    gain.gain.value = level
    wobble.connect(depth).connect(gain.gain)
    osc.connect(gain)
    toRoom(gain, 1, hum)
    osc.start()
    wobble.start()
  }

  // A crowd at the other tables: band-limited noise shaped into syllables.
  const voices = Array.from({ length: 6 }, () => {
    const formant = ctx.createBiquadFilter()
    formant.type = 'bandpass'
    const base = 260 + Math.random() * 520
    formant.frequency.value = base
    formant.Q.value = 5
    const gain = ctx.createGain()
    gain.gain.value = 0
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    loop(g.noise).connect(formant).connect(gain).connect(pan)
    toRoom(pan, 0.3, crowd)
    return { formant, gain, base, talking: false, until: 0 }
  })
  const clink = () => {
    const at = ctx.currentTime + 0.05
    for (const [freq, delay] of [[2900 * jitter(0.4), 0], [4300 * jitter(0.3), 0.03]] as const) {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, at + delay)
      gain.gain.exponentialRampToValueAtTime(0.05, at + delay + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + delay + 0.5)
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.random() * 1.8 - 0.9
      osc.connect(gain).connect(pan)
      toRoom(pan, 0.5)
      osc.start(at + delay)
      osc.stop(at + delay + 0.6)
    }
  }

  let nextClink = ctx.currentTime + 4
  setInterval(() => {
    if (ctx.state !== 'running' || ambienceLevel <= 0) return
    const now = ctx.currentTime
    for (const v of voices) {
      if (now > v.until) {
        // Switch between a few seconds of talking and a pause.
        v.talking = !v.talking
        v.until = now + (v.talking ? 1.5 + Math.random() * 4 : 1 + Math.random() * 5)
      }
      if (!v.talking || Math.random() > 0.45) continue
      const length = 0.09 + Math.random() * 0.16
      v.formant.frequency.setTargetAtTime(v.base * (0.75 + Math.random() * 0.7), now, 0.04)
      v.gain.gain.setTargetAtTime(0.25 + Math.random() * 0.75, now, 0.03)
      v.gain.gain.setTargetAtTime(0, now + length, 0.05)
    }
    if (now > nextClink) {
      clink()
      nextClink = now + 5 + Math.random() * 14
    }
  }, 110)
}

/** Lets a developer inspect levels from the browser console. */
export function audioGraph(): Readonly<Graph> | null {
  return graph
}
