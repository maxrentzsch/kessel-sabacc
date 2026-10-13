import { motion } from 'motion/react'
import { useRef } from 'react'
import { canDrawFrom, sourceIsDeck, sourceSuit } from '../../engine'
import type { DrawSource } from '../../engine'
import { SOURCE_NAME, SUIT_NAME } from '../../i18n/de'
import { useGame } from '../../store/game'
import { cx } from '../cx'
import { PlayingCard } from './PlayingCard'
import { TABLE_LEAN } from './Seat'
import s from './Table.module.css'

// The two decks side by side in the middle, each with its discard pile on the outside.
const ORDER: DrawSource[] = ['sandDiscard', 'sandDeck', 'bloodDeck', 'bloodDiscard']

/** Stable pseudo-random tilt so a discard pile looks hand-thrown. */
function tiltOf(id: string): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return (Math.abs(h) % 13) - 6
}

interface Props {
  /** the player may pick a pile right now */
  enabled: boolean
  onDraw(source: DrawSource): void
}

/** How far a card has to be pulled towards the player to count as drawn, in pixels. */
const PULL = 38

export function Piles({ enabled, onDraw }: Props) {
  const game = useGame((g) => g.game)!
  // A pull ends with a click on the same pile; that click must not draw a second time.
  const pulled = useRef(false)
  return (
    <div className={s.piles}>
      {ORDER.map((source) => {
        const suit = sourceSuit(source)
        const deck = sourceIsDeck(source)
        const cards = deck ? game.decks[suit] : game.discards[suit]
        const available = enabled && canDrawFrom(game, source)
        const shown = deck ? cards.slice(-1) : cards.slice(-3)
        return (
          <motion.button
            key={source}
            className={cx(s.pile, available && s.pileOpen)}
            data-suit={suit}
            disabled={!available}
            drag={available ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.55 }}
            dragSnapToOrigin
            onDragStart={() => (pulled.current = true)}
            onDragEnd={(_, info) => {
              if (info.offset.y > PULL) onDraw(source)
              setTimeout(() => (pulled.current = false), 80)
            }}
            onClick={() => !pulled.current && onDraw(source)}
            aria-label={`${SOURCE_NAME[source]} – ziehen`}
            aria-keyshortcuts={String(ORDER.indexOf(source) + 1)}
          >
            <span className={cx(s.pileSlot, deck && cards.length > 1 && s.pileStack)}>
              {shown.map((card, i) => (
                <PlayingCard
                  key={card.id}
                  card={card}
                  hand={game.handNumber}
                  faceUp={!deck}
                  lean={TABLE_LEAN}
                  enter={deck ? 'none' : 'deal'}
                  dealFrom={{ x: suit === 'sand' ? 70 : -70, y: 0 }}
                  delay={game.players.length * 0.22 + 0.3}
                  tilt={deck ? 0 : i === shown.length - 1 ? tiltOf(card.id) / 2 : tiltOf(card.id)}
                  className={s.pileCard}
                />
              ))}
            </span>
            <span className={s.pileLabel}>
              {deck ? SUIT_NAME[suit] : 'Ablage'}
              <em className="num">{cards.length}</em>
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
