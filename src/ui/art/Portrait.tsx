import { motion } from 'motion/react'
import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Character } from '../../ai/personalities'
import { cx } from '../cx'
import s from './Portrait.module.css'

export type Mood = 'idle' | 'thinking' | 'happy' | 'smug' | 'angry' | 'worried' | 'out'

/** How a mood moves the features of a face. */
interface Face {
  /** eye openness, 1 = normal */
  eye: number
  /** brow tilt in degrees; negative pulls the inner ends down (a scowl) */
  brow: number
  browLift: number
  /** mouth curve; positive smiles */
  mouth: number
  /** how far the mouth is open */
  open: number
  /** where the eyes look, in pixels downwards */
  look: number
  /** head tilt in degrees */
  tilt: number
}

const FACES: Record<Mood, Face> = {
  idle: { eye: 1, brow: 0, browLift: 0, mouth: 2, open: 0, look: 0, tilt: 0 },
  thinking: { eye: 0.82, brow: 6, browLift: -1.5, mouth: 0, open: 0, look: 2.6, tilt: -4 },
  happy: { eye: 0.68, brow: 5, browLift: -2.5, mouth: 8, open: 2.5, look: 0, tilt: 3 },
  smug: { eye: 0.52, brow: -5, browLift: -1, mouth: 5, open: 0, look: 0, tilt: 5 },
  angry: { eye: 0.7, brow: -22, browLift: 2, mouth: -7, open: 0, look: 0, tilt: 0 },
  worried: { eye: 1.18, brow: 17, browLift: -2, mouth: -3, open: 2, look: 0, tilt: -2 },
  out: { eye: 0.1, brow: 12, browLift: 1, mouth: -6, open: 0, look: 0, tilt: -9 },
}

const SPRING = { type: 'spring', stiffness: 260, damping: 20 } as const
const SIDES = [-1, 1] as const

interface Palette {
  skin: string
  shade: string
  light: string
  cloth: string
  clothDark: string
  glow: string
}

function palette(hue: number): Palette {
  return {
    skin: `hsl(${hue} 42% 52%)`,
    shade: `hsl(${hue} 44% 36%)`,
    light: `hsl(${hue} 52% 66%)`,
    cloth: `hsl(${(hue + 160) % 360} 22% 30%)`,
    clothDark: `hsl(${(hue + 160) % 360} 24% 19%)`,
    glow: `hsl(${hue} 95% 72%)`,
  }
}

function Shoulders({ p }: { p: Palette }) {
  return (
    <g>
      <path d="M10 132C11 106 34 98 60 98s49 8 50 34z" fill={p.cloth} />
      <path d="M44 99l16 16 16-16" fill="none" stroke={p.clothDark} strokeWidth="5" strokeLinejoin="round" />
    </g>
  )
}

// ── Faces of flesh and blood ─────────────────────────────────────────────────

function Eyes({ f, rx, ry, slant = 0, y = 56, gap = 11 }: { f: Face; rx: number; ry: number; slant?: number; y?: number; gap?: number }) {
  return (
    <>
      {SIDES.map((side) => (
        <g key={side} transform={`translate(${60 + side * gap} ${y})`}>
          <motion.g initial={false} animate={{ scaleY: f.eye }} transition={SPRING}>
            <g className={s.blink}>
              <ellipse rx={rx} ry={ry} fill="#0c0e13" transform={`rotate(${side * slant})`} />
              <motion.circle cx={-rx * 0.3} r={rx * 0.3} fill="#fff" opacity="0.85" initial={false} animate={{ cy: -ry * 0.32 + f.look }} />
            </g>
          </motion.g>
        </g>
      ))}
    </>
  )
}

function Brows({ f, color, y = 45, gap = 11, width = 7.5 }: { f: Face; color: string; y?: number; gap?: number; width?: number }) {
  return (
    <>
      {SIDES.map((side) => (
        <g key={side} transform={`translate(${60 + side * gap} ${y})`}>
          <motion.path
            d={`M${-width} 0H${width}`}
            stroke={color}
            strokeWidth="3.4"
            strokeLinecap="round"
            initial={false}
            animate={{ rotate: side * f.brow, y: f.browLift }}
            transition={SPRING}
          />
        </g>
      ))}
    </>
  )
}

function Mouth({ f, talking, y = 76, width = 9 }: { f: Face; talking: boolean; y?: number; width?: number }) {
  const d = `M${60 - width} ${y}Q60 ${y + f.mouth} ${60 + width} ${y}Q60 ${y + f.mouth + f.open * 2} ${60 - width} ${y}Z`
  return (
    <g className={cx(talking && s.talk)}>
      <motion.path d={d} initial={false} animate={{ d }} transition={SPRING} fill="#190b0c" stroke="#190b0c" strokeWidth="2.6" strokeLinejoin="round" />
    </g>
  )
}

function Horned({ f, p, talking }: FaceProps) {
  return (
    <>
      <path d="M40 44C30 34 30 20 36 10c3 12 8 20 16 25zM80 44c10-10 10-24 4-34-3 12-8 20-16 25z" fill="#e6dcc4" stroke="#8d8368" strokeWidth="1.500" />
      <path d="M36 56l-9-7 5 15zM84 56l9-7-5 15z" fill={p.shade} />
      <rect x="51" y="82" width="18" height="18" fill={p.shade} />
      <ellipse cx="60" cy="59" rx="24" ry="29" fill={p.skin} />
      <path d="M60 31c12 0 22 10 23 24-6-9-14-14-23-14s-17 5-23 14c1-14 11-24 23-24z" fill={p.light} opacity="0.5" />
      <Brows f={f} color={p.shade} />
      <Eyes f={f} rx={4.6} ry={5.6} />
      <path d="M58 61v7h4" fill="none" stroke={p.shade} strokeWidth="2" strokeLinecap="round" />
      <Mouth f={f} talking={talking} />
    </>
  )
}

function Crested({ f, p, talking }: FaceProps) {
  return (
    <>
      <path d="M60 2c8 10 13 22 13 34H47c0-12 5-24 13-34z" fill={p.shade} />
      <path d="M60 8c4 8 6 16 6 26h-12c0-10 2-18 6-26z" fill={p.light} opacity="0.6" />
      <rect x="52" y="82" width="16" height="18" fill={p.shade} />
      <path d="M60 30c15 0 25 12 25 27 0 16-11 31-25 31S35 73 35 57c0-15 10-27 25-27z" fill={p.skin} />
      <Brows f={f} color={p.shade} y={43} gap={12} width={8.500} />
      <Eyes f={f} rx={8} ry={9.5} slant={-18} y={57} gap={12} />
      <Mouth f={f} talking={talking} y={79} width={6} />
    </>
  )
}

function Tusked({ f, p, talking }: FaceProps) {
  return (
    <>
      <rect x="48" y="84" width="24" height="16" fill={p.shade} />
      <path d="M30 56c0-16 12-27 30-27s30 11 30 27v10c0 15-13 26-30 26S30 81 30 66z" fill={p.skin} />
      <path d="M32 50c5-10 15-15 28-15s23 5 28 15c-9-4-18-6-28-6s-19 2-28 6z" fill={p.shade} />
      <Brows f={f} color="#241812" y={49} gap={13} width={8.500} />
      <Eyes f={f} rx={3.8} ry={4.4} y={58} gap={13} />
      <path d="M52 64c3 3 13 3 16 0" fill="none" stroke={p.shade} strokeWidth="2.400" strokeLinecap="round" />
      <Mouth f={f} talking={talking} y={78} width={13} />
      <path d="M44 80c-2-6-1-12 2-16 3 4 4 10 3 16zM76 80c2-6 1-12-2-16-3 4-4 10-3 16z" fill="#efe6d0" stroke="#8d8368" strokeWidth="1.200" />
    </>
  )
}

// ── Faces behind glass, cloth and metal ──────────────────────────────────────

function Visored({ f, p, talking }: FaceProps) {
  return (
    <>
      <rect x="50" y="84" width="20" height="16" fill={p.clothDark} />
      <path d="M32 62c0-20 11-34 28-34s28 14 28 34c0 17-12 29-28 29S32 79 32 62z" fill={p.skin} />
      <path d="M36 50c4-12 13-19 24-19s20 7 24 19c-8-3-16-4-24-4s-16 1-24 4z" fill={p.light} opacity="0.55" />
      <path d="M33 52h54a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5v-6a5 5 0 0 1 5-5z" fill="#0b0d12" stroke={p.shade} strokeWidth="2" />
      <g className={cx(talking && s.flicker)}>
        {SIDES.map((side) => (
          <g key={side} transform={`translate(${60 + side * 13} 60)`}>
            <motion.rect x="-7" y="-3" width="14" height="6" rx="3" fill={p.glow} initial={false} animate={{ scaleY: f.eye, rotate: side * f.brow * 0.7 }} transition={SPRING} />
          </g>
        ))}
      </g>
      <path d="M50 78h20M53 83h14" stroke={p.shade} strokeWidth="2.400" strokeLinecap="round" />
    </>
  )
}

function Hooded({ f, p, talking }: FaceProps) {
  return (
    <>
      <path d="M60 14c22 4 34 24 33 50l-7 36H34l-7-36c-1-26 11-46 33-50z" fill={p.cloth} />
      <path d="M60 14c22 4 34 24 33 50l-4 20c0-28-10-48-29-56z" fill={p.clothDark} opacity="0.7" />
      <path d="M60 30c13 3 21 16 20 32l-4 22H44l-4-22c-1-16 7-29 20-32z" fill="#07080b" />
      <g className={cx(s.breatheGlow, talking && s.flicker)}>
        {SIDES.map((side) => (
          <g key={side} transform={`translate(${60 + side * 9.500} 58)`}>
            <motion.ellipse rx="5.200" ry="3.200" fill={p.glow} initial={false} animate={{ scaleY: f.eye, rotate: side * f.brow * 0.8 }} transition={SPRING} />
          </g>
        ))}
      </g>
    </>
  )
}

const DROID_EYE: Record<Mood, string> = {
  idle: '#76ece4',
  thinking: '#f4f1ea',
  happy: '#8fe39a',
  smug: '#76ece4',
  angry: '#ff5a4d',
  worried: '#f2c23a',
  out: '#39424a',
}

function Droid({ f, p, talking, mood }: FaceProps) {
  return (
    <>
      <motion.g initial={false} animate={{ rotate: mood === 'worried' ? 14 : mood === 'angry' ? -10 : 0 }} style={{ originX: 0.5, originY: 1 }} transition={SPRING}>
        <path d="M60 32V14" stroke="#8b949a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="12" r="4" fill={DROID_EYE[mood]} />
      </motion.g>
      <rect x="50" y="84" width="20" height="16" fill="#3d464c" />
      <rect x="30" y="32" width="60" height="56" rx="12" fill="#aeb6ba" stroke="#59636a" strokeWidth="2" />
      <rect x="35" y="37" width="50" height="14" rx="5" fill="#d3d9dc" opacity="0.6" />
      <circle cx="60" cy="58" r="14" fill="#0b0d12" stroke="#59636a" strokeWidth="2" />
      <motion.circle cx="60" cy="58" fill={DROID_EYE[mood]} initial={false} animate={{ r: 4 + 5.500 * Math.min(1, f.eye), cy: 58 + f.look * 0.6 }} transition={SPRING} className={cx(mood === 'thinking' && s.flicker)} />
      <g className={cx(talking && s.grill)} fill={p.glow}>
        <rect x="45" y="76" width="4" height="7" rx="1" />
        <rect x="52" y="76" width="4" height="7" rx="1" />
        <rect x="59" y="76" width="4" height="7" rx="1" />
        <rect x="66" y="76" width="4" height="7" rx="1" />
        <rect x="73" y="76" width="4" height="7" rx="1" />
      </g>
    </>
  )
}

interface FaceProps {
  f: Face
  p: Palette
  talking: boolean
  mood: Mood
}

const HEADS: Record<Character['sigil'], (props: FaceProps) => ReactNode> = {
  horns: Horned,
  crest: Crested,
  tusks: Tusked,
  visor: Visored,
  hood: Hooded,
  droid: Droid,
}

interface Props {
  /** `null` draws the player. */
  character: Character | null
  mood?: Mood
  talking?: boolean
  /** breathing, blinking and the like; off for small static uses */
  alive?: boolean
  size?: number | string
  /** set the portrait in the six-sided frame of the table's readouts */
  frame?: boolean
}

/** The frame around a portrait: the outline of a card. */
const FRAME = 'M36 4H84L116 65L84 126H36L4 65Z'

export function Portrait({ character, mood = 'idle', talking = false, alive = false, size = 44, frame = false }: Props) {
  const clip = useId()
  const p = character ? palette(character.hue) : null
  const f = FACES[mood]
  const Head = character ? HEADS[character.sigil] : null
  return (
    <svg viewBox="0 0 120 130" width={size} height={size} aria-hidden className={cx(s.portrait, alive && s.alive, mood === 'out' && s.out)}>
      {frame && (
        <>
          <clipPath id={clip}>
            <path d={FRAME} />
          </clipPath>
          <path d={FRAME} className={s.frameFill} />
        </>
      )}
      <g clipPath={frame ? `url(#${clip})` : undefined}>
        {p && Head ? (
          <g className={s.body}>
            <Shoulders p={p} />
            <motion.g initial={false} animate={{ rotate: f.tilt }} transition={SPRING} style={{ originX: 0.5, originY: 1 }}>
              <Head f={f} p={p} talking={talking} mood={mood} />
            </motion.g>
          </g>
        ) : (
          <g>
            <path d="M10 132C11 106 34 98 60 98s49 8 50 34z" fill="#2f6e6a" />
            <rect x="51" y="80" width="18" height="20" fill="#3f8f89" />
            <ellipse cx="60" cy="56" rx="23" ry="27" fill="#76ece4" />
          </g>
        )}
      </g>
      {frame && <path d={FRAME} className={s.frameLine} />}
    </svg>
  )
}
