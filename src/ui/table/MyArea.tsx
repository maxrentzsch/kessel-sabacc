import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { outcomes, winChance } from '../../ai/evaluate'
import { DEFAULT_PROFILES } from '../../ai/personalities'
import { chooseAction } from '../../ai/policy'
import { canPlayToken, Rng, SUITS } from '../../engine'
import type { Card, GameState, Player } from '../../engine'
import { scoreLabel, SOURCE_NAME, SUIT_NAME, TOKEN_TEXT } from '../../i18n/texts'
import { useCareer } from '../../store/career'
import { HUMAN, useGame } from '../../store/game'
import { Critter } from '../art/Critter'
import { Icon } from '../art/Icons'
import { TokenIcon } from '../art/TokenIcon'
import { cx } from '../cx'
import { PlayingCard } from './PlayingCard'
import { useReveal } from './feed'
import { useInspect } from './inspect'
import { ChipFloaters, resolvedValue, REVEAL_PHASES } from './Seat'
import s from './Table.module.css'
import { tx } from '../../i18n'

function handLabel(game: GameState, me: Player): { text: string; sabacc: boolean } {
  const result = game.result?.ranking.find((r) => r.playerId === me.id)
  if (result) return { text: scoreLabel(result.score), sabacc: result.score.category !== 'none' }
  const possible = outcomes(me.hand!, game.modifiers, me.impostor)
  if (possible.length > 1) return { text: tx`Impostor · Würfel entscheiden`, sabacc: false }
  return { text: scoreLabel(possible[0].score), sabacc: possible[0].score.category !== 'none' }
}

/**
 * What a strong player would do in the player's place, and how the hand stands.
 * The same question gets the same answer however often it is asked.
 */
function advise(game: GameState): string {
  const me = game.players[HUMAN]
  const rng = new Rng(game.handNumber * 131 + game.round * 17 + me.chips * 7 + me.invested)
  const action = chooseAction(game, DEFAULT_PROFILES.hard, rng)
  const name = (id: number) => game.players[id].name
  const move =
    action.type === 'draw'
      ? tx`Zieh vom ${SOURCE_NAME[action.source]}.`
      : action.type === 'stand'
        ? tx`Bleib stehen.`
        : action.type === 'playToken'
          ? tx`Spiel ${TOKEN_TEXT[action.token].name}${action.target !== undefined ? tx` gegen ${name(action.target)}` : ''}.`
          : action.type === 'discard'
            ? tx`Behalte die ${action.keep === 'new' ? tx`neue` : tx`alte`} Karte.`
            : action.type === 'chooseImpostor' || action.type === 'choosePrime'
              ? tx`Nimm die ${action.value}.`
              : ''
  if (game.phase !== 'turn' || !me.hand) return move
  const rivals = game.players.filter((p) => !p.isHuman && !p.eliminated).length
  const chance = Math.round(winChance(me.hand, game.modifiers, rivals, me.impostor) * 100)
  return tx`${move} Mit diesem Blatt gewinnst du etwa ${chance} von 100 Händen.`
}

function ChipPile({ from, count, invested }: { from: number; count: number; invested?: boolean }) {
  return (
    <span className={s.chipRow}>
      <AnimatePresence>
        {Array.from({ length: count }, (_, i) => (
          <motion.i
            key={from + i}
            layoutId={`chip-${from + i}`}
            className={cx(s.chip, invested && s.chipInvested)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.2, opacity: 0, y: invested ? -26 : 14 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.03 }}
          />
        ))}
      </AnimatePresence>
    </span>
  )
}

interface Props {
  /** it is the player's move and nothing is animating */
  canAct: boolean
  /** coaching for the current step, if any */
  hint: ReactNode
  /** where coaching is shown on small screens: over the back wall, so the table stays put when it comes and goes */
  hintSlot: HTMLElement | null
  /** cheating is on offer at this table */
  canPeek: boolean
}

/** How far the hand has to be pushed aside to stand, in pixels. */
const WAVE = 76

export function MyArea({ canAct, hint, hintSlot, canPeek }: Props) {
  /** the hand is being pushed aside: far enough to stand on release, or not yet */
  const [wave, setWave] = useState<'near' | 'far' | null>(null)
  const session = useGame((g) => g.session)!
  const tipsLeft = useGame((g) => g.tipsLeft)
  // Once it has come along, Bix gives the tips; the practice hand keeps the lamp.
  const bix = useCareer((c) => (c.hasShip ? c.bix : null))
  const takeTip = useGame((g) => g.takeTip)
  /** advice holds for the situation it was given in */
  const [tip, setTip] = useState<{ game: GameState; text: string } | null>(null)
  const peekUsed = useGame((g) => g.peekUsed)
  const game = useGame((g) => g.game)!
  const act = useGame((g) => g.act)
  const me = game.players[HUMAN]
  const myTurn = game.current === HUMAN && !REVEAL_PHASES.includes(game.phase)
  const reveal = useReveal(HUMAN)
  const pending = game.pendingDraw && game.current === HUMAN ? game.pendingDraw : null
  const choosing = canAct && game.phase === 'discard' && pending
  const standing = canAct && game.phase === 'turn'
  const n = game.players.length
  const dealOrder = (HUMAN - game.dealer + n) % n

  const cards: { card: Card; isNew: boolean }[] = []
  if (me.hand) {
    for (const suit of SUITS) {
      cards.push({ card: me.hand[suit], isNew: false })
      if (pending?.card.suit === suit) cards.push({ card: pending.card, isNew: true })
    }
  }
  const label = me.hand ? handLabel(game, me) : null
  const advice = tip && tip.game === game ? tip.text : null
  const coaching = advice ? (
    <p className={cx(s.hint, s.tip)}>
      <Icon name="bulb" size={16} />
      <span>{advice}</span>
    </p>
  ) : (
    hint
  )
  const askTip = () => {
    if (canAct && takeTip()) setTip({ game, text: advise(game) })
  }

  return (
    <section className={cx(s.me, myTurn && s.meActive, reveal.winner && s.meWinner, reveal.focus && s.meFocus, reveal.dimmed && s.dimmed)}>
      {/* with room to spare the coaching sits beside the hand, otherwise over the back wall */}
      <div className={s.hintDesk}>{coaching}</div>
      {hintSlot && createPortal(coaching, hintSlot)}
      <motion.div
        className={s.myHand}
        data-seat={HUMAN}
        drag={standing ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.45}
        dragSnapToOrigin
        onDrag={(_, info) => setWave(Math.abs(info.offset.x) > WAVE ? 'far' : 'near')}
        onDragEnd={(_, info) => {
          setWave(null)
          if (Math.abs(info.offset.x) > WAVE) act({ type: 'stand' })
        }}
      >
        {wave && <span className={cx(s.waveTag, wave === 'far' && s.waveTagOn)}>{wave === 'far' ? tx`Loslassen: Stehen` : tx`Weiter wischen = Stehen`}</span>}
        {cards.map(({ card, isNew }, i) => {
          const pick = choosing && card.suit === pending.card.suit
          const value = reveal.shown ? resolvedValue(game, me, card.suit, reveal.result) : null
          return (
            <PlayingCard
              key={card.id}
              card={card}
              hand={game.handNumber}
              faceUp
              enter="deal"
              dealFrom={{ x: 0, y: -140 }}
              delay={dealOrder * 0.22 + i * 0.1}
              className={cx(s.myCard, pick && s.myCardPick, choosing && !pick && s.myCardDim)}
              onClick={pick ? () => act({ type: 'discard', keep: isNew ? 'new' : 'old' }) : undefined}
              onFling={pick ? () => act({ type: 'discard', keep: isNew ? 'old' : 'new' }) : undefined}
              label={pick ? tx`${isNew ? tx`Neue` : tx`Alte`} ${SUIT_NAME[card.suit]}-Karte behalten` : undefined}
            >
              {pick && <span className={cx(s.pickTag, isNew && s.pickTagNew)}>{isNew ? tx`Neu` : tx`Alt`}</span>}
              {value !== null && <span className={cx(s.cardBadge, 'num')}>{value}</span>}
            </PlayingCard>
          )
        })}
        {!me.hand && <p className={s.seatGone}>{tx`Du bist ausgeschieden`}</p>}
      </motion.div>

      {label && (
        <motion.p key={label.text} className={cx(s.myLabel, label.sabacc && s.scoreSabacc, 'num')} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          {label.text}
          {me.immune && <span className={cx(s.status, s.statusImmune)}>{tx`Immun`}</span>}
          {me.embargoed && <span className={cx(s.status, s.statusBad)}>{tx`Embargo`}</span>}
          {!session.tutorial && (
            <button className={s.tipBtn} disabled={!canAct || tipsLeft <= 0 || advice !== null} onClick={askTip} aria-label={tx`Tipp – noch ${Number.isFinite(tipsLeft) ? tipsLeft : tx`beliebig viele`}`}>
              {bix ? <Critter animal={bix} size={22} perch={false} /> : <Icon name="bulb" size={15} />}
              {Number.isFinite(tipsLeft) && <b className="num">{tipsLeft}</b>}
            </button>
          )}
        </motion.p>
      )}

      <div className={s.myChips}>
        <div className={s.chipGroup}>
          <span className={s.chipCaption}>
            {tx`Vorrat `}<b className="num">{me.chips}</b>
          </span>
          <ChipPile from={0} count={me.chips} />
        </div>
        <div className={s.chipGroup}>
          <span className={s.chipCaption}>
            {tx`Einsatz `}<b className="num">{me.invested}</b>
          </span>
          <ChipPile from={me.chips} count={me.invested} invested />
        </div>
        <ChipFloaters playerId={HUMAN} />
      </div>

      <div className={s.myBar}>
        <div className={s.myTokens}>
          {me.tokens.map((token, i) => {
            const playable = canAct && canPlayToken(game, HUMAN, token)
            return (
              <button
                key={`${token}-${i}`}
                className={cx(s.tokenBtn, playable && s.tokenBtnReady)}
                onClick={() => useInspect.getState().showToken(token, true)}
                aria-label={tx`Token ${TOKEN_TEXT[token].name}`}
              >
                <TokenIcon token={token} size="52%" />
              </button>
            )
          })}
          {Array.from({ length: Math.max(0, 3 - me.tokens.length) }, (_, i) => (
            <span key={i} className={cx(s.tokenBtn, s.tokenBtnUsed)} aria-hidden />
          ))}
          {canPeek && (
            <button className={cx(s.tokenBtn, s.peekBtn, canAct && game.phase === 'turn' && !peekUsed && s.peekBtnReady)} onClick={useInspect.getState().showPeek} aria-label={tx`Spähen`}>
              <Icon name="eye" size={22} />
            </button>
          )}
        </div>

        <button
          className={cx(s.standBtn, 'display')}
          disabled={!canAct || game.phase !== 'turn'}
          onClick={() => act({ type: 'stand' })}
          aria-keyshortcuts="S"
        >
          {tx`Stehen`}
        </button>
      </div>
    </section>
  )
}
