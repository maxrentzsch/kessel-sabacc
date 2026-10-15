import { AnimatePresence, motion } from 'motion/react'
import type { Character } from '../../ai/personalities'
import { SUITS } from '../../engine'
import type { GameState, Player, PlayerResult, Suit } from '../../engine'
import { scoreLabel, TOKEN_TEXT } from '../../i18n/texts'
import { useGame } from '../../store/game'
import { Portrait } from '../art/Portrait'
import { TokenIcon } from '../art/TokenIcon'
import { cx } from '../cx'
import { useChipFloaters, useReveal, useSeatLife } from './feed'
import { useInspect } from './inspect'
import { PlayingCard } from './PlayingCard'
import s from './Table.module.css'
import { tx } from '../../i18n'

/** Phases in which nobody takes a turn any more. */
export const REVEAL_PHASES: GameState['phase'][] = ['impostor', 'showdown', 'handEnd', 'gameOver']

/** How far cards lean back when they lie on the table, seen from the player's chair. */
export const TABLE_LEAN = 42
/** A hand turned over for everybody is tipped towards the player. */
const SHOWN_LEAN = 14

/** Value an Impostor or Sylop ended up with, for the badge on the revealed card. */
export function resolvedValue(game: GameState, player: Player, suit: Suit, result?: PlayerResult): number | null {
  const card = player.hand?.[suit]
  if (!card || card.kind === 'number') return null
  if (card.kind === 'impostor') return game.modifiers.impostorSix ? 6 : (player.impostor[suit] ?? null)
  if (!result || result.score.category === 'pure') return null
  return suit === 'sand' ? result.score.sandValue : result.score.bloodValue
}

export function ChipFloaters({ playerId }: { playerId: number }) {
  const floaters = useChipFloaters(playerId)
  return (
    <AnimatePresence>
      {floaters.map((f, i) => (
        <motion.span
          key={f.id}
          className={cx(s.floater, 'num', f.delta > 0 ? s.floaterGood : s.floaterBad)}
          initial={{ opacity: 0, y: 6, scale: 0.7 }}
          animate={{ opacity: 1, y: -18 - i * 16, scale: 1 }}
          exit={{ opacity: 0, y: -36 - i * 16 }}
          transition={{ duration: 0.45 }}
        >
          {f.delta > 0 ? `+${f.delta}` : `−${-f.delta}`}
        </motion.span>
      ))}
    </AnimatePresence>
  )
}

/**
 * Where the opponents sit along the far rim: `x` from −1 (far left) to 1,
 * `drop` how much lower (closer to the player) the rim is there, in table units.
 */
export const SLOTS: Record<number, { x: number; drop: number }[]> = {
  1: [{ x: 0, drop: 0 }],
  2: [
    { x: -0.62, drop: 2 },
    { x: 0.62, drop: 2 },
  ],
  3: [
    { x: -1, drop: 5.5 },
    { x: 0, drop: 0 },
    { x: 1, drop: 5.5 },
  ],
}

/**
 * A column of chips lying on the table. Every chip is its own element with a
 * stable id, so paying into the bet (or getting it back) moves real chips
 * from one column to the other.
 */
function ChipColumn({ owner, from, count, bet }: { owner: number; from: number; count: number; bet?: boolean }) {
  return (
    <span className={cx(s.stack, bet && s.stackBet)}>
      <AnimatePresence>
        {Array.from({ length: Math.min(count, 14) }, (_, i) => (
          <motion.i
            key={from + i}
            layoutId={`chip-${owner}-${from + i}`}
            className={s.coin}
            style={{ ['--n' as string]: i }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, transition: { duration: 0.3 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        ))}
      </AnimatePresence>
    </span>
  )
}

interface Props {
  player: Player
  character: Character
  /** position among the opponents, left to right */
  slot: number
  opponents: number
}

export function Seat({ player, character, slot, opponents }: Props) {
  const game = useGame((g) => g.game)!
  const thinking = useGame((g) => g.thinking === player.id)
  const life = useSeatLife(player.id, character)
  const peeked = useGame((g) => g.peeked)
  const reveal = useReveal(player.id)

  const acting = game.current === player.id && !REVEAL_PHASES.includes(game.phase)
  const { result } = reveal
  const pending = game.pendingDraw && game.current === player.id ? game.pendingDraw : null
  const n = game.players.length
  const dealOrder = (player.id - game.dealer + n) % n
  // A Sabacc turned over in the spotlight is worth a grin.
  const mood = reveal.focus && result && result.score.category !== 'none' ? 'happy' : life.mood

  const { x, drop } = SLOTS[opponents][slot]
  const place = { ['--sx' as string]: x, ['--drop' as string]: drop, ['--offset' as string]: `${-player.id * 1.7}s` }
  const state = cx(acting && s.seatActive, player.eliminated && s.seatOut, reveal.winner && s.seatWinner, reveal.focus && s.seatFocus, reveal.dimmed && s.dimmed)
  const edge = opponents > 1 && (slot === 0 ? s.edgeLeft : slot === opponents - 1 ? s.edgeRight : undefined)

  // Two layers: the bust sits behind the table top, everything else lies on it.
  return (
    <>
      <div className={cx(s.bust, state, edge, player.immune && s.immune)} style={place} data-seat={player.id}>
        <svg className={s.frame} viewBox="0 0 100 124" aria-hidden>
          <path d="M28 2H72L98 62L72 122H28L2 62Z" />
          <path className={s.frameInner} d="M31.500 9H68.500L90.500 62L68.500 115H31.500L9.500 62Z" />
        </svg>
        <span className={s.halo} />
        <Portrait character={character} mood={mood} talking={life.talking} alive size="100%" />
        {!player.eliminated && !result && (
          <span className={s.seatTokens}>
            {player.tokens.map((token, i) => (
              <button key={`${token}-${i}`} className={s.seatToken} onClick={() => useInspect.getState().showToken(token, false)} aria-label={tx`${player.name}: Token ${TOKEN_TEXT[token].name} ansehen`}>
                <TokenIcon token={token} size="58%" />
              </button>
            ))}
          </span>
        )}
        <AnimatePresence>
          {life.bubble && (
            <motion.span
              key={life.bubble.id}
              className={cx(s.bubble, life.bubble.speech && s.bubbleSpeech, life.bubble.gesture && s.bubbleGesture)}
              initial={{ opacity: 0, scale: 0.6, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 480, damping: 26 }}
            >
              {life.bubble.text}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className={cx(s.place, state, edge)} style={place}>
        <div className={s.plate}>
          <span className={s.seatName}>{player.name}</span>
          <span className={cx(s.seatChips, 'num')}>
            <i className={s.chipDot} />
            {player.chips}
            {player.invested > 0 && (
              <em className={s.seatInvested} title={tx`Einsatz`}>
                +{player.invested}
              </em>
            )}
            <ChipFloaters playerId={player.id} />
          </span>
          {thinking && (
            <span className={s.thinking} aria-label={tx`überlegt`}>
              <i />
              <i />
              <i />
            </span>
          )}
        </div>

        <div className={s.seatCards}>
          {player.hand &&
            SUITS.map((suit, i) => {
              const value = reveal.shown ? resolvedValue(game, player, suit, result) : null
              // a card the player sneaked a look at stays open for them alone
              const seen = peeked.includes(player.hand![suit].id)
              return (
                <PlayingCard
                  key={player.hand![suit].id}
                  card={player.hand![suit]}
                  hand={game.handNumber}
                  faceUp={reveal.shown || seen}
                  lean={reveal.shown || seen ? SHOWN_LEAN : TABLE_LEAN}
                  enter="deal"
                  dealFrom={{ x: 0, y: 90 }}
                  delay={dealOrder * 0.22 + i * 0.1}
                  flipDelay={i * 0.12}
                  className={cx(s.miniCard, seen && !reveal.shown && s.miniSeen)}
                >
                  {value !== null && <span className={cx(s.cardBadge, 'num')}>{value}</span>}
                </PlayingCard>
              )
            })}
          {pending && (
            <PlayingCard
              key={pending.card.id}
              card={pending.card}
              hand={game.handNumber}
              faceUp={pending.source.endsWith('Discard')}
              lean={TABLE_LEAN}
              className={cx(s.miniCard, s.miniPending)}
            />
          )}
          {!player.hand && <span className={s.seatGone}>{tx`ausgeschieden`}</span>}
          {/* stock next to the hand, the bet pushed towards the middle of the table */}
          <span className={cx(s.stacks, x > 0 || (x === 0 && opponents > 1) ? s.stacksLeft : undefined)} aria-hidden>
            <ChipColumn owner={player.id} from={0} count={player.chips} />
            <ChipColumn owner={player.id} from={player.chips} count={player.invested} bet />
          </span>
          {!reveal.shown && (
            <span className={s.seatStatus}>
              {player.immune && <span className={cx(s.status, s.statusImmune)}>{tx`Immun`}</span>}
              {player.embargoed && <span className={cx(s.status, s.statusBad)}>{tx`Embargo`}</span>}
              {player.standing && !player.embargoed && <span className={s.status}>{tx`Steht`}</span>}
            </span>
          )}
        </div>

        {result && (
          <motion.span
            className={cx(s.scoreTag, result.score.category !== 'none' && s.scoreSabacc, 'num')}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.35 }}
          >
            {scoreLabel(result.score)}
            {reveal.settled && !result.winner && <b> −{result.investedBefore + result.penalty}</b>}
          </motion.span>
        )}
      </div>
    </>
  )
}
