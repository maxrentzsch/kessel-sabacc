import { motion } from 'motion/react'
import { useRef } from 'react'
import type { TableDef } from '../../career/tables'
import { venueOf } from '../../career/venues'
import { cx } from '../cx'
import s from './Screens.module.css'

export type Standing = 'locked' | 'open' | 'won'

/** Where each table lies on the chart, and what kind of place it is. */
const SITES: Record<string, { x: number; y: number; r: number; kind: 'planet' | 'ringed' | 'moon' | 'station' | 'crown'; label: 'above' | 'below' }> = {
  anchor: { x: 66, y: 232, r: 15, kind: 'ringed', label: 'below' },
  dune: { x: 150, y: 196, r: 17, kind: 'planet', label: 'below' },
  haze: { x: 78, y: 126, r: 14, kind: 'planet', label: 'above' },
  lodge: { x: 196, y: 108, r: 12, kind: 'moon', label: 'below' },
  salon: { x: 296, y: 160, r: 15, kind: 'station', label: 'below' },
  crown: { x: 286, y: 54, r: 17, kind: 'crown', label: 'above' },
}

/** Stars in fixed places: the same sky every time. */
const STARS = (() => {
  let seed = 7
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 90 }, () => ({ x: next() * 360, y: next() * 290, r: 0.4 + next() * 1.1, o: 0.25 + next() * 0.6 }))
})()

function Site({ table, standing, selected, onSelect }: { table: TableDef; standing: Standing; selected: boolean; onSelect(): void }) {
  const site = SITES[table.id]
  const colors = venueOf(table.id).colors
  const id = `site-${table.id}`
  const { r } = site
  return (
    <g
      transform={`translate(${site.x} ${site.y})`}
      className={cx(s.site, standing === 'locked' && s.siteLocked, selected && s.siteOn)}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      aria-label={`${table.name}, ${table.place}${standing === 'locked' ? ', gesperrt' : standing === 'won' ? ', gewonnen' : ''}`}
    >
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor={colors['--lamp']} />
          <stop offset="0.45" stopColor={colors['--wall-c']} />
          <stop offset="1" stopColor={colors['--wall-a']} />
        </radialGradient>
      </defs>
      {/* generous touch target */}
      <circle r="30" fill="transparent" />
      {selected && <circle r={r + 8} className={s.siteRing} />}
      {site.kind === 'station' || site.kind === 'crown' ? (
        <g>
          <ellipse rx={r + 6} ry={r * 0.42} fill="none" stroke={colors['--lamp']} strokeWidth="2.5" opacity="0.8" />
          <circle r={r * 0.62} fill={`url(#${id})`} />
          <path d={`M${-r - 6} 0H${r + 6}`} stroke={colors['--wall-c']} strokeWidth="2" />
          {site.kind === 'crown' && <path d={`M${-r * 0.5} ${-r * 0.9}l${r * 0.25} ${r * 0.36} ${r * 0.25}-${r * 0.5} ${r * 0.25} ${r * 0.5} ${r * 0.25}-${r * 0.36}v${r * 0.46}h${-r}z`} fill="#f3d27a" />}
        </g>
      ) : (
        <g>
          <circle r={r} fill={`url(#${id})`} />
          {site.kind === 'planet' && <path d={`M${-r * 0.92} ${-r * 0.2}q${r} ${r * 0.45} ${r * 1.84} 0M${-r * 0.8} ${r * 0.35}q${r * 0.8} ${r * 0.35} ${r * 1.6} 0`} fill="none" stroke={colors['--wall-a']} strokeWidth="1.6" opacity="0.5" />}
          {site.kind === 'ringed' && <ellipse rx={r + 8} ry={r * 0.32} fill="none" stroke={colors['--lamp']} strokeWidth="2" opacity="0.7" transform="rotate(-18)" />}
          {site.kind === 'moon' && <circle cx={r * 0.9} cy={-r * 0.9} r={r * 0.3} fill={colors['--wall-c']} />}
        </g>
      )}
      {standing === 'won' && (
        <g transform={`translate(${r * 0.85} ${-r * 0.85})`}>
          <circle r="6.5" fill="#0b1012" stroke="var(--sand)" strokeWidth="1.5" />
          <path d="M-3 0l2.200 2.400L3.200-2.400" fill="none" stroke="var(--sand)" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {standing === 'locked' && (
        <g transform="translate(0 0.500)" className={s.siteLock}>
          <rect x="-4.5" y="-1" width="9" height="7" rx="1.5" />
          <path d="M-2.700-1v-2.200a2.700 2.700 0 0 1 5.400 0V-1" fill="none" strokeWidth="1.600" />
        </g>
      )}
      <text y={site.label === 'below' ? r + 17 : -r - 10} className={s.siteName}>
        {table.name}
      </text>
    </g>
  )
}

interface Props {
  tables: TableDef[]
  standing(table: TableDef): Standing
  selected: string
  onSelect(table: TableDef): void
  /** the Sandläufer is the player's again and flies the routes herself */
  ship: boolean
}

/**
 * The career as a chart of the sector: six places along a route. Whoever
 * plays travels it – on the liner at first, in their own ship at the end.
 */
export function StarMap({ tables, standing, selected, onSelect, ship }: Props) {
  const at = SITES[selected]
  // The marker points the way it last travelled.
  const last = useRef({ x: at.x, y: at.y, angle: -30 })
  if (last.current.x !== at.x || last.current.y !== at.y) {
    last.current = { x: at.x, y: at.y, angle: (Math.atan2(at.y - last.current.y, at.x - last.current.x) * 180) / Math.PI }
  }
  // Above the place, or beside it where the name is written above.
  const mark = at.label === 'below' ? { x: at.x, y: at.y - at.r - 13 } : { x: at.x + at.r + 18, y: at.y + 2 }
  const frontier = tables.reduce((far, table, i) => (standing(table) !== 'locked' ? i : far), 0)

  return (
    <svg viewBox="0 0 360 290" className={s.starMap} role="group" aria-label="Sektorkarte">
      <defs>
        <radialGradient id="map-nebula-a">
          <stop offset="0" stopColor="#76ece4" stopOpacity="0.16" />
          <stop offset="1" stopColor="#76ece4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="map-nebula-b">
          <stop offset="0" stopColor="#f2a23a" stopOpacity="0.14" />
          <stop offset="1" stopColor="#f2a23a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="90" rx="150" ry="90" fill="url(#map-nebula-a)" />
      <ellipse cx="270" cy="220" rx="140" ry="100" fill="url(#map-nebula-b)" />
      {STARS.map((star, i) => (
        <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.o} />
      ))}

      {/* the route, lit as far as the player has come */}
      {tables.slice(1).map((table, i) => {
        const from = SITES[tables[i].id]
        const to = SITES[table.id]
        return <path key={table.id} d={`M${from.x} ${from.y}L${to.x} ${to.y}`} className={cx(s.lane, i < frontier && s.laneOpen)} />
      })}

      {tables.map((table) => (
        <Site key={table.id} table={table} standing={standing(table)} selected={table.id === selected} onSelect={() => onSelect(table)} />
      ))}

      <motion.g initial={false} animate={mark} transition={{ type: 'spring', stiffness: 60, damping: 15 }} className={s.marker}>
        {ship ? (
          <motion.g initial={false} animate={{ rotate: last.current.angle }} transition={{ duration: 0.4 }}>
            <ellipse cx="-13" cy="0" rx="6" ry="2.6" className={s.markerJet} />
            <path d="M-10-4.500H3L12-1.500V1.500L3 4.500H-10Z" className={s.markerHull} />
            <path d="M-6-4.500V-7.500H0L3-4.500M-6 4.500V7.500H0L3 4.500" className={s.markerHull} />
            <path d="M4-1.500H9V1.500H4Z" fill="#76ece4" />
          </motion.g>
        ) : (
          <g>
            <path d="M0 9L-6 0A6.800 6.800 0 1 1 6 0Z" className={s.markerPin} />
            <circle cy="-3.500" r="2.600" fill="#0b1012" />
          </g>
        )}
      </motion.g>
    </svg>
  )
}
