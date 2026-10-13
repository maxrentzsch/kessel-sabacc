import { useEffect, useRef } from 'react'
import { cx } from '../cx'
import s from './Backdrop.module.css'

/** Wall artwork is drawn 2400 wide and 380 high; its bottom edge is where wall meets floor. */
const WIDTH = 2400
const MID = WIDTH / 2
const BAY = 180
const BAYS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
const SIDES = [-1, 1] as const
const BAY_KINDS = ['window', 'lattice', 'door', 'lattice', 'shelf', 'door', 'lattice'] as const

/** A patron somewhere in the room, reduced to a silhouette. */
function Patron({ x, scale = 1, kind, still }: { x: number; scale?: number; kind: 0 | 1 | 2 | 3; still?: boolean }) {
  const heads = [
    // round head with antennae
    <g key="a">
      <circle cx="0" cy="-58" r="13" />
      <path d="M-6-69l-5-13M6-69l5-13" stroke="currentColor" strokeWidth="2.500" strokeLinecap="round" />
    </g>,
    // tall crest
    <path key="b" d="M-11-50c0-12 4-30 11-40 7 10 11 28 11 40a11 11 0 0 1-22 0z" />,
    // wide hat
    <g key="c">
      <ellipse cx="0" cy="-66" rx="24" ry="5" />
      <circle cx="0" cy="-57" r="12" />
    </g>,
    // head-tails
    <g key="d">
      <circle cx="0" cy="-58" r="12" />
      <path d="M-10-60c-8 6-9 22-6 34M10-60c8 6 9 22 6 34" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
    </g>,
  ]
  return (
    <g transform={`translate(${x} 378) scale(${scale})`}>
      <g className={still ? undefined : s.patron} style={{ animationDelay: `${-(Math.abs(x) % 7)}s` }}>
        {heads[kind]}
        <path d="M-22 0c0-26 8-40 22-40s22 14 22 40z" />
      </g>
    </g>
  )
}

function Lamp({ x, drop }: { x: number; drop: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d={`M0 0V${drop}`} className={s.trimLine} strokeWidth="3" />
      <path d={`M-64 380L-16 ${drop + 16}H16L64 380Z`} fill="url(#cone)" className={s.flicker} />
      <path d={`M-22 ${drop + 18}c2-14 10-20 22-20s20 6 22 20z`} className={s.trim} />
      <ellipse cx="0" cy={drop + 19} rx="20" ry="4.500" className={cx(s.bulb, s.flicker)} />
    </g>
  )
}

/**
 * A screen of fretwork with light behind it, floor to ceiling: bars folded
 * into brackets, each row turned the other way round.
 */
function Lattice({ x }: { x: number }) {
  const rows = [84, 157, 230, 303]
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="-78" y="66" width="156" height="308" className={s.trim} />
      <rect x="-66" y="78" width="132" height="296" fill="url(#screen)" className={s.flicker} />
      <g className={s.fret}>
        <path d="M0 78V374" />
        {rows.map((y, i) => (
          <g key={y} transform={`translate(0 ${y})`}>
            {SIDES.map((side) => (
              <path
                key={side}
                transform={`scale(${side * (i % 2 ? -1 : 1)} 1) translate(${i % 2 ? -66 : 0} 0)`}
                d="M8 9H56V60H8M8 34H36M66 0H-2M66 70H-2"
              />
            ))}
          </g>
        ))}
      </g>
    </g>
  )
}

/** One bay of the back wall: an arched recess with something in it. */
function Alcove({ x, kind }: { x: number; kind: (typeof BAY_KINDS)[number] }) {
  if (kind === 'lattice') return <Lattice x={x} />
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M-78 374V152c0-46 34-78 78-78s78 32 78 78v222z" className={s.trim} />
      <path d="M-66 374V154c0-38 28-66 66-66s66 28 66 66v220z" fill="url(#niche)" />
      {kind === 'window' && (
        <g>
          <circle cx="0" cy="178" r="46" fill="url(#pane)" />
          <path d="M-46 178H46M0 132v92" className={s.trimLine} strokeWidth="6" />
          <circle cx="0" cy="178" r="46" fill="none" className={s.trimLine} strokeWidth="8" />
        </g>
      )}
      {kind === 'shelf' && (
        <g className={s.trim}>
          {[152, 216, 280].map((y) => (
            <g key={y}>
              <rect x="-58" y={y} width="116" height="5" />
              <path
                d={`M-44 ${y}v-26h8v26zM-28 ${y}v-18c0-4 3-6 3-12h6c0 6 3 8 3 12v18zM-6 ${y}v-34h10v34zM12 ${y}c-2-6-2-16 4-22 6 6 6 16 4 22zM30 ${y}v-14c0-5 4-6 4-14h6c0 8 4 9 4 14v14z`}
              />
              <rect x="-27" y={y - 12} width="10" height="5" fill="#d7791f" opacity="0.5" />
              <rect x="-5" y={y - 20} width="8" height="6" fill="#62d9d0" opacity="0.35" />
            </g>
          ))}
        </g>
      )}
      {kind === 'door' && (
        <g>
          <path d="M-40 374V180c0-24 18-42 40-42s40 18 40 42v194z" fill="url(#doorway)" />
          <g className={s.crowd} transform="translate(0 -4)">
            <Patron x={-4} scale={1.5} kind={3} still />
          </g>
        </g>
      )}
    </g>
  )
}

/**
 * The room behind the table: the back wall of a cantina with alcoves, hanging
 * lamps, a few patrons and drifting haze. It is laid out in the same units as
 * the table, so the wall meets the floor just beyond the far rim on every
 * screen. It sways a little and follows the pointer.
 */
export function Backdrop({ dim }: { dim: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return
    const onMove = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      el.style.setProperty('--px', String((e.clientX / window.innerWidth - 0.5) * -2))
      el.style.setProperty('--py', String((e.clientY / window.innerHeight - 0.5) * -2))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div ref={ref} className={cx(s.backdrop, dim && s.dim)} aria-hidden>
      <div className={s.room}>
        <svg className={s.floor} viewBox="0 0 100 100" preserveAspectRatio="none">
          <g className={s.boards} strokeWidth="1.5" opacity="0.8">
            {[-46, -30, -18, -8, 0, 8, 18, 30, 46].map((dx) => (
              <path key={dx} d={`M${50 + dx} 0L${50 + dx * 4} 100`} vectorEffect="non-scaling-stroke" />
            ))}
            <path d="M0 9H100M0 24H100M0 50H100" opacity="0.5" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        <svg viewBox={`0 0 ${WIDTH} 380`} preserveAspectRatio="xMidYMax meet" className={s.wall}>
          <defs>
            <linearGradient id="wallpaint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className={s.wallA} />
              <stop offset="0.5" className={s.wallB} />
              <stop offset="1" className={s.wallC} />
            </linearGradient>
            <linearGradient id="niche" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className={s.nicheA} />
              <stop offset="1" className={s.nicheB} />
            </linearGradient>
            <radialGradient id="pane">
              <stop offset="0" className={s.paneA} />
              <stop offset="0.6" className={s.paneB} />
              <stop offset="1" className={s.paneC} />
            </radialGradient>
            <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className={s.paneB} />
              <stop offset="0.45" className={s.paneA} />
              <stop offset="1" className={s.paneC} />
            </linearGradient>
            <linearGradient id="doorway" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className={s.doorA} />
              <stop offset="1" className={s.doorB} />
            </linearGradient>
            <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className={s.lamp} stopOpacity="0.4" />
              <stop offset="1" className={s.lamp} stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect width={WIDTH} height="380" fill="url(#wallpaint)" />
          {BAYS.map((k) => (
            <Alcove key={k} x={MID + k * BAY} kind={BAY_KINDS[Math.abs(k)]} />
          ))}
          <g className={s.trim}>
            {BAYS.slice(1).map((k) => (
              <rect key={k} x={MID + k * BAY - BAY / 2 - 9} y="40" width="18" height="336" />
            ))}
            <rect y="368" width={WIDTH} height="12" />
          </g>

          {/* conduits under the ceiling */}
          <rect width={WIDTH} height="34" className={s.ceiling} />
          <rect y="40" width={WIDTH} height="13" className={s.trim} opacity="0.75" />
          <rect y="58" width={WIDTH} height="7" className={s.trim} opacity="0.5" />
          {BAYS.map((k) => (
            <rect key={k} x={MID + k * BAY + 30} y="36" width="14" height="32" rx="3" className={s.trim} />
          ))}
        </svg>

        {/* Anything that moves stays out of the blurred wall, which would otherwise be redrawn every frame. */}
        <svg viewBox={`0 0 ${WIDTH} 380`} preserveAspectRatio="xMidYMax meet" className={s.life}>
          <g className={s.crowd}>
            <Patron x={MID - 100} scale={1.12} kind={2} />
            <Patron x={MID + 96} scale={1.2} kind={0} />
            <Patron x={MID - 268} scale={1.25} kind={1} />
            <Patron x={MID + 250} scale={1.1} kind={3} />
            <Patron x={MID + 296} scale={1.22} kind={2} />
            <Patron x={MID - 470} scale={1.2} kind={0} />
            <Patron x={MID + 520} scale={1.28} kind={1} />
            <Patron x={MID - 700} scale={1.2} kind={3} />
            <Patron x={MID + 760} scale={1.15} kind={0} />
          </g>
          {[-4, -2, 0, 2, 4].map((k) => (
            <Lamp key={k} x={MID + k * BAY * 1.5} drop={k === 0 ? 30 : 58} />
          ))}
        </svg>
      </div>
      <div className={cx(s.haze, s.hazeA)} />
      <div className={cx(s.haze, s.hazeB)} />
      <div className={s.vignette} />
    </div>
  )
}
