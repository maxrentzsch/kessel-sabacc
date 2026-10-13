import { memo } from 'react'
import type { SpikeCard, SpikeSuit } from '../../spike'
import { CARD_OUTLINE } from '../art/CardArt'

const GREEN = '#2f9d6a'
const RED = '#c9443a'

const SIX: [number, number][] = [[39, 50], [61, 50], [39, 70], [61, 70], [39, 90], [61, 90]]
const FOUR: [number, number][] = [[39, 58], [61, 58], [39, 82], [61, 82]]

/** Where the pips of each value sit. */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 70]],
  2: [[50, 56], [50, 84]],
  3: [[50, 50], [50, 70], [50, 90]],
  4: FOUR,
  5: [...FOUR, [50, 70]],
  6: SIX,
  7: [...SIX, [50, 60]],
  8: [...SIX, [50, 60], [50, 80]],
  9: [36, 50, 64].flatMap((x) => [50, 70, 90].map((y) => [x, y] as [number, number])),
  10: [44, 57, 70, 83, 96].flatMap((y) => [[39, y], [61, y]] as [number, number][]),
}

function Pip({ suit, x, y, r }: { suit: SpikeSuit; x: number; y: number; r: number }) {
  if (suit === 'circle') return <circle cx={x} cy={y} r={r} />
  if (suit === 'square') return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} rx="1" />
  return <path d={`M${x} ${y - r * 1.1}L${x + r * 1.1} ${y + r * 0.85}H${x - r * 1.1}Z`} />
}

const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0')

export const SpikeFace = memo(function SpikeFace({ card }: { card: SpikeCard }) {
  const sylop = card.suit === null
  const ink = sylop ? '#76ece4' : card.value > 0 ? GREEN : RED
  const id = `spike-face-${sylop ? 'sylop' : 'plain'}`
  const count = Math.abs(card.value)
  return (
    <svg viewBox="0 0 100 140" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={sylop ? '#23323a' : '#f3ebd9'} />
          <stop offset="1" stopColor={sylop ? '#0e161a' : '#d9cdb1'} />
        </linearGradient>
      </defs>
      <path d={CARD_OUTLINE} fill={`url(#${id})`} stroke={sylop ? '#05090b' : '#b9ac8f'} strokeWidth="2" strokeLinejoin="round" />
      <g fill={ink}>
        <path d="M29.5 6H70.5L77.5 24.5H22.5Z" />
        <path d="M70.5 134H29.5L22.500 115.500H77.500Z" />
        {sylop ? (
          <g fill="none" stroke={ink} strokeWidth="5">
            <circle cx="50" cy="70" r="22" />
            <circle cx="50" cy="70" r="7" fill={ink} stroke="none" />
            <path d="M50 40V52M50 88V100M20 70H32M68 70H80" strokeLinecap="round" />
          </g>
        ) : (
          PIPS[count].map(([x, y], i) => <Pip key={i} suit={card.suit!} x={x} y={y} r={count >= 9 ? 5 : count >= 7 ? 5.6 : 6.6} />)
        )}
      </g>
      <g fill={sylop ? '#0e161a' : '#f3ebd9'} fontFamily="var(--font-display)" fontWeight="800" fontSize="14.500" textAnchor="middle">
        <text x="50" y="20.500">
          {signed(card.value)}
        </text>
        <text x="50" y="20.500" transform="rotate(180 50 70)">
          {signed(card.value)}
        </text>
      </g>
    </svg>
  )
})

/** The back of a Corellian Spike card: the same for the whole deck. */
export const SpikeBack = memo(function SpikeBack() {
  return (
    <svg viewBox="0 0 100 140" aria-hidden>
      <defs>
        <linearGradient id="spike-back" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#3f6f7a" />
          <stop offset="1" stopColor="#1c3a42" />
        </linearGradient>
      </defs>
      <path d={CARD_OUTLINE} fill="url(#spike-back)" stroke="#0a1a1f" strokeWidth="2" strokeLinejoin="round" />
      <g fill="none" stroke="#0a1a1f" strokeWidth="6" strokeLinejoin="round">
        <path d="M33.5 13H66.5L87.5 68V72L66.5 127H33.5L12.5 72V68Z" />
        <path d="M50 30L70 70L50 110L30 70Z" />
        <path d="M50 13V30M50 110V127M12.5 70H30M70 70H87.5" />
      </g>
      <circle cx="50" cy="70" r="7" fill="#0a1a1f" />
    </svg>
  )
})
