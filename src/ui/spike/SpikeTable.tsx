import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { banter } from '../../ai/banter'
import type { Character } from '../../ai/personalities'
import { DEFAULT_PROFILES } from '../../ai/personalities'
import { setAmbienceMix, sfx } from '../../audio/sfx'
import { venueOf } from '../../career/venues'
import { Rng } from '../../engine/rng'
import { tx } from '../../i18n'
import { activePlayers, anteOf, betSize, canRaise, owed, scoreSpikeHand } from '../../spike'
import type { SpikeCard, SpikeEvent, SpikePlayer, SpikeState } from '../../spike'
import { chooseSpikeAction, spikeWinChance } from '../../spike/ai'
import { useNav } from '../../store/nav'
import { tempo, useSettings } from '../../store/settings'
import { SPIKE_HUMAN, useSpike } from '../../store/spike'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import type { Mood } from '../art/Portrait'
import common from '../common/common.module.css'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import { Backdrop } from '../table/Backdrop'
import { SLOTS } from '../table/Seat'
import { Hub, Surface } from '../table/Surface'
import t from '../table/Table.module.css'
import s from './Spike.module.css'
import { SpikeBack, SpikeFace } from './SpikeCardArt'
import { cardsText, chipsText, describeSpike, handName, seatNote, signed } from './texts'

/** Run `handler` once for every event published after the component mounted. */
function useSpikeFeed(handler: (event: SpikeEvent, id: number) => void): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    let seen = useSpike.getState().feed.at(-1)?.id ?? 0
    return useSpike.subscribe((state) => {
      for (const item of state.feed) {
        if (item.id <= seen) continue
        seen = item.id
        ref.current(item.event, item.id)
      }
    })
  }, [])
}

interface CardProps {
  card: SpikeCard
  hand: number
  faceUp: boolean
  /** degrees the card leans back onto the table */
  lean?: number
  className?: string
  onClick?: () => void
  label?: string
}

/** A card that keeps its identity while it travels between deck, hands and discard pile. */
function Card({ card, hand, faceUp, lean = 0, className, onClick, label }: CardProps) {
  const speed = tempo()
  return (
    <motion.div
      layoutId={`spike-${hand}-${card.id}`}
      className={cx(t.card, onClick && t.cardButton, className)}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ layout: { type: 'spring', stiffness: 210 / speed, damping: 26, mass: 0.9 }, default: { duration: 0.35 * speed } }}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <motion.div className={t.cardLean} initial={false} animate={{ rotateX: lean }} transition={{ duration: 0.5 * speed }}>
        <motion.div className={t.cardFlip} initial={{ rotateY: faceUp ? 0 : 180 }} animate={{ rotateY: faceUp ? 0 : 180 }} transition={{ duration: 0.5 * speed }}>
          <div className={t.cardSide}>
            <SpikeFace card={card} />
          </div>
          <div className={cx(t.cardSide, t.cardBack)}>
            <SpikeBack />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/** What an opponent says and shows: a note for every move, a line now and then. */
function useSeatLife(player: SpikePlayer, character: Character) {
  const [bubble, setBubble] = useState<{ id: number; text: string; speech: boolean } | null>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms))
  }
  const say = (id: number, occasion: Parameters<typeof banter>[1], chance: number) => {
    if (Math.random() > chance) return
    const text = banter(character.id, occasion)
    if (!text) return
    setBubble({ id, text, speech: true })
    sfx.voice(character.hue, 2 + Math.ceil(text.length / 9), character.sigil === 'droid')
    later(1500 + text.length * 55, () => setBubble((b) => (b?.id === id ? null : b)))
  }

  useSpikeFeed((event, id) => {
    const note = seatNote(event, player.id)
    if (note) {
      setBubble((b) => (b?.speech ? b : { id, text: note, speech: false }))
      later(1500 * tempo(), () => setBubble((b) => (b?.id === id ? null : b)))
    }
    if (event.type === 'settled' && event.result.placing.some((x) => x.playerId === player.id)) {
      const won = event.result.winners.includes(player.id)
      setMood(won ? 'happy' : 'angry')
      later(4200, () => setMood(null))
      say(id, won ? 'win' : 'lose', won ? 0.8 : 0.35)
    }
    if (event.type === 'eliminated' && event.playerId === player.id) say(id, 'out', 1)
  })

  return { bubble, mood }
}

function Seat({ player, character, slot, opponents }: { player: SpikePlayer; character: Character; slot: number; opponents: number }) {
  const game = useSpike((g) => g.game)!
  const thinking = useSpike((g) => g.thinking === player.id)
  const life = useSeatLife(player, character)
  const shown = game.phase === 'showdown' || game.phase === 'handEnd' || game.phase === 'gameOver'
  const placing = shown ? game.result?.placing.find((x) => x.playerId === player.id) : undefined
  const open = !!placing && !game.result!.uncontested
  const acting = game.current === player.id && (game.phase === 'card' || game.phase === 'bet')
  const mood: Mood = player.eliminated ? 'out' : (life.mood ?? (thinking ? 'thinking' : player.folded ? 'worried' : 'idle'))

  const { x, drop } = SLOTS[opponents][slot]
  const place = { ['--sx' as string]: x, ['--drop' as string]: drop, ['--offset' as string]: `${-player.id * 1.7}s` }
  const state = cx(acting && t.seatActive, (player.eliminated || player.folded) && t.seatOut, placing?.winner && t.seatWinner)
  const edge = opponents > 1 && (slot === 0 ? t.edgeLeft : slot === opponents - 1 ? t.edgeRight : undefined)

  return (
    <>
      <div className={cx(t.bust, state, edge)} style={place}>
        <svg className={t.frame} viewBox="0 0 100 124" aria-hidden>
          <path d="M28 2H72L98 62L72 122H28L2 62Z" />
          <path className={t.frameInner} d="M31.5 9H68.5L90.5 62L68.5 115H31.5L9.5 62Z" />
        </svg>
        <span className={t.halo} />
        <Portrait character={character} mood={mood} talking={life.bubble?.speech ?? false} alive size="100%" />
        <AnimatePresence>
          {life.bubble && (
            <motion.span
              key={life.bubble.id}
              className={cx(t.bubble, life.bubble.speech && t.bubbleSpeech)}
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

      <div className={cx(t.place, state, edge)} style={place}>
        <div className={t.plate}>
          <span className={t.seatName}>{player.name}</span>
          <span className={cx(t.seatChips, 'num')}>
            <i className={t.chipDot} />
            {player.chips}
            {player.bet > 0 && <em className={s.wager}>+{player.bet}</em>}
          </span>
          {thinking && (
            <span className={t.thinking} aria-label={tx`überlegt`}>
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
        <div className={cx(s.minis, open && s.open)} data-count={player.hand.length}>
          {player.hand.map((card) => (
            <Card key={card.id} card={card} hand={game.handNumber} faceUp={open} lean={open ? 14 : 42} className={s.mini} />
          ))}
          {player.eliminated ? (
            <span className={cx(s.tag, s.tagOut)}>{tx`ausgeschieden`}</span>
          ) : player.folded ? (
            <span className={cx(s.tag, s.tagOut)}>{tx`ausgestiegen`}</span>
          ) : open ? (
            <span className={cx(s.tag, placing.winner && s.tagWin)}>{handName(placing.score)}</span>
          ) : null}
        </div>
      </div>
    </>
  )
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }

/** The spike dice: they tumble for a moment and land on what the dealer rolled. */
function Dice() {
  const rolling = useSpike((g) => g.rolling)
  const [tumbling, setTumbling] = useState(false)
  const [faces, setFaces] = useState<[number, number]>([1, 1])
  useEffect(() => {
    if (!rolling) return
    setTumbling(true)
    const spin = setInterval(() => setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 90)
    const land = setTimeout(() => {
      clearInterval(spin)
      setFaces(rolling)
      setTumbling(false)
    }, 750 * tempo())
    return () => {
      clearInterval(spin)
      clearTimeout(land)
    }
  }, [rolling])
  const shift = !!rolling && !tumbling && rolling[0] === rolling[1]

  return (
    <AnimatePresence>
      {rolling && (
        <motion.div className={t.diceLayer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className={t.dicePanel}>
            <h2 className={cx(t.diceTitle, 'display', shift && s.shift)}>{shift ? 'Sabacc Shift' : tx`Spike-Würfel`}</h2>
            <div className={t.dice}>
              {faces.map((value, i) => (
                <span key={i} className={cx(t.die, tumbling && t.dieRolling)}>
                  <span className={t.dieFace}>
                    {Array.from({ length: 9 }, (_, cell) => (
                      <i key={cell} className={PIPS[value].includes(cell) ? t.pipOn : undefined} />
                    ))}
                  </span>
                </span>
              ))}
            </div>
            <p className={s.diceNote}>{tumbling ? '' : shift ? tx`Pasch! Alle Hände werden abgeworfen und neu ausgeteilt.` : tx`Kein Pasch. Die Hände bleiben, wie sie sind.`}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** What a strong player would do in the player's place. */
function advise(game: SpikeState): string {
  const me = game.players[SPIKE_HUMAN]
  const rng = new Rng(game.handNumber * 131 + game.round * 17 + me.chips * 7 + me.hand.length)
  const action = chooseSpikeAction(game, DEFAULT_PROFILES.hard, rng)
  const card = (id?: string) => signed(me.hand.find((c) => c.id === id)?.value ?? 0)
  const move =
    action.type === 'gain'
      ? action.discard
        ? tx`Wirf die ${card(action.discard)} ab und nimm eine Karte.`
        : tx`Nimm eine Karte dazu.`
      : action.type === 'swap'
        ? tx`Tausch die ${card(action.give)} gegen die Ablage.`
        : action.type === 'stand'
          ? tx`Bleib stehen.`
          : action.type === 'check'
            ? tx`Schieb.`
            : action.type === 'bet'
              ? tx`Setz.`
              : action.type === 'call'
                ? tx`Geh mit.`
                : action.type === 'raise'
                  ? tx`Erhöh.`
                  : tx`Steig aus.`
  const chance = Math.round(spikeWinChance(me.hand, activePlayers(game).length - 1) * 100)
  return tx`${move} Mit diesem Blatt gewinnst du etwa ${chance} von 100 Händen.`
}

export function SpikeTableScreen() {
  const game = useSpike((g) => g.game)
  const session = useSpike((g) => g.session)
  const busy = useSpike((g) => g.busy)
  const thinking = useSpike((g) => g.thinking)
  const outcome = useSpike((g) => g.outcome)
  const act = useSpike((g) => g.act)
  const clear = useSpike((g) => g.clear)
  const start = useSpike((g) => g.start)
  const go = useNav((n) => n.go)
  const hints = useSettings((st) => st.hints)

  /** what the player is in the middle of choosing a card for */
  const [mode, setMode] = useState<'gain' | 'swap' | null>(null)
  const [quitting, setQuitting] = useState(false)
  const [junking, setJunking] = useState(false)
  const [line, setLine] = useState('')
  const [tip, setTip] = useState<{ game: SpikeState; text: string } | null>(null)

  useSpikeFeed((event) => {
    const current = useSpike.getState().game
    const text = current && describeSpike(event, current)
    if (text) setLine(text)
  })

  const venue = venueOf(session?.venue)
  useEffect(() => setAmbienceMix(venue.sound), [venue])
  useEffect(() => {
    if (!game || !session) go('free')
  }, [game, session, go])
  // A choice only stands for the turn it was started in.
  const turnKey = game ? `${game.handNumber}-${game.round}-${game.phase}-${game.current}` : ''
  useEffect(() => setMode(null), [turnKey])
  if (!game || !session) return null

  const me = game.players[SPIKE_HUMAN]
  const opponents = game.players.filter((p) => !p.isHuman)
  const shown = game.phase === 'showdown' || game.phase === 'handEnd' || game.phase === 'gameOver'
  const myTurn = !busy && game.current === SPIKE_HUMAN && (game.phase === 'card' || game.phase === 'bet') && !me.folded && !me.eliminated
  const cardTurn = myTurn && game.phase === 'card'
  const betTurn = myTurn && game.phase === 'bet'
  const top = game.discard[game.discard.length - 1]
  const due = owed(game, me)
  const size = betSize(game)
  const score = me.hand.length ? scoreSpikeHand(me.hand) : null
  const result = game.result
  const mine = shown ? result?.placing.find((x) => x.playerId === SPIKE_HUMAN) : undefined

  const pickCard = (card: SpikeCard) => {
    if (mode === 'gain') act({ type: 'gain', discard: card.id })
    else if (mode === 'swap') act({ type: 'swap', give: card.id })
    setMode(null)
  }

  // What is asked of the player right now.
  const prompt = !myTurn
    ? null
    : mode === 'gain'
      ? tx`Erst abwerfen? Tippe die Karte, die weg soll`
      : mode === 'swap'
        ? tx`Welche Karte gibst du für die ${signed(top?.value ?? 0)}?`
        : cardTurn
          ? tx`Stapel = nehmen · Ablage = tauschen · oder stehen`
          : due > 0
            ? tx`${chipsText(due)} zum Mitgehen`
            : tx`Schieben oder setzen`
  const firstHand = game.handNumber === 1
  const coaching =
    !myTurn || !firstHand
      ? null
      : cardTurn && game.round === 1
        ? tx`Ziel: Deine Karten sollen zusammen null ergeben – oder so nah dran wie möglich. Grün zählt plus, Rot minus.`
        : betTurn && game.round === 1
          ? tx`Nach den Karten wird gesetzt. Wer nicht mitgeht, steigt aus und verliert, was er im Topf hat.`
          : cardTurn && game.round === 2
            ? tx`Nach jeder Setzrunde rollen die Spike-Würfel. Bei einem Pasch bekommen alle neue Karten.`
            : null
  const advice = tip && tip.game === game ? tip.text : null
  const hintText = advice ?? (hints ? coaching : null)
  const hint: ReactNode = hintText ? (
    <p className={cx(t.hint, advice !== null && t.tip)}>
      {advice !== null && <Icon name="bulb" size={16} />}
      <span>{hintText}</span>
    </p>
  ) : null

  const waiting = thinking !== null ? tx`${game.players[thinking].name} überlegt …` : line
  const winners = result?.winners ?? []
  const iWon = winners.includes(SPIKE_HUMAN)
  const endTitle =
    outcome === 'won'
      ? tx`Der Tisch gehört dir!`
      : outcome === 'lost'
        ? tx`Du bist pleite`
        : winners.length > 1
          ? iWon
            ? tx`Geteilter Sieg`
            : tx`Unentschieden am Tisch`
          : iWon
            ? tx`Hand gewonnen`
            : tx`${game.players[winners[0] ?? 0].name} gewinnt die Hand`
  const sheetOpen = !busy && (game.phase === 'handEnd' || game.phase === 'gameOver' || outcome !== null) && result !== null

  const leave = () => {
    clear()
    go('free')
  }
  const again = () => start(session)

  return (
    <LayoutGroup>
      <div className={cx(t.table, game.phase === 'showdown' && t.revealing)} style={venue.colors}>
        <header className={t.top}>
          <button className={common.iconBtn} onClick={() => (outcome ? leave() : setQuitting(true))} aria-label={tx`Tisch verlassen`}>
            <Icon name="close" />
          </button>
          <div className={t.topTitle}>
            <b>Corellian Spike</b>
            <span>
              {tx`Hand`} {game.handNumber} · {tx`Grundeinsatz`} {anteOf(game, game.handNumber)}
            </span>
          </div>
          <div className={t.rounds} aria-label={tx`Runde ${game.round} von ${3}`}>
            <span className={t.roundLabel}>{tx`Runde`}</span>
            {[1, 2, 3].map((r) => (
              <i key={r} className={cx(t.roundPip, r < game.round && t.roundDone, r === game.round && t.roundNow)} />
            ))}
          </div>
        </header>

        <div className={t.scene}>
          <Backdrop dim={game.phase === 'showdown'} />
          <div className={t.hintTop}>{hint}</div>
          <div className={t.tableTop} aria-hidden>
            <i className={t.tableShadow} />
            <i className={t.discSide} />
            <i className={t.disc}>
              <Surface opponents={opponents.length} />
            </i>
          </div>
          <Hub />

          {opponents.map((p, i) => (
            <Seat key={p.id} player={p} character={session.seats[p.id]!} slot={i} opponents={opponents.length} />
          ))}

          <section className={t.center}>
            <div className={s.row}>
              <div className={cx(s.pot, s.potSabacc)}>
                <span className={cx(s.potChips, 'num')}>{game.sabaccPot}</span>
                <span className={s.potLabel}>{tx`Sabacc-Topf`}</span>
              </div>
              <button className={cx(s.pileBtn, cardTurn && mode === null && s.pileOn)} disabled={!cardTurn || mode !== null} onClick={() => setMode('gain')} aria-label={tx`Karte vom Stapel nehmen`}>
                <span className={cx(s.slot, t.pileStack)}>{game.deck.length > 0 && <Card card={game.deck[game.deck.length - 1]} hand={game.handNumber} faceUp={false} lean={42} />}</span>
                <span className={t.pileLabel}>
                  {tx`Stapel`}
                  <em className="num">{game.deck.length}</em>
                </span>
              </button>
              <button className={cx(s.pileBtn, cardTurn && mode === null && !!top && s.pileOn)} disabled={!cardTurn || mode !== null || !top} onClick={() => setMode('swap')} aria-label={tx`Mit der Ablage tauschen`}>
                <span className={s.slot}>{top && <Card card={top} hand={game.handNumber} faceUp lean={42} />}</span>
                <span className={t.pileLabel}>{tx`Ablage`}</span>
              </button>
              <div className={s.pot}>
                <span className={cx(s.potChips, 'num')}>{game.handPot}</span>
                <span className={s.potLabel}>{tx`Hand-Topf`}</span>
              </div>
            </div>
          </section>

          <div className={t.console} aria-live="polite">
            <p className={cx(t.ticker, prompt && t.tickerMine)}>{prompt ?? waiting}</p>
          </div>
        </div>

        <section className={cx(t.me, myTurn && t.meActive)}>
          <div className={t.hintDesk}>{hint}</div>
          <div className={cx(s.hand, s.handBox)} style={{ ['--n' as string]: Math.max(2, me.hand.length) }}>
            {me.hand.map((card) => (
              <Card
                key={card.id}
                card={card}
                hand={game.handNumber}
                faceUp
                className={cx(t.myCard, mode !== null && s.pick)}
                onClick={mode !== null ? () => pickCard(card) : undefined}
                label={mode === 'gain' ? tx`${signed(card.value)} abwerfen` : mode === 'swap' ? tx`${signed(card.value)} tauschen` : undefined}
              />
            ))}
            {me.eliminated ? <p className={t.seatGone}>{tx`Du bist ausgeschieden`}</p> : me.folded && <p className={t.seatGone}>{tx`Du bist ausgestiegen`}</p>}
          </div>

          {score && (
            <p className={cx(t.myLabel, score.total === 0 && t.scoreSabacc, 'num')}>
              {handName(mine?.score ?? score)}
              <button
                className={t.tipBtn}
                disabled={!myTurn || advice !== null}
                onClick={() => setTip({ game, text: advise(game) })}
                aria-label={tx`Tipp`}
              >
                <Icon name="bulb" size={15} />
              </button>
            </p>
          )}

          <div className={s.purse}>
            <span>
              Chips<b className="num">{me.chips}</b>
            </span>
            {me.bet > 0 && (
              <span>
                {tx`Gesetzt`}
                <b className="num">{me.bet}</b>
              </span>
            )}
          </div>

          <div className={s.bar}>
            {mode !== null ? (
              <>
                <button className={cx(common.btn, common.btnGhost)} onClick={() => setMode(null)}>
                  {tx`Abbrechen`}
                </button>
                {mode === 'gain' && me.hand.length < game.rules.handLimit && (
                  <button className={cx(common.btn, common.btnPrimary, s.wide)} onClick={() => (setMode(null), act({ type: 'gain' }))}>
                    {tx`Ohne Abwerfen nehmen`}
                  </button>
                )}
              </>
            ) : betTurn ? (
              due > 0 ? (
                <>
                  <button className={common.btn} onClick={() => act({ type: 'junk' })}>
                    {tx`Aussteigen`}
                  </button>
                  <button className={cx(common.btn, common.btnPrimary)} onClick={() => act({ type: 'call' })}>
                    {tx`Mitgehen`} · {Math.min(due, me.chips)}
                  </button>
                  {canRaise(game, me) && (
                    <button className={common.btn} onClick={() => act({ type: 'raise' })}>
                      {tx`Erhöhen`} · {Math.min(due + size, me.chips)}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className={cx(common.btn, common.btnPrimary)} onClick={() => act({ type: 'check' })}>
                    {tx`Schieben`}
                  </button>
                  {me.chips > 0 && (
                    <button className={common.btn} onClick={() => act({ type: game.toCall === 0 ? 'bet' : 'raise' })}>
                      {game.toCall === 0 ? tx`Setzen` : tx`Erhöhen`} · {Math.min(size, me.chips)}
                    </button>
                  )}
                </>
              )
            ) : (
              <>
                <button className={common.btn} disabled={!cardTurn} onClick={() => setJunking(true)}>
                  {tx`Aussteigen`}
                </button>
                <button className={cx(common.btn, cardTurn && common.btnPrimary, s.wide)} disabled={!cardTurn} onClick={() => act({ type: 'stand' })}>
                  {tx`Stehen`}
                </button>
              </>
            )}
          </div>
        </section>

        <Dice />

        <Sheet open={sheetOpen} bare>
          <h2 className={cx(common.sheetTitle, iWon ? t.titleWin : undefined)}>{endTitle}</h2>
          {result && (
            <>
              <p className={common.sheetText}>
                {result.uncontested
                  ? tx`Alle anderen sind ausgestiegen. Der Hand-Topf (${result.handPot}) geht ohne Aufdecken an den Letzten.`
                  : result.sabaccPot > 0
                    ? tx`Eine Null! Hand-Topf (${result.handPot}) und Sabacc-Topf (${result.sabaccPot}) wechseln den Besitzer.`
                    : tx`Der Hand-Topf (${result.handPot}) ist vergeben. Niemand hat null – der Sabacc-Topf (${game.sabaccPot}) bleibt liegen.`}
              </p>
              <ul className={t.resultList}>
                {result.placing.map((x, i) => {
                  const player = game.players[x.playerId]
                  return (
                    <motion.li
                      key={x.playerId}
                      className={cx(t.resultRow, x.winner && t.resultWin)}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.09 }}
                    >
                      <Portrait character={session.seats[x.playerId]} size={40} frame />
                      <div className={t.resultWho}>
                        <b>{player.name}</b>
                        <span className="num">{result.uncontested ? tx`nicht aufgedeckt` : handName(x.score)}</span>
                      </div>
                      <span className={cx(s.values, 'num')}>{result.uncontested ? '' : cardsText(player.hand)}</span>
                      <div className={cx(s.gain, 'num')}>
                        {x.winner && <b className={t.floaterGood}>+{Math.floor((result.handPot + result.sabaccPot) / winners.length)}</b>}
                        <span>{player.eliminated ? tx`pleite` : chipsText(player.chips)}</span>
                      </div>
                    </motion.li>
                  )
                })}
              </ul>
            </>
          )}
          <div className={common.sheetActions}>
            {outcome ? (
              <>
                <button className={cx(common.btn, common.btnGhost)} onClick={leave}>
                  {tx`Hauptmenü`}
                </button>
                <button className={cx(common.btn, common.btnPrimary)} onClick={again}>
                  {tx`Nochmal spielen`}
                </button>
              </>
            ) : (
              <button className={cx(common.btn, common.btnPrimary)} onClick={() => act({ type: 'nextHand' })}>
                {tx`Nächste Hand`}
              </button>
            )}
          </div>
        </Sheet>

        <Sheet open={junking} onClose={() => setJunking(false)} dialog>
          <h2 className={common.sheetTitle}>{tx`Aussteigen?`}</h2>
          <p className={common.sheetText}>{tx`Du wirfst deine Hand weg und verlierst, was du in dieser Hand in die Töpfe gezahlt hast.`}</p>
          <div className={common.sheetActions}>
            <button className={cx(common.btn, common.btnGhost)} onClick={() => setJunking(false)}>
              {tx`Bleiben`}
            </button>
            <button
              className={cx(common.btn, common.btnDanger)}
              onClick={() => {
                setJunking(false)
                act({ type: 'junk' })
              }}
            >
              {tx`Aussteigen`}
            </button>
          </div>
        </Sheet>

        <Sheet open={quitting} onClose={() => setQuitting(false)} dialog>
          <h2 className={common.sheetTitle}>{tx`Tisch verlassen?`}</h2>
          <p className={common.sheetText}>{tx`Die laufende Partie wird abgebrochen.`}</p>
          <div className={common.sheetActions}>
            <button className={cx(common.btn, common.btnGhost)} onClick={() => setQuitting(false)}>
              {tx`Bleiben`}
            </button>
            <button className={cx(common.btn, common.btnDanger)} onClick={leave}>
              {tx`Verlassen`}
            </button>
          </div>
        </Sheet>
      </div>
    </LayoutGroup>
  )
}
