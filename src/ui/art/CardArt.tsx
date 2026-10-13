import { memo } from 'react'
import { BACKS } from '../../career/cosmetics'
import type { Card, Suit } from '../../engine'
import { useCareer } from '../../store/career'

/**
 * Outline of a card: a long hexagon standing on a short edge – flat at the top
 * and bottom, widest in the middle, with every corner rounded off.
 */
export const CARD_OUTLINE = 'M30 2H70Q73.4 2 74.7 5.2L97 63.5Q99 70 97 76.500L74.7 134.800Q73.4 138 70 138H30Q26.6 138 25.3 134.800L3 76.500Q1 70 3 63.5L25.3 5.200Q26.6 2 30 2Z'
/** the band across the top of a face, where the value is printed */
const BAND = 'M29.5 6H70.5L77.5 24.500H22.5Z'
/** a stripe of trim along the upper left edge */
const TRIM = 'M20 33.500L9 62.500'

const PIPS: Record<number, { r: number; at: [number, number][] }> = {
  1: { r: 20, at: [[50, 70]] },
  2: { r: 13, at: [[50, 52], [50, 88]] },
  3: { r: 11.5, at: [[50, 49], [33, 84], [67, 84]] },
  4: { r: 11, at: [[35, 55], [65, 55], [35, 86], [65, 86]] },
  5: { r: 9.5, at: [[35, 51], [65, 51], [50, 70], [35, 89], [65, 89]] },
  6: { r: 8.800, at: [[37, 48], [63, 48], [32, 70], [68, 70], [37, 92], [63, 92]] },
}

/** The diamond every Kessel Sabacc card counts in: a crystal with a notch cut into it. */
function Diamond({ x, y, r }: { x: number; y: number; r: number }) {
  const h = r * 1.28
  const n = r * 0.34
  const ny = y + r * 0.34
  return (
    <path
      fillRule="evenodd"
      strokeLinejoin="round"
      strokeWidth={r * 0.18}
      stroke="currentColor"
      d={`M${x} ${y - h}L${x + r} ${y}L${x} ${y + h}L${x - r} ${y}Z M${x} ${ny - n * 1.28}L${x - n} ${ny}L${x} ${ny + n * 1.28}L${x + n} ${ny}Z`}
    />
  )
}

/** Three linked diamonds on a bar – it could be anything. */
function ImpostorGlyph() {
  return (
    <g>
      <rect x="16" y="64.5" width="68" height="11" rx="2" />
      <Diamond x={28} y={70} r={11} />
      <Diamond x={72} y={70} r={11} />
      <g stroke="var(--plate)" strokeWidth="3" paintOrder="stroke">
        <Diamond x={50} y={70} r={15} />
      </g>
    </g>
  )
}

/** A disc split by a band. */
function SylopGlyph() {
  return (
    <g>
      <circle cx="50" cy="70" r="25" />
      <rect x="20" y="64.5" width="60" height="11" fill="var(--plate)" />
      <circle cx="50" cy="70" r="5.5" />
    </g>
  )
}

function Tab({ card }: { card: Card }) {
  return (
    <g>
      <path d={BAND} />
      <path d={TRIM} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g fill="var(--plate)">
        {card.kind === 'number' && (
          <text x="50" y="21" textAnchor="middle" fontSize="15.500" fontWeight="800" fontFamily="var(--font-display)">
            {card.value}
          </text>
        )}
        {card.kind === 'impostor' && <path d="M42 15.300l4-5.500 4 5.500-4 5.500zM50 15.300l4-5.500 4 5.500-4 5.500z" />}
        {card.kind === 'sylop' && <circle cx="50" cy="15.300" r="5" />}
      </g>
    </g>
  )
}

export const CardFace = memo(function CardFace({ card }: { card: Card }) {
  const sand = card.suit === 'sand'
  const id = `face-${card.suit}`
  const plate = sand ? '#e9dfc9' : '#8c2620'
  return (
    <svg viewBox="0 0 100 140" style={{ ['--plate' as string]: plate, color: sand ? '#de7f1c' : '#f1e6d0' }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={sand ? '#f3ebd9' : '#a5302a'} />
          <stop offset="1" stopColor={sand ? '#d9cdb1' : '#711b18'} />
        </linearGradient>
      </defs>
      <path d={CARD_OUTLINE} fill={`url(#${id})`} stroke={sand ? '#b9ac8f' : '#4c110f'} strokeWidth="2" strokeLinejoin="round" />
      <g fill="currentColor">
        <Tab card={card} />
        <g transform="rotate(180 50 70)">
          <Tab card={card} />
        </g>
        {card.kind === 'number' && PIPS[card.value].at.map(([x, y], i) => <Diamond key={i} x={x} y={y} r={PIPS[card.value].r} />)}
        {card.kind === 'impostor' && <ImpostorGlyph />}
        {card.kind === 'sylop' && <SylopGlyph />}
      </g>
    </svg>
  )
})

/** The back of a card. `skin` picks a design from the collection; by default the one in use. */
export const CardBack = memo(function CardBack({ suit, skin }: { suit: Suit; skin?: string }) {
  const inUse = useCareer((c) => c.look.back)
  const design = skin ?? inUse
  const [from, to, ink] = (BACKS[design] ?? BACKS['back-standard'])[suit]
  const id = `${design}-${suit}`
  return (
    <svg viewBox="0 0 100 140" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path d={CARD_OUTLINE} fill={`url(#${id})`} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <g fill="none" stroke={ink} strokeWidth="7.500" strokeLinejoin="round" strokeLinecap="butt">
        <path d="M33.5 13H66.5L87.5 68V72L66.5 127H33.5L12.5 72V68Z" />
        {/* the "H" in the middle, with a prong reaching in from every side */}
        <path d="M34 42V98M66 42V98M34 70H66" />
        <path d="M50 13V42M50 98V127M12.5 70H22M78 70H87.5" />
      </g>
    </svg>
  )
})
