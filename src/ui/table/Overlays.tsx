import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { TUTORIAL_RESULT } from '../../career/tutorial'
import { venueOf } from '../../career/venues'
import { canPlayToken, tokenTargets, TOKENS } from '../../engine'
import type { GameState, PendingDice, PlayerResult, TokenId } from '../../engine'
import { chipsText, scoreLabel, SUIT_NAME, TOKEN_TEXT } from '../../i18n/texts'
import { HUMAN, revealOrder, useGame } from '../../store/game'
import { tempo } from '../../store/settings'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import { useFeed } from './feed'
import { useInspect } from './inspect'
import s from './Table.module.css'
import { tx } from '../../i18n'

// ── Shift token sheet ────────────────────────────────────────────────────────

function whyNot(game: GameState, token: TokenId, canAct: boolean): string {
  const me = game.players[HUMAN]
  if (!canAct || game.phase !== 'turn') return tx`Tokens spielst du in deinem Zug, bevor du ziehst oder stehst.`
  if (game.tokenPlayedThisTurn) return tx`Du hast in diesem Zug schon ein Token gespielt.`
  if (token === 'freeDraw' && me.embargoed) return tx`Embargo: Du darfst in diesem Zug nicht ziehen.`
  if ((token === 'refund' || token === 'extraRefund') && me.invested === 0) return tx`Du hast noch nichts im Einsatz.`
  if (TOKENS[token].target === 'standingOpponent') return tx`Gerade steht kein Gegner, den du prüfen könntest.`
  if (TOKENS[token].target === 'opponent') return tx`Alle Gegner sind immun.`
  return tx`Dieses Token kannst du gerade nicht spielen.`
}


export function TokenSheet({ canAct }: { canAct: boolean }) {
  const inspected = useInspect((i) => i.token)
  const onClose = useInspect((i) => i.close)
  const token = inspected?.token ?? null
  // The sheet keeps saying whose token it was while it slides out.
  const [wasMine, setWasMine] = useState(false)
  useEffect(() => {
    if (inspected) setWasMine(inspected.mine)
  }, [inspected])
  const mine = inspected?.mine ?? wasMine
  const game = useGame((g) => g.game)!
  const session = useGame((g) => g.session)!
  const act = useGame((g) => g.act)
  // Keep the last token around so the sheet can animate out with its content.
  const [shown, setShown] = useState(token)
  useEffect(() => {
    if (token) setShown(token)
  }, [token])
  const t = token ?? shown
  if (!t) return null

  const text = TOKEN_TEXT[t]
  const playable = mine && canAct && canPlayToken(game, HUMAN, t)
  const targets = playable ? tokenTargets(game, HUMAN, t) : []
  const play = (target?: number) => {
    onClose()
    act({ type: 'playToken', token: t, target })
  }

  return (
    <Sheet open={token !== null} onClose={onClose}>
      <div className={s.tokenHead}>
        <span className={s.tokenBig}>
          <TokenIcon token={t} size={34} />
        </span>
        <div>
          <p className={s.tokenKicker}>{mine ? tx`Shift-Token` : tx`Token eines Gegners`}</p>
          <h2 className={common.sheetTitle}>{text.name}</h2>
        </div>
      </div>
      <p className={common.sheetText}>{text.long}</p>

      {playable && targets.length > 0 && (
        <>
          <p className={s.targetCaption}>{tx`Ziel wählen`}</p>
          <div className={s.targets}>
            {targets.map((id) => (
              <button key={id} className={s.targetBtn} onClick={() => play(id)}>
                <Portrait character={session.seats[id]} size={44} frame />
                <span>
                  <b>{game.players[id].name}</b>
                  <em className="num">
                    {chipsText(game.players[id].chips)}{tx` · Einsatz `}{game.players[id].invested}
                  </em>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {mine && !playable && <p className={s.tokenNote}>{whyNot(game, t, canAct)}</p>}

      <div className={common.sheetActions}>
        <button className={cx(common.btn, common.btnGhost)} onClick={onClose}>
          {playable ? tx`Abbrechen` : tx`Schließen`}
        </button>
        {playable && targets.length === 0 && (
          <button className={cx(common.btn, common.btnPrimary)} onClick={() => play()}>
            {tx`Spielen`}
          </button>
        )}
      </div>
    </Sheet>
  )
}

// ── Banner when anybody plays a token ────────────────────────────────────────

interface Banner {
  id: number
  token: TokenId
  who: string
  target: string | null
}

export function TokenBanner() {
  const [banner, setBanner] = useState<Banner | null>(null)
  useFeed((event, id) => {
    if (event.type !== 'tokenPlayed') return
    const players = useGame.getState().game!.players
    const name = (p: number) => (p === HUMAN ? tx`Du` : players[p].name)
    setBanner({
      id,
      token: event.token,
      who: event.playerId === HUMAN ? tx`Du spielst` : tx`${players[event.playerId].name} spielt`,
      target: event.target !== undefined ? (event.target === HUMAN ? tx`gegen dich` : tx`gegen ${name(event.target)}`) : null,
    })
    setTimeout(() => setBanner((b) => (b?.id === id ? null : b)), 1900 * tempo())
  })

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={banner.id}
          className={s.banner}
          initial={{ opacity: 0, scaleY: 0.4 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.4 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className={s.bannerIcon}
            initial={{ scale: 0.2, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.08 }}
          >
            <TokenIcon token={banner.token} size={40} />
          </motion.span>
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}>
            <p className={s.bannerWho}>
              {banner.who} {banner.target}
            </p>
            <p className={cx(s.bannerName, 'display')}>{TOKEN_TEXT[banner.token].name}</p>
            <p className={s.bannerText}>{TOKEN_TEXT[banner.token].short}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Dice ─────────────────────────────────────────────────────────────────────

const PIP_CELLS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function DieFace({ value }: { value: number }) {
  return (
    <span className={s.dieFace}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={PIP_CELLS[value].includes(i) ? s.pipOn : undefined} />
      ))}
    </span>
  )
}

interface Roll extends PendingDice {
  rolling: boolean
  chosen: number | null
}

export function DiceOverlay({ canAct }: { canAct: boolean }) {
  const pending = useGame((g) => g.game?.pendingDice ?? null)
  const players = useGame((g) => g.game!.players)
  const act = useGame((g) => g.act)
  const [roll, setRoll] = useState<Roll | null>(null)
  const [shuffle, setShuffle] = useState<[number, number]>([1, 1])

  // A new roll: tumble for a moment, then land on the real values.
  useEffect(() => {
    if (!pending) return
    setRoll({ ...pending, rolling: true, chosen: null })
    const tick = setInterval(() => setShuffle([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 70)
    const stop = setTimeout(() => {
      clearInterval(tick)
      setRoll((r) => r && { ...r, rolling: false })
    }, 950 * tempo())
    return () => {
      clearInterval(tick)
      clearTimeout(stop)
    }
  }, [pending])

  // The choice: light up the picked die, then get out of the way.
  useFeed((event) => {
    if (event.type !== 'diceChosen') return
    setRoll((r) => r && { ...r, rolling: false, chosen: event.value })
    setTimeout(() => setRoll((r) => (r?.chosen != null ? null : r)), 1000 * tempo())
  })

  const mine = roll?.playerId === HUMAN
  const pickable = mine && canAct && roll !== null && !roll.rolling && roll.chosen === null
  const choose = (value: number) =>
    act(roll!.purpose === 'prime' ? { type: 'choosePrime', value } : { type: 'chooseImpostor', value })
  const chosenIndex = roll && roll.chosen !== null ? roll.dice.indexOf(roll.chosen) : -1

  return (
    <AnimatePresence>
      {roll && (
        <motion.div className={s.diceLayer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className={s.dicePanel}
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <p className={s.tokenKicker}>{mine ? tx`Du würfelst` : tx`${players[roll.playerId].name} würfelt`}</p>
            <h2 className={cx(s.diceTitle, 'display')}>
              {roll.purpose === 'prime' ? tx`Prime Sabacc` : tx`Impostor · ${SUIT_NAME[roll.suit!]}`}
            </h2>
            <div className={s.dice}>
              {roll.dice.map((value, i) => (
                <motion.button
                  key={i}
                  className={cx(s.die, roll.rolling && s.dieRolling, chosenIndex === i && s.dieChosen, chosenIndex >= 0 && chosenIndex !== i && s.dieDim, pickable && s.diePick)}
                  disabled={!pickable}
                  onClick={() => choose(value)}
                  whileTap={pickable ? { scale: 0.92 } : undefined}
                  aria-label={roll.rolling ? tx`Würfel rollt` : tx`Wert ${value} wählen`}
                >
                  <DieFace value={roll.rolling ? shuffle[i] : value} />
                </motion.button>
              ))}
            </div>
            <p className={s.diceHint}>
              {roll.rolling
                ? '…'
                : roll.chosen !== null
                  ? tx`Gewählt: ${roll.chosen}`
                  : mine
                    ? roll.purpose === 'prime'
                      ? tx`Welcher Sabacc soll der beste sein?`
                      : tx`Welchen Wert bekommt dein Impostor?`
                    : tx`wählt einen Würfel …`}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Showdown ─────────────────────────────────────────────────────────────────

const SABACC_CALL = { pure: tx`Pure Sabacc!`, prime: tx`Prime Sabacc!`, sabacc: tx`Sabacc!` } as const

/** The big words over the table while the hands are turned over one by one. */
export function RevealCallout() {
  const game = useGame((g) => g.game)!
  const step = useGame((g) => g.revealStep)

  let call: { key: string; kicker?: string; text: string; sabacc?: boolean } | null = null
  if (game.phase === 'showdown' && step !== null && game.result) {
    const order = revealOrder(game)
    const name = (id: number) => (id === HUMAN ? tx`Du` : game.players[id].name)
    if (step < 0) {
      call = { key: 'intro', text: tx`Karten auf den Tisch` }
    } else if (step < order.length) {
      const r = game.result.ranking.find((x) => x.playerId === order[step])!
      if (r.score.category !== 'none') call = { key: `hand-${step}`, kicker: name(order[step]), text: SABACC_CALL[r.score.category], sabacc: true }
    } else {
      const winners = game.result.ranking.filter((r) => r.winner).map((r) => r.playerId)
      const mine = winners.includes(HUMAN)
      call = {
        key: 'winner',
        kicker: winners.length > 1 ? tx`Unentschieden` : tx`Die Hand geht an`,
        text: winners.length > 1 ? winners.map(name).join(' & ') : mine ? tx`Dich` : name(winners[0]),
        sabacc: mine,
      }
    }
  }

  return (
    <AnimatePresence mode="wait">
      {call && (
        <motion.div
          key={call.key}
          className={s.callout}
          initial={{ opacity: 0, scale: 1.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {call.kicker && <span className={s.calloutKicker}>{call.kicker}</span>}
          <span className={cx(s.calloutText, 'display', call.sabacc && s.calloutSabacc)}>{call.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Cheating ─────────────────────────────────────────────────────────────────

/** How closely the table is watching, as a small meter. */
export function Suspicion({ compact }: { compact?: boolean }) {
  const suspicion = useGame((g) => g.suspicion)
  if (compact && suspicion < 1) return null
  const level = suspicion >= 70 ? s.heatHigh : suspicion >= 40 ? s.heatMid : undefined
  return (
    <span className={cx(s.heat, level)} title={tx`Verdacht`}>
      <Icon name="eye" size={14} />
      <i>
        <b style={{ width: `${Math.min(100, suspicion)}%` }} />
      </i>
      {!compact && <em className="num">{Math.round(suspicion)} %</em>}
    </span>
  )
}

export function PeekSheet({ canAct }: { canAct: boolean }) {
  const open = useInspect((i) => i.peeking)
  const onClose = useInspect((i) => i.close)
  const game = useGame((g) => g.game)!
  const session = useGame((g) => g.session)!
  const peek = useGame((g) => g.peek)
  const used = useGame((g) => g.peekUsed)
  const ready = canAct && game.phase === 'turn' && !used
  const targets = game.players.filter((p) => !p.isHuman && !p.eliminated && p.hand)

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className={common.sheetTitle}>{tx`Spähen`}</h2>
      <p className={common.sheetText}>
        {tx`Wirf einen Blick auf eine Karte eines Gegners – einmal pro Hand, in deinem Zug. Jeder Blick macht den Tisch misstrauischer. Bei vollem Verdacht wirst du erwischt, siehst nichts und zahlst 2 Chips Strafe.`}
      </p>
      <div className={s.heatRow}>
        <span>{tx`Verdacht`}</span>
        <Suspicion />
      </div>
      {ready ? (
        <div className={s.targets}>
          {targets.map((p) => (
            <button
              key={p.id}
              className={s.targetBtn}
              onClick={() => {
                onClose()
                peek(p.id)
              }}
            >
              <Portrait character={session.seats[p.id]} size={44} frame />
              <span>
                <b>{p.name}</b>
                <em>{tx`eine Karte ansehen`}</em>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className={s.tokenNote}>{used ? tx`In dieser Hand hast du schon gespäht.` : tx`Spähen kannst du nur in deinem Zug, bevor du ziehst oder stehst.`}</p>
      )}
      <div className={common.sheetActions}>
        <button className={cx(common.btn, common.btnGhost)} onClick={onClose}>
          {tx`Schließen`}
        </button>
      </div>
    </Sheet>
  )
}

// ── The dealer's announcements ───────────────────────────────────────────────

interface Notice {
  id: number
  title: string
  sub?: string
  /** the name of the place, shown large when the player sits down */
  grand?: boolean
  /** bad news */
  alarm?: boolean
}

/** Calls out where we are: the venue on sitting down, then every new hand and round. */
export function Announcer() {
  const session = useGame((g) => g.session)!
  const [notice, setNotice] = useState<Notice | null>(() => {
    const game = useGame.getState().game
    return game?.handNumber === 1 && game.round === 1 ? { id: 0, title: session.title, sub: venueOf(session.venue).place, grand: true } : null
  })
  const show = (next: Notice, ms: number) => {
    setNotice(next)
    setTimeout(() => setNotice((n) => (n?.id === next.id ? null : n)), ms * tempo())
  }
  useEffect(() => {
    const timer = setTimeout(() => setNotice((n) => (n?.id === 0 ? null : n)), 2600)
    return () => clearTimeout(timer)
  }, [])

  // caught cheating
  const caught = useGame((g) => g.caught)
  const seenCaught = useRef(caught)
  useEffect(() => {
    if (caught === seenCaught.current) return
    seenCaught.current = caught
    show({ id: -caught, title: tx`Erwischt!`, sub: tx`Strafe: 2 Chips`, alarm: true }, 2200)
  })

  useFeed((event, id) => {
    if (event.type === 'handStart' && event.hand > 1) show({ id, title: tx`Hand ${event.hand}`, sub: tx`Neue Karten` }, 1700)
    if (event.type === 'roundStart' && event.round > 1) {
      sfx.round()
      show({ id, title: event.round === useGame.getState().game?.rules.rounds ? tx`Letzte Runde` : tx`Runde ${event.round}` }, 1500)
    }
  })

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice.id}
          className={cx(s.notice, notice.grand && s.noticeGrand, notice.alarm && s.noticeAlarm)}
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {!notice.grand && <span className={s.noticeKicker}>{notice.alarm ? tx`Aufsicht` : tx`Kessel Sabacc`}</span>}
          <span className={cx(s.noticeTitle, 'display')}>{notice.title}</span>
          {notice.sub && <span className={s.noticeSub}>{notice.sub}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── End of hand ──────────────────────────────────────────────────────────────

function ResultRow({ r, index }: { r: PlayerResult; index: number }) {
  const game = useGame((g) => g.game)!
  const session = useGame((g) => g.session)!
  const player = game.players[r.playerId]
  const lost = r.investedBefore + r.penalty
  return (
    <motion.li
      className={cx(s.resultRow, r.winner && s.resultWin)}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + index * 0.09 }}
    >
      <Portrait character={session.seats[r.playerId]} size={40} frame />
      <div className={s.resultWho}>
        <b>{player.isHuman ? tx`Du` : player.name}</b>
        <span className="num">{scoreLabel(r.score)}</span>
      </div>
      <span className={cx(s.resultValues, 'num')}>
        {r.score.category === 'pure' ? (
          '◎ ◎'
        ) : (
          <>
            <i data-suit="sand">{r.score.sandValue}</i>
            <i data-suit="blood">{r.score.bloodValue}</i>
          </>
        )}
      </span>
      <div className={cx(s.resultChips, 'num')}>
        <b className={r.winner ? s.floaterGood : s.floaterBad}>{r.winner ? (r.investedBefore > 0 ? `+${r.investedBefore}` : '±0') : `−${lost}`}</b>
        <span>{r.eliminated ? tx`pleite` : chipsText(r.chipsAfter)}</span>
      </div>
    </motion.li>
  )
}

export function ResultSheet({ onLeave }: { onLeave(): void }) {
  const game = useGame((g) => g.game)!
  const session = useGame((g) => g.session)!
  const outcome = useGame((g) => g.outcome)
  const busy = useGame((g) => g.busy)
  const act = useGame((g) => g.act)
  const open = !busy && (game.phase === 'handEnd' || game.phase === 'gameOver') && game.result !== null
  const result = game.result
  if (!result) return null

  const winners = result.ranking.filter((r) => r.winner)
  const iWon = winners.some((r) => r.playerId === HUMAN)
  const tutorial = session.tutorial
  const title = tutorial
    ? tx`Übung geschafft`
    : outcome === 'won'
    ? tx`Der Tisch gehört dir!`
    : outcome === 'lost'
      ? tx`Du bist pleite`
      : winners.length > 1
        ? iWon ? tx`Geteilter Sieg` : tx`Unentschieden am Tisch`
        : iWon ? tx`Hand gewonnen` : tx`${game.players[winners[0].playerId].name} gewinnt die Hand`

  return (
    <Sheet open={open} bare>
      <h2 className={cx(common.sheetTitle, iWon ? s.titleWin : undefined)}>{title}</h2>
      {tutorial && <p className={common.sheetText}>{TUTORIAL_RESULT}</p>}
      <ul className={s.resultList}>
        {result.ranking.map((r, i) => (
          <ResultRow key={r.playerId} r={r} index={i} />
        ))}
      </ul>
      <div className={common.sheetActions}>
        {outcome || tutorial ? (
          <button className={cx(common.btn, common.btnPrimary)} onClick={onLeave}>
            {tutorial ? tx`Übung beenden` : tx`Weiter`}
          </button>
        ) : (
          <button className={cx(common.btn, common.btnPrimary)} onClick={() => act({ type: 'nextHand' })}>
            {tx`Nächste Hand`}
          </button>
        )}
      </div>
    </Sheet>
  )
}
