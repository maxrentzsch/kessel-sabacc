import { memo } from 'react'
import s from './Table.module.css'

const C = 500
const point = (r: number, deg: number): string => {
  const a = (deg * Math.PI) / 180
  return `${(C + r * Math.sin(a)).toFixed(1)} ${(C + r * Math.cos(a)).toFixed(1)}`
}

/** A slice of a ring. Angles in degrees, 0 towards the player, 180 the far side. */
function sector(r0: number, r1: number, from: number, to: number): string {
  return `M${point(r1, from)}A${r1} ${r1} 0 0 0 ${point(r1, to)}L${point(r0, to)}A${r0} ${r0} 0 0 1 ${point(r0, from)}Z`
}

function arc(r: number, from: number, to: number): string {
  return `M${point(r, from)}A${r} ${r} 0 0 0 ${point(r, to)}`
}

/** Where the opponents' mats lie on the far side, by number of opponents. */
const MATS: Record<number, number[]> = { 1: [180], 2: [153, 207], 3: [132, 180, 228] }

/**
 * The table top seen from straight above; the scene tilts it away from the
 * player. A wide rim with a mat for everybody who sits at it, a ring of metal,
 * the felt, and in the middle the plate the dealer's console stands on.
 */
export const Surface = memo(function Surface({ opponents }: { opponents: number }) {
  const mats = [0, ...(MATS[opponents] ?? MATS[3])]
  return (
    <svg className={s.surface} viewBox="0 0 1000 1000" aria-hidden>
      <defs>
        <radialGradient id="surface-rim">
          <stop offset="0.72" className={s.stopRimA} />
          <stop offset="1" className={s.stopRimB} />
        </radialGradient>
        <radialGradient id="surface-felt">
          <stop offset="0" className={s.stopFeltA} />
          <stop offset="0.6" className={s.stopFeltB} />
          <stop offset="1" className={s.stopFeltC} />
        </radialGradient>
        <radialGradient id="surface-lamp" cx="0.5" cy="0.2" r="0.55">
          <stop offset="0" className={s.stopLamp} stopOpacity="0.3" />
          <stop offset="1" className={s.stopLamp} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="surface-hub">
          <stop offset="0" stopColor="#1b2120" />
          <stop offset="0.62" stopColor="#2b3331" />
          <stop offset="1" stopColor="#434c4a" />
        </radialGradient>
      </defs>

      {/* the rim, with a band of metal around its edge */}
      <circle cx={C} cy={C} r="499" fill="url(#surface-rim)" />
      <circle cx={C} cy={C} r="492" className={s.metalLine} strokeWidth="9" />
      <circle cx={C} cy={C} r="486" className={s.shadeLine} strokeWidth="2" />

      {/* a mat in front of every seat */}
      {mats.map((at) => (
        <g key={at}>
          <path d={sector(392, 474, at - (at === 0 ? 27 : 19), at + (at === 0 ? 27 : 19))} className={s.mat} />
          <path d={arc(462, at - (at === 0 ? 22 : 14), at + (at === 0 ? 22 : 14))} className={s.matLine} />
        </g>
      ))}

      {/* the felt inside its ring of metal */}
      <circle cx={C} cy={C} r="382" className={s.metalDark} />
      <circle cx={C} cy={C} r="376" className={s.metalLine} strokeWidth="11" />
      <circle cx={C} cy={C} r="368" fill="url(#surface-felt)" />
      <circle cx={C} cy={C} r="368" fill="url(#surface-lamp)" />
      <circle cx={C} cy={C} r="368" className={s.shadeLine} strokeWidth="5" />
      <circle cx={C} cy={C} r="322" className={s.guideLine} />

      {/* the dealer's console: a plate with four trays swept around it */}
      {[20, 110, 200, 290].map((from) => (
        <g key={from}>
          <path d={arc(206, from, from + 62)} className={s.tray} />
          <path d={arc(221, from + 2, from + 60)} className={s.trayEdge} />
        </g>
      ))}
      <circle cx={C} cy={C} r="170" fill="url(#surface-hub)" />
      <circle cx={C} cy={C} r="170" className={s.metalLine} strokeWidth="6" />
      <circle cx={C} cy={C} r="132" className={s.hubLine} />
      <circle cx={C} cy={C} r="96" fill="#161b1a" />
      <circle cx={C} cy={C} r="96" className={s.metalLine} strokeWidth="4" />
    </svg>
  )
})

/** The part of the console that stands up from the table: a pedestal with lit vents under a wide dish. */
export function Hub() {
  return (
    <svg className={s.hub} viewBox="0 0 180 96" aria-hidden>
      <defs>
        <linearGradient id="hub-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className={s.stopMetalDark} />
          <stop offset="0.45" className={s.stopMetal} />
          <stop offset="1" className={s.stopMetalDark} />
        </linearGradient>
      </defs>
      {/* foot */}
      <ellipse cx="90" cy="80" rx="62" ry="13" fill="#0e1312" opacity="0.55" />
      <ellipse cx="90" cy="76" rx="54" ry="11" fill="url(#hub-body)" />
      <ellipse cx="90" cy="73" rx="54" ry="11" className={s.hubTop} />
      {/* pedestal with vents */}
      <path d="M58 46 H122 L112 74 Q90 80 68 74 Z" fill="url(#hub-body)" />
      <g className={s.vents}>
        <path d="M74 53 V68 M82 54 V70 M90 54.500 V71 M98 54 V70 M106 53 V68" />
      </g>
      {/* dish */}
      <path d="M16 36 Q90 66 164 36 L150 48 Q90 70 30 48 Z" fill="url(#hub-body)" />
      <ellipse cx="90" cy="36" rx="74" ry="17" fill="url(#hub-body)" />
      <ellipse cx="90" cy="34" rx="74" ry="17" className={s.hubTop} />
      <ellipse cx="90" cy="35" rx="52" ry="11" fill="#141a19" />
      <ellipse cx="90" cy="37.500" rx="30" ry="6" className={s.hubGlow} />
    </svg>
  )
}
