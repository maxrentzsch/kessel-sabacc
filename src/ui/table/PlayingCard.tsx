import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Card } from '../../engine'
import { tempo } from '../../store/settings'
import { CardBack, CardFace } from '../art/CardArt'
import { cx } from '../cx'
import s from './Table.module.css'

/**
 * Which side each card showed the last time it was on screen. A card keeps its
 * id while it travels between piles and hands, but React mounts a fresh element
 * at every stop – this lets the new element continue the flip where the old
 * one left off.
 */
const faceMemory = new Map<string, boolean>()
/** Same idea for how far a card leaned back onto the table. */
const leanMemory = new Map<string, number>()

export function pruneCardMemory(hand: number): void {
  const prefix = `${hand}:`
  for (const key of faceMemory.keys()) {
    if (key.startsWith(prefix)) continue
    faceMemory.delete(key)
    leanMemory.delete(key)
  }
}

/** How far a card has to be flicked to be thrown away, in pixels. */
const FLING = 42

interface Props {
  card: Card
  /** hand number; cards of a new hand are new elements and get dealt in */
  hand: number
  faceUp: boolean
  /** how a card that was not on screen before appears */
  enter?: 'deal' | 'none'
  /** offset the deal-in animation starts from */
  dealFrom?: { x: number; y: number }
  delay?: number
  /** delay before turning over when the card is already on the table */
  flipDelay?: number
  /** resting rotation in degrees */
  tilt?: number
  /** degrees the card leans back: 0 is held up to the player, ~50 lies on the table */
  lean?: number
  className?: string
  onClick?: () => void
  /** the card can be flicked up, away from the player */
  onFling?: () => void
  label?: string
  children?: ReactNode
}

export function PlayingCard({ card, hand, faceUp, enter = 'none', dealFrom, delay = 0, flipDelay = 0, tilt = 0, lean = 0, className, onClick, onFling, label, children }: Props) {
  const key = `${hand}:${card.id}`
  const known = faceMemory.has(key)
  const wasUp = faceMemory.get(key) ?? false
  const wasLean = leanMemory.get(key) ?? lean
  useEffect(() => {
    faceMemory.set(key, faceUp)
    leanMemory.set(key, lean)
  }, [key, faceUp, lean])

  // A flick ends with a click on the same card; that click must not count as a tap.
  const flung = useRef(false)

  const t = tempo()
  const dealing = !known && enter === 'deal'
  const wait = dealing ? delay * t : 0

  return (
    <motion.div
      layoutId={key}
      className={cx(s.card, onClick && s.cardButton, className)}
      initial={dealing ? { opacity: 0, x: dealFrom?.x ?? 0, y: dealFrom?.y ?? -60, scale: 0.6 } : false}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: tilt }}
      transition={{
        layout: { type: 'spring', stiffness: 210 / t, damping: 26, mass: 0.9 },
        default: { duration: 0.42 * t, delay: wait, ease: [0.22, 1, 0.36, 1] },
      }}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      drag={onFling ? 'y' : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0.04 }}
      dragSnapToOrigin
      onDragStart={() => (flung.current = true)}
      onDragEnd={(_, info) => {
        if (info.offset.y < -FLING) onFling?.()
        setTimeout(() => (flung.current = false), 80)
      }}
      onClick={onClick && (() => !flung.current && onClick())}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <motion.div
        className={s.cardLean}
        initial={{ rotateX: wasLean }}
        animate={{ rotateX: lean }}
        transition={{ duration: 0.5 * t, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className={s.cardFlip}
          initial={{ rotateY: wasUp ? 0 : 180 }}
          animate={{ rotateY: faceUp ? 0 : 180 }}
          transition={{ duration: 0.5 * t, delay: dealing ? wait + 0.3 * t : flipDelay * t, ease: [0.3, 0.1, 0.2, 1] }}
        >
          <div className={s.cardSide}>
            <CardFace card={card} />
          </div>
          <div className={cx(s.cardSide, s.cardBack)}>
            <CardBack suit={card.suit} />
          </div>
        </motion.div>
      </motion.div>
      {children}
    </motion.div>
  )
}
