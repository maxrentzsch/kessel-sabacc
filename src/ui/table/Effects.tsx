import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { nextActiveSeat, TOKENS } from '../../engine'
import { useGame } from '../../store/game'
import { tempo } from '../../store/settings'
import { cx } from '../cx'
import { useFeed } from './feed'
import s from './Table.module.css'

interface Beam {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  /** the target was immune: the beam breaks on a shield */
  blocked: boolean
}

/** Where a seat is on screen, relative to the overlay. Seats mark themselves with `data-seat`. */
function anchor(root: HTMLElement, seat: number): { x: number; y: number } | null {
  const el = document.querySelector(`[data-seat="${seat}"]`)
  if (!el) return null
  const box = el.getBoundingClientRect()
  const origin = root.getBoundingClientRect()
  return { x: box.left + box.width / 2 - origin.left, y: box.top + box.height * 0.45 - origin.top }
}

/**
 * Shows who a shift token hits: a bolt of light from the player who played it
 * to everybody it takes chips from, swaps with or locks down.
 */
export function TokenBeams() {
  const root = useRef<HTMLDivElement>(null)
  const [beams, setBeams] = useState<Beam[]>([])
  const source = useRef<number | null>(null)

  const fire = (id: number, to: number, blocked = false) => {
    const from = source.current
    if (from === null || !root.current) return
    const a = anchor(root.current, from)
    const b = anchor(root.current, to)
    if (!a || !b) return
    // Let the banner announce the token before anything flies.
    setTimeout(() => {
      setBeams((list) => [...list, { id, x1: a.x, y1: a.y, x2: b.x, y2: b.y, blocked }])
      setTimeout(() => setBeams((list) => list.filter((beam) => beam.id !== id)), 1100 * tempo())
    }, 420 * tempo())
  }

  useFeed((event, id) => {
    switch (event.type) {
      case 'tokenPlayed': {
        source.current = event.playerId
        if (event.target !== undefined) fire(id, event.target)
        else if (event.token === 'embargo') {
          const game = useGame.getState().game!
          fire(id, nextActiveSeat(game, event.playerId))
        }
        break
      }
      case 'chips':
        if (event.delta < 0 && event.playerId !== source.current && (event.reason === 'tariff' || event.reason === 'audit' || event.reason === 'embezzle')) {
          fire(id, event.playerId)
        }
        break
      case 'tokenBlocked':
        fire(id, event.playerId, true)
        break
      case 'turnStart':
        source.current = null
        break
    }
  })

  return (
    <div ref={root} className={s.beams} aria-hidden>
      <svg width="100%" height="100%">
        <AnimatePresence>
          {beams.map((beam) => (
            <motion.g key={beam.id} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <motion.line
                x1={beam.x1}
                y1={beam.y1}
                x2={beam.x2}
                y2={beam.y2}
                className={cx(s.beam, beam.blocked && s.beamBlocked)}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              />
              <motion.circle
                cx={beam.x2}
                cy={beam.y2}
                className={cx(s.impact, beam.blocked && s.beamBlocked)}
                initial={{ r: 0, opacity: 0.9 }}
                animate={{ r: 46, opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.24, ease: 'easeOut' }}
              />
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>
    </div>
  )
}

/** A ring of light running across the table when a token changes the rules for everybody. */
export function TableRipple() {
  const [ripple, setRipple] = useState<number | null>(null)
  useFeed((event, id) => {
    if (event.type !== 'tokenPlayed') return
    if (!TOKENS[event.token].lasting || event.token === 'immunity') return
    setTimeout(() => setRipple(id), 420 * tempo())
    setTimeout(() => setRipple((r) => (r === id ? null : r)), 1900 * tempo())
  })
  return ripple === null ? null : <i key={ripple} className={s.ripple} />
}
