import { motion } from 'motion/react'
import { useRef } from 'react'
import { placeOf } from '../../career/maps'
import type { MapDef, Place } from '../../career/maps'
import type { TableDef } from '../../career/tables'
import { venueOf } from '../../career/venues'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

export type Standing = 'locked' | 'open' | 'won'

/** Dune crests on the planet map, the same every time. */
const DUNES = Array.from({ length: 14 }, (_, i) => {
  const y = 12 + i * 21
  const w = 40 + ((i * 37) % 50)
  return `M${-10 + ((i * 53) % 90)} ${y}q${w / 2} -10 ${w} 0t${w} 0t${w} 0t${w} 0t${w} 0`
})

/** Stars in fixed places: the same sky every time. */
const STARS = (() => {
  let seed = 7
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 90 }, () => ({ x: next() * 360, y: next() * 290, r: 0.4 + next() * 1.1, o: 0.25 + next() * 0.6 }))
})()

function Site({ table, site, standing, selected, onSelect }: { table: TableDef; site: Place; standing: Standing; selected: boolean; onSelect(): void }) {
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
      aria-label={`${table.name}, ${table.place}${standing === 'locked' ? tx`, gesperrt` : standing === 'won' ? tx`, gewonnen` : ''}`}
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
      {site.kind === 'yard' || site.kind === 'oasis' || site.kind === 'port' || site.kind === 'pad' ? (
        <Ground kind={site.kind} r={r} lamp={colors['--lamp']} wall={colors['--wall-c']} />
      ) : site.kind === 'station' || site.kind === 'crown' ? (
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
        {site.name ?? table.name}
      </text>
    </g>
  )
}

/** A place on a planet's surface, seen from above: what the track leads to. */
function Ground({ kind, r, lamp, wall }: { kind: 'yard' | 'oasis' | 'port' | 'pad'; r: number; lamp: string; wall: string }) {
  return (
    <g>
      <circle r={r + 2} fill="#1a120a" opacity="0.55" />
      {kind === 'yard' && (
        // stacks of scrap round a workshop
        <g>
          <rect x={-r * 0.7} y={-r * 0.5} width={r * 1.4} height={r} rx="2" fill={wall} />
          <path d={`M${-r * 0.9} ${r * 0.7}l${r * 0.3}-${r * 0.6} ${r * 0.3} ${r * 0.6}zM${r * 0.3} ${r * 0.8}l${r * 0.3}-${r * 0.7} ${r * 0.3} ${r * 0.7}z`} fill="#8a6a44" />
          <rect x={-r * 0.25} y={-r * 0.2} width={r * 0.5} height={r * 0.35} fill={lamp} />
        </g>
      )}
      {kind === 'oasis' && (
        // tents round a well
        <g>
          <circle r={r * 0.35} fill="#4fb8b0" />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} transform={`rotate(${i * 90 + 45}) translate(0 ${-r * 0.75})`} d={`M${-r * 0.32} ${r * 0.2}L0 ${-r * 0.25}L${r * 0.32} ${r * 0.2}z`} fill={wall} />
          ))}
        </g>
      )}
      {kind === 'port' && (
        // the undercity: blocks and a glow from the cooling pipes
        <g>
          <circle r={r * 0.9} fill={wall} />
          <path d={`M${-r * 0.6} 0H${r * 0.6}M0 ${-r * 0.6}V${r * 0.6}`} stroke="#1a120a" strokeWidth="2" />
          <circle r={r * 0.28} fill={lamp} opacity="0.9" />
        </g>
      )}
      {kind === 'pad' && (
        // a landing pad with its lights
        <g>
          <circle r={r * 0.85} fill="#4a4a48" stroke={lamp} strokeWidth="1.5" strokeDasharray="2 3" />
          <path d={`M${-r * 0.35} ${-r * 0.4}V${r * 0.4}M${r * 0.35} ${-r * 0.4}V${r * 0.4}M${-r * 0.35} 0H${r * 0.35}`} stroke={lamp} strokeWidth="2" />
        </g>
      )}
    </g>
  )
}

/** A place that holds a whole map of its own, such as Tarsk on the sector chart. */
function Gate({ site, locked, onOpen }: { site: Place; locked: boolean; onOpen(): void }) {
  const { r } = site
  return (
    <g transform={`translate(${site.x} ${site.y})`} className={cx(s.site, locked && s.siteLocked)} onClick={locked ? undefined : onOpen} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()} aria-label={tx`${site.name ?? site.id} öffnen`}>
      <circle r="30" fill="transparent" />
      <circle r={r} fill="#c98a45" />
      <path d={`M${-r * 0.9} ${-r * 0.15}q${r} ${r * 0.4} ${r * 1.8} 0M${-r * 0.7} ${r * 0.4}q${r * 0.7} ${r * 0.3} ${r * 1.4} 0`} fill="none" stroke="#8a5a28" strokeWidth="1.600" opacity="0.6" />
      <circle r={r + 5} fill="none" stroke="var(--holo)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
      <text y={site.label === 'below' ? r + 17 : -r - 10} className={s.siteName}>
        {site.name}
      </text>
    </g>
  )
}

interface Props {
  map: MapDef
  tables: TableDef[]
  /** a place that is a map of its own was tapped */
  onOpen?(mapId: string): void
  /** whether the map a place leads to can be opened yet; all of them when left out */
  canOpen?(mapId: string): boolean
  /** where the player is; the marker stands there, or at the selected place when that is elsewhere */
  here?: string
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
export function StarMap({ map, tables, standing, selected, onSelect, ship, onOpen, canOpen = () => true, here }: Props) {
  const planet = map.scale === 'planet'
  const at = placeOf(map, here && map.places.some((p) => p.id === here) ? here : selected)
  // The marker points the way it last travelled.
  const last = useRef({ x: at.x, y: at.y, angle: -30 })
  if (last.current.x !== at.x || last.current.y !== at.y) {
    last.current = { x: at.x, y: at.y, angle: (Math.atan2(at.y - last.current.y, at.x - last.current.x) * 180) / Math.PI }
  }
  // Above the place, or beside it where the name is written above.
  const mark = at.label === 'below' ? { x: at.x, y: at.y - at.r - 13 } : { x: at.x + at.r + 18, y: at.y + 2 }
  const open = (id: string) => {
    // a place that opens a map of its own, such as home, is within reach once that map is
    const gate = map.places.find((p) => p.id === id)?.opens
    if (gate) return canOpen(gate)
    const table = tables.find((t) => t.id === id)
    return !!table && standing(table) !== 'locked'
  }

  return (
    <svg viewBox="0 0 360 290" className={cx(s.starMap, planet && s.planetMap)} role="group" aria-label={planet ? tx`Karte von Tarsk` : tx`Sektorkarte`}>
      <defs>
        <radialGradient id="map-nebula-a">
          <stop offset="0" stopColor="#76ece4" stopOpacity="0.16" />
          <stop offset="1" stopColor="#76ece4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="map-sand" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#b8803f" />
          <stop offset="1" stopColor="#7a4e22" />
        </linearGradient>
        <linearGradient id="map-storm" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3a2410" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#3a2410" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="map-nebula-b">
          <stop offset="0" stopColor="#f2a23a" stopOpacity="0.14" />
          <stop offset="1" stopColor="#f2a23a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {planet ? (
        // sand from above: dune crests and the shadow of the storm coming in from the south
        <g>
          <rect width="360" height="290" fill="url(#map-sand)" />
          {DUNES.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#f0c98a" strokeWidth="1.400" opacity="0.28" />
          ))}
          <rect width="360" height="290" fill="url(#map-storm)" />
        </g>
      ) : (
        <g>
          <ellipse cx="110" cy="90" rx="150" ry="90" fill="url(#map-nebula-a)" />
          <ellipse cx="270" cy="220" rx="140" ry="100" fill="url(#map-nebula-b)" />
          {STARS.map((star, i) => (
            <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.o} />
          ))}
        </g>
      )}

      {/* the ways between places, lit as far as the player has come; on the ground they are tracks */}
      {map.routes.map(({ from, to }) => {
        const a = placeOf(map, from)
        const b = placeOf(map, to)
        const d = planet ? `M${a.x} ${a.y}Q${(a.x + b.x) / 2 + (b.y - a.y) * 0.15} ${(a.y + b.y) / 2 - (b.x - a.x) * 0.15} ${b.x} ${b.y}` : `M${a.x} ${a.y}L${b.x} ${b.y}`
        return <path key={`${from}-${to}`} d={d} className={cx(s.lane, planet && s.track, open(from) && open(to) && s.laneOpen)} />
      })}

      {map.places
        .filter((p) => p.opens)
        .map((p) => (
          <Gate key={p.id} site={p} locked={!canOpen(p.opens!)} onOpen={() => onOpen?.(p.opens!)} />
        ))}

      {tables.map((table) => (
        <Site key={table.id} table={table} site={placeOf(map, table.id)} standing={standing(table)} selected={table.id === selected} onSelect={() => onSelect(table)} />
      ))}

      <motion.g initial={false} animate={mark} transition={{ type: 'spring', stiffness: 60, damping: 15 }} className={s.marker}>
        {ship && !planet ? (
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
