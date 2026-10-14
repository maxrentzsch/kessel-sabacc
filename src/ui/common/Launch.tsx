import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { launchScore } from '../../audio/sfx'
import { KESSEL_SECTOR } from '../../career/maps'
import { cx } from '../cx'
import s from './Launch.module.css'
import { tx } from '../../i18n'

interface Props {
  onDone(): void
  /** watched again from the profile: it may be skipped straight away */
  replay?: boolean
}

/** The six shots, in seconds from the start. */
const SHOTS = [
  { from: 0, to: 5.2 },
  { from: 5, to: 9.2 },
  { from: 9, to: 14.2 },
  { from: 14, to: 19.2 },
  { from: 19, to: 24.2 },
  { from: 24, to: 31 },
] as const
const LENGTH = 31
/** with reduced motion: the hangar, above the clouds, the sector – a few seconds each */
const SHORT = [0, 3, 5] as const
const SHORT_SHOT = 3.6

/** what each shot says, in the voice of the story's narrator */
const CAPTIONS = [
  tx`Mira legt die Schalter um. Die Triebwerke husten.`,
  tx`Dann singen sie.`,
  tx`Durch den Sturm, hinauf.`,
  tx`Über den Wolken geht die Sonne auf.`,
  tx`Tarsk wird klein.`,
  tx`Der Kessel-Sektor.`,
]

/** The freighter from the side: hull, cockpit, engine. Faces right. */
function Freighter({ glow }: { glow: number }) {
  return (
    <g>
      <ellipse cx="-118" cy="6" rx={30 + glow * 60} ry={10 + glow * 10} fill="url(#launch-flame)" opacity={0.35 + glow * 0.65} />
      <path d="M-110-18h150c26 0 52 10 66 24-14 14-40 24-66 24h-150l-10-12v-24z" fill="#3d4448" />
      <path d="M-110-18h150c26 0 52 10 66 24h-226z" fill="#5a6468" />
      <path d="M58-10c12 2 24 7 32 14-8 2-18 3-30 3z" fill="#ffd9a0" />
      <rect x="-120" y="-10" width="12" height="32" rx="3" fill="#2a2f32" />
      <path d="M-70 30v14M30 30v14" stroke="#2a2f32" strokeWidth="5" strokeLinecap="round" />
      <path d="M-90-4h110" stroke="#2a2f32" strokeWidth="2" opacity="0.6" />
    </g>
  )
}

/**
 * The launch from Tarsk: the end of the prologue and the moment the game
 * opens up. Pictures are layers faded in and out on one timeline; sand and
 * stars are drawn on a canvas. The last picture becomes the sector chart.
 */
export function Launch({ onDone, replay = false }: Props) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const canvas = useRef<HTMLCanvasElement>(null)
  const [canSkip, setCanSkip] = useState(replay)
  // With reduced motion the pictures are switched, not animated: which one is showing.
  const [still, setStill] = useState(0)
  // On a tall screen only the middle of the square picture fits; everything that matters stands there.
  const [tall, setTall] = useState(() => typeof window !== 'undefined' && window.innerHeight > window.innerWidth)
  useEffect(() => {
    const onResize = () => setTall(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const done = useRef(onDone)
  done.current = onDone

  // Timing of each shot on the clock that is actually played.
  const window_ = (i: number) =>
    reduced ? { from: SHORT.indexOf(i as 0 | 3 | 5) * SHORT_SHOT, to: (SHORT.indexOf(i as 0 | 3 | 5) + 1) * SHORT_SHOT } : SHOTS[i]
  const shown = (i: number) => !reduced || (SHORT as readonly number[]).includes(i)
  const total = reduced ? SHORT.length * SHORT_SHOT : LENGTH

  useEffect(() => {
    const stop = reduced ? () => {} : launchScore()
    const skip = setTimeout(() => setCanSkip(true), 3000)
    const end = setTimeout(() => done.current(), total * 1000)
    const switches = reduced ? SHORT.slice(1).map((shot, i) => setTimeout(() => setStill(shot), (i + 1) * SHORT_SHOT * 1000)) : []
    return () => {
      stop()
      clearTimeout(skip)
      clearTimeout(end)
      switches.forEach(clearTimeout)
    }
  }, [reduced, total])

  // Sand in the wind and stars in the dark, drawn frame by frame.
  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    let frame = 0
    const start = performance.now()
    const rnd = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453
      return x - Math.floor(x)
    }
    const draw = (now: number) => {
      const t = (now - start) / 1000
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== Math.round(w * dpr)) {
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (!reduced) {
        // ignition blows sand sideways, the climb drags it past downwards
        const blowing = t > 5 && t < 9.4
        const climbing = t > 9 && t < 14.4
        if (blowing || climbing) {
          ctx.fillStyle = 'rgb(232 186 120 / 0.55)'
          for (let i = 0; i < 160; i++) {
            const speed = 0.4 + rnd(i) * 0.9
            if (blowing) {
              const x = ((rnd(i + 1) * w + t * w * speed * 1.6) % (w * 1.2)) - w * 0.1
              const y = h * 0.55 + rnd(i + 2) * h * 0.45
              ctx.fillRect(x, y, 6 + speed * 10, 1.4)
            } else {
              const x = rnd(i + 3) * w
              const y = (rnd(i + 4) * h + t * h * speed * 2.2) % h
              ctx.fillRect(x, y, 1.4, 10 + speed * 22)
            }
          }
        }
      }
      // stars come out once the sky turns black; in the last shot the sky turns with the camera
      const starsFrom = reduced ? SHORT_SHOT * 2 : 19
      if (t > starsFrom - 0.5) {
        const fade = Math.min(1, (t - starsFrom + 0.5) / 2.5)
        const turn = reduced ? 0 : Math.max(0, t - 24) * 0.012
        ctx.save()
        ctx.translate(w / 2, h / 2)
        ctx.rotate(turn)
        for (let i = 0; i < 260; i++) {
          const r = Math.max(w, h) * 0.75
          const x = (rnd(i + 7) - 0.5) * 2 * r
          const y = (rnd(i + 8) - 0.5) * 2 * r
          ctx.globalAlpha = fade * (0.25 + rnd(i + 9) * 0.75)
          ctx.fillStyle = '#fff'
          ctx.fillRect(x, y, 1 + rnd(i + 10) * 1.4, 1 + rnd(i + 10) * 1.4)
        }
        ctx.restore()
        ctx.globalAlpha = 1
      }
      if (t < total) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [reduced, total])

  // The sector's worlds, placed as on the chart the sequence ends on.
  const worlds = KESSEL_SECTOR.places
  // into the middle of the picture, small enough to fit its tall column too
  const at = (x: number, y: number) => ({ x: 230 + x * 0.95, y: 250 + y * 0.95 })

  const layer = (i: number) => {
    if (reduced) return { className: s.still, style: { opacity: still === i ? 1 : 0 } }
    const { from, to } = window_(i)
    return { className: s.shot, style: { animationDelay: `${from}s`, animationDuration: `${to - from}s` } }
  }

  return (
    <motion.div className={s.launch} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <svg className={s.stage} viewBox={tall ? '200 0 400 800' : '0 0 800 800'} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id="launch-flame">
            <stop offset="0" stopColor="#d2fffb" />
            <stop offset="0.4" stopColor="#76ece4" />
            <stop offset="1" stopColor="#76ece4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="launch-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#05070c" />
            <stop offset="0.7" stopColor="#1a1c26" />
            <stop offset="1" stopColor="#3a2a18" />
          </linearGradient>
          <linearGradient id="launch-storm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a3a1c" />
            <stop offset="1" stopColor="#2a1a0c" />
          </linearGradient>
          <linearGradient id="launch-dawn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d1a2e" />
            <stop offset="0.55" stopColor="#5a4a6a" />
            <stop offset="0.8" stopColor="#f0a050" />
            <stop offset="1" stopColor="#ffe2a0" />
          </linearGradient>
          <radialGradient id="launch-flood" cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#ffe9b8" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffe9b8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="launch-tarsk" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#f0c27f" />
            <stop offset="0.6" stopColor="#c98a45" />
            <stop offset="1" stopColor="#4a2a12" />
          </radialGradient>
        </defs>

        {/* 1 · the hangar at night: the ship on the pad, floodlights, Pim waving */}
        {shown(0) && (
          <g {...layer(0)}>
            <rect width="800" height="800" fill="url(#launch-night)" />
            {[120, 210, 560, 640, 700].map((x, i) => (
              <rect key={x} x={x} y={470 - i * 6} width={22 + i * 4} height={60 + i * 10} fill="#11141c" />
            ))}
            {[250, 560].map((x) => (
              <path key={x} d={`M${x} 300l-90 300h180z`} fill="url(#launch-flood)" />
            ))}
            <ellipse cx="400" cy="560" rx="300" ry="34" fill="#2a2016" stroke="#ffd38a" strokeOpacity="0.4" strokeDasharray="6 8" />
            <g transform="translate(390 500) scale(1.1)">
              <g className={reduced ? undefined : s.cough}>
                <Freighter glow={0.15} />
              </g>
            </g>
            {/* Pim with his torch */}
            <g transform="translate(560 552) scale(0.9)">
              <circle cy="-46" r="9" fill="#141820" />
              <path d="M-12 0c0-24 4-36 12-36s12 12 12 36z" fill="#141820" />
              <path d="M10-30l18-18" stroke="#141820" strokeWidth="4" strokeLinecap="round" />
              <circle cx="30" cy="-50" r="4" fill="#ffe6a0" className={reduced ? undefined : s.spark} />
            </g>
          </g>
        )}

        {/* 2 · ignition: closer, the engine roaring, everything shaking */}
        {shown(1) && (
          <g {...layer(1)}>
            <rect width="800" height="800" fill="url(#launch-night)" />
            <ellipse cx="400" cy="600" rx="420" ry="60" fill="#3a2a18" />
            <g className={s.shake}>
              <g transform="translate(400 470) scale(1.55)">
                <Freighter glow={1} />
              </g>
            </g>
          </g>
        )}

        {/* 3 · the climb through the sandstorm, the lights of Tarsk falling away */}
        {shown(2) && (
          <g {...layer(2)}>
            <rect width="800" height="800" fill="url(#launch-storm)" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <circle key={i} cx={160 + i * 80} cy={760 - (i % 3) * 14} r="3" fill="#ffd38a" className={s.cityLight} />
            ))}
            <g className={s.climb}>
              <g transform="translate(400 420) rotate(-62) scale(0.9)">
                <Freighter glow={1} />
              </g>
            </g>
          </g>
        )}

        {/* 4 · above the clouds: the curve of the planet, the sun coming up */}
        {shown(3) && (
          <g {...layer(3)}>
            <rect width="800" height="800" fill="url(#launch-dawn)" />
            <circle cx="400" cy="1640" r="1100" fill="#e9c89a" opacity="0.25" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <ellipse key={i} cx={40 + i * 110} cy={620 + (i % 2) * 18} rx="120" ry="40" fill="#f6ead6" opacity="0.85" />
            ))}
            <rect y="640" width="800" height="160" fill="#f6ead6" opacity="0.9" />
            <circle cx="500" cy="572" r="30" fill="#fff3d0" />
            <g className={s.cruise}>
              <g transform="translate(330 420) rotate(-10) scale(0.55)">
                <Freighter glow={0.7} />
              </g>
            </g>
          </g>
        )}

        {/* 5 · into the black: Tarsk turning into a small round world */}
        {shown(4) && (
          <g {...layer(4)}>
            <rect width="800" height="800" fill="#04060a" opacity="0.6" />
            <g className={s.shrink} style={{ transformOrigin: '400px 520px' }}>
              <circle cx="400" cy="520" r="160" fill="url(#launch-tarsk)" />
            </g>
          </g>
        )}

        {/* 6 · the sector: world after world lights up, the routes draw themselves, and it becomes the chart */}
        {shown(5) && (
          <g {...layer(5)}>
            {KESSEL_SECTOR.routes.map(({ from, to }, i) => {
              const a = worlds.find((p) => p.id === from)!
              const b = worlds.find((p) => p.id === to)!
              const pa = at(a.x, a.y)
              const pb = at(b.x, b.y)
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M${pa.x} ${pa.y}L${pb.x} ${pb.y}`}
                  className={s.route}
                  style={{ animationDelay: `${window_(5).from + 1 + i * 0.6}s` }}
                  pathLength={1}
                />
              )
            })}
            {worlds.map((p, i) => {
              const { x, y } = at(p.x, p.y)
              return (
                <g key={p.id} className={s.world} style={{ animationDelay: `${window_(5).from + 0.4 + i * 0.55}s` }}>
                  <circle cx={x} cy={y} r={p.r * 1.4} fill={p.opens ? '#c98a45' : '#76ece4'} opacity="0.9" />
                  <circle cx={x} cy={y} r={p.r * 2.6} fill="none" stroke="#76ece4" strokeOpacity="0.35" />
                </g>
              )
            })}
          </g>
        )}
      </svg>

      <canvas ref={canvas} className={s.particles} aria-hidden />

      <div className={s.captions} aria-live="polite">
        {CAPTIONS.map((text, i) =>
          shown(i) ? (
            <p
              key={i}
              className={cx(s.caption, reduced ? s.still : s.shot)}
              style={reduced ? { opacity: still === i ? 1 : 0 } : { animationDelay: `${window_(i).from + 0.6}s`, animationDuration: `${window_(i).to - window_(i).from - 0.6}s` }}
            >
              {text}
            </p>
          ) : null,
        )}
      </div>

      {canSkip && (
        <button className={s.skip} onClick={() => done.current()}>
          {tx`Überspringen`}
        </button>
      )}
    </motion.div>
  )
}
