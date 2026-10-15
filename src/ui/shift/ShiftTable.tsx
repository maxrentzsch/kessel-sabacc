import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { banter } from '../../ai/banter'
import { DEFAULT_PROFILES } from '../../ai/personalities'
import type { Character } from '../../ai/personalities'
import { setAmbienceMix, sfx } from '../../audio/sfx'
import { venueOf } from '../../career/venues'
import { Rng } from '../../engine/rng'
import { tx } from '../../i18n'
import { scoreSelection, shiftActive, shiftAnteOf, shiftBetSize, shiftCanRaise, shiftOwed } from '../../shift'
import type { ShiftCard, ShiftEvent, ShiftPlayer, ShiftState } from '../../shift'
import { bestImprovement, chooseShiftAction, shiftWinChance } from '../../shift/ai'
import { useCareer } from '../../store/career'
import { isHotseat, seatsAround } from '../../store/game'
import { useNav } from '../../store/nav'
import { tempo, useSettings } from '../../store/settings'
import { SHIFT_TUTORIAL, SHIFT_TUTORIAL_RESULT, useShift } from '../../store/shift'
import { Critter } from '../art/Critter'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import type { Mood } from '../art/Portrait'
import common from '../common/common.module.css'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import { Card } from '../spike/SpikeTable'
import { SuitMark } from '../spike/SpikeCardArt'
import sp from '../spike/Spike.module.css'
import { cardsText, chipsText, signed } from '../spike/texts'
import { Backdrop } from '../table/Backdrop'
import { Curtain } from '../table/Overlays'
import { SLOTS } from '../table/Seat'
import { Hub, Surface } from '../table/Surface'
import t from '../table/Table.module.css'
import s from './Shift.module.css'
import { describeShift, scoreText, shiftSeatNote, SUIT_LABEL, targetText } from './texts'

/** Run `handler` once for every event published after the component mounted. */
function useShiftFeed(handler: (event: ShiftEvent, id: number) => void): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    let seen = useShift.getState().feed.at(-1)?.id ?? 0
    return useShift.subscribe((state) => {
      for (const item of state.feed) {
        if (item.id <= seen) continue
        seen = item.id
        ref.current(item.event, item.id)
      }
    })
  }, [])
}

/** What an opponent says and shows: a note for every move, a gesture now and then, a line after the reveal. */
function useSeatLife(player: ShiftPlayer, character: Character | null) {
  const [bubble, setBubble] = useState<{ id: number; text: string; speech: boolean; gesture?: boolean } | null>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms))
  }

  const gesture = useShift((g) => (g.gesture?.playerId === player.id ? g.gesture : null))
  const seenGesture = useRef(gesture?.id ?? 0)
  useEffect(() => {
    if (!gesture || gesture.id === seenGesture.current) return
    seenGesture.current = gesture.id
    const id = -1000 - gesture.id
    setBubble((b) => (b?.speech ? b : { id, text: gesture.text, speech: false, gesture: true }))
    later(2600, () => setBubble((b) => (b?.id === id ? null : b)))
  }, [gesture])

  useShiftFeed((event, id) => {
    const note = shiftSeatNote(event, player.id)
    if (note) {
      setBubble((b) => (b?.speech ? b : { id, text: note, speech: false }))
      later(1500 * tempo(), () => setBubble((b) => (b?.id === id ? null : b)))
    }
    if (event.type === 'settled' && character && event.result.placing.some((x) => x.playerId === player.id)) {
      const won = event.result.winners.includes(player.id)
      setMood(won ? 'happy' : 'angry')
      later(4200, () => setMood(null))
      const text = Math.random() < (won ? 0.8 : 0.35) ? banter(character.id, won ? 'win' : 'lose') : null
      if (text) {
        setBubble({ id, text, speech: true })
        sfx.voice(character.hue, 2 + Math.ceil(text.length / 9), character.sigil === 'droid')
        later(1500 + text.length * 55, () => setBubble((b) => (b?.id === id ? null : b)))
      }
    }
  })
  return { bubble, mood }
}

function Seat({ player, character, slot, opponents }: { player: ShiftPlayer; character: Character | null; slot: number; opponents: number }) {
  const game = useShift((g) => g.game)!
  const thinking = useShift((g) => g.thinking === player.id)
  const life = useSeatLife(player, character)
  const shown = game.phase === 'showdown' || game.phase === 'handEnd' || game.phase === 'gameOver'
  const placing = shown ? game.result?.placing.find((x) => x.playerId === player.id) : undefined
  const open = !!placing && !game.result!.uncontested
  const acting = game.current === player.id && ['select', 'improve', 'bet'].includes(game.phase)
  const mood: Mood = player.eliminated ? 'out' : (life.mood ?? (thinking ? 'thinking' : player.folded ? 'worried' : 'idle'))
  const { x, drop } = SLOTS[opponents][slot]
  const place = { ['--sx' as string]: x, ['--drop' as string]: drop, ['--offset' as string]: `${-player.id * 1.7}s` }
  const state = cx(acting && t.seatActive, (player.eliminated || player.folded) && t.seatOut, placing?.winner && t.seatWinner)
  const edge = opponents > 1 && (slot === 0 ? t.edgeLeft : slot === opponents - 1 ? t.edgeRight : undefined)
  // what lies face down in front of them: the selection, and next to it what is still in hand
  const cards = open ? player.selection : [...player.selection, ...player.hand]

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
              className={cx(t.bubble, life.bubble.speech && t.bubbleSpeech, life.bubble.gesture && t.bubbleGesture)}
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
            {player.bet > 0 && <em className={sp.wager}>+{player.bet}</em>}
          </span>
          {thinking && (
            <span className={t.thinking} aria-label={tx`überlegt`}>
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
        <div className={cx(sp.minis, open && sp.open)} data-count={cards.length}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              hand={game.handNumber}
              faceUp={open}
              lean={open ? 14 : 42}
              className={cx(sp.mini, !open && player.selection.includes(card) && s.setAside)}
            />
          ))}
          {player.eliminated ? (
            <span className={cx(sp.tag, sp.tagOut)}>{tx`ausgeschieden`}</span>
          ) : player.folded ? (
            <span className={cx(sp.tag, sp.tagOut)}>{tx`ausgestiegen`}</span>
          ) : open ? (
            <span className={cx(sp.tag, placing.winner && sp.tagWin)}>{scoreText(placing.score)}</span>
          ) : player.selection.length > 0 ? (
            <span className={sp.tag}>{tx`${player.selection.length} beiseite`}</span>
          ) : null}
        </div>
      </div>
    </>
  )
}

/** The two dice of the hand: the gold one names the number, the silver one the suit. */
function Dice({ game }: { game: ShiftState }) {
  return (
    <div className={s.dice} aria-label={targetText(game.target)}>
      <motion.span key={`gold-${game.handNumber}`} className={cx(s.die, s.gold, 'num')} initial={{ rotate: -200, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
        {signed(game.target.value)}
      </motion.span>
      <motion.span key={`silver-${game.handNumber}`} className={cx(s.die, s.silver)} initial={{ rotate: 200, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.12 }}>
        <SuitMark suit={game.target.suit} size={20} />
      </motion.span>
      <span className={sp.potLabel}>{tx`Ziel`}</span>
    </div>
  )
}

/** What a strong player would do in the player's place. */
function advise(game: ShiftState, viewer: number): string {
  const me = game.players[viewer]
  const rng = new Rng(game.handNumber * 131 + game.round * 17 + me.chips * 7)
  const action = chooseShiftAction(game, DEFAULT_PROFILES.hard, rng)
  const cardsOf = (ids: string[]) => ids.map((id) => signed([...me.hand, ...me.selection].find((c) => c.id === id)?.value ?? 0)).join(' ')
  const move =
    action.type === 'select'
      ? tx`Leg ${cardsOf(action.cards)} beiseite.`
      : action.type === 'improve'
        ? action.cards.length
          ? tx`Leg ${cardsOf(action.cards)} dazu.`
          : tx`Lass deine Auswahl, wie sie ist.`
        : action.type === 'check'
          ? tx`Schieb.`
          : action.type === 'bet'
            ? tx`Setz.`
            : action.type === 'call'
              ? tx`Geh mit.`
              : action.type === 'raise'
                ? tx`Erhöh.`
                : tx`Steig aus.`
  if (me.selection.length === 0) return move
  const chance = Math.round(shiftWinChance(scoreSelection(me.selection, game.target), game.target, shiftActive(game).length - 1) * 100)
  return tx`${move} Mit dieser Auswahl gewinnst du etwa ${chance} von 100 Händen.`
}

export function ShiftTableScreen() {
  const game = useShift((g) => g.game)
  const session = useShift((g) => g.session)
  const busy = useShift((g) => g.busy)
  const thinking = useShift((g) => g.thinking)
  const outcome = useShift((g) => g.outcome)
  const act = useShift((g) => g.act)
  const clear = useShift((g) => g.clear)
  const forfeit = useShift((g) => g.forfeit)
  const start = useShift((g) => g.start)
  const viewer = useShift((g) => g.viewer)
  const handoff = useShift((g) => g.handoff)
  const takeOver = useShift((g) => g.takeOver)
  const tipsLeft = useShift((g) => g.tipsLeft)
  const takeTip = useShift((g) => g.takeTip)
  const tutorialStep = useShift((g) => g.tutorialStep)
  const nudge = useShift((g) => g.nudge)
  const go = useNav((n) => n.go)
  const hints = useSettings((st) => st.hints)
  const bix = useCareer((c) => (c.hasShip ? c.bix : null))

  /** cards tapped while choosing what to set aside or add */
  const [chosen, setChosen] = useState<string[]>([])
  const [quitting, setQuitting] = useState(false)
  const [folding, setFolding] = useState(false)
  const [line, setLine] = useState('')
  const [tip, setTip] = useState<{ game: ShiftState; text: string } | null>(null)

  useShiftFeed((event) => {
    const current = useShift.getState().game
    const text = current && describeShift(event, current)
    if (text) setLine(text)
  })

  const venue = venueOf(session?.venue)
  useEffect(() => setAmbienceMix(venue.sound), [venue])
  useEffect(() => {
    // only while this is the screen: on its way out the table has let go of its game already
    if ((!game || !session) && useNav.getState().screen === 'shift') go('free')
  }, [game, session, go])
  // A choice only stands for the turn it was made in.
  const turnKey = game ? `${game.handNumber}-${game.round}-${game.phase}-${game.current}` : ''
  useEffect(() => setChosen([]), [turnKey])
  if (!game || !session) return null

  const hotseat = isHotseat(session)
  const career = session.mode === 'career'
  const me = game.players[viewer]
  const opponents = seatsAround(game, viewer)
  const shown = game.phase === 'showdown' || game.phase === 'handEnd' || game.phase === 'gameOver'
  const myTurn = !busy && handoff === null && game.current === viewer && ['select', 'improve', 'bet'].includes(game.phase) && !me.folded && !me.eliminated
  const selecting = myTurn && game.phase === 'select'
  const improving = myTurn && game.phase === 'improve'
  const betting = myTurn && game.phase === 'bet'
  const due = shiftOwed(game, me)
  const size = shiftBetSize(game)
  const result = game.result
  const picked = [...me.hand, ...me.selection].filter((c) => chosen.includes(c.id))
  // what the selection would be with the cards tapped so far
  const preview = selecting ? picked : improving ? [...me.selection, ...picked] : me.selection
  const previewScore = preview.length ? scoreSelection(preview, game.target) : null
  const mine = shown ? result?.placing.find((x) => x.playerId === viewer) : undefined

  const toggle = (card: ShiftCard) => setChosen((list) => (list.includes(card.id) ? list.filter((id) => id !== card.id) : [...list, card.id]))
  const canTap = (card: ShiftCard) => selecting || (improving && me.fresh.includes(card.id))

  const prompt = !myTurn
    ? null
    : selecting
      ? tx`Karten beiseitelegen, die zusammen das Ziel treffen`
      : improving
        ? tx`Neue Karten dazulegen – oder nicht`
        : due > 0
          ? tx`${chipsText(due)} zum Mitgehen`
          : tx`Schieben oder setzen`
  const coaching =
    !myTurn || game.handNumber !== 1
      ? null
      : selecting
        ? tx`Die Würfel geben das Ziel vor. Leg Karten beiseite, die zusammen möglichst genau das Ziel ergeben – der Rest geht im Shift weg und wird ersetzt.`
        : improving
          ? tx`Nur die neuen Karten dürfen noch dazu. Was du beiseitegelegt hast, bleibt.`
          : null
  const advice = tip && tip.game === game ? tip.text : null
  const coach = session.tutorial && myTurn ? (SHIFT_TUTORIAL[tutorialStep]?.text ?? null) : null
  const hintText = coach ?? advice ?? (hints ? coaching : null)
  const hint: ReactNode = hintText ? (
    <p key={coach ? `coach-${tutorialStep}-${nudge}` : undefined} className={cx(t.hint, coach !== null && t.coach, advice !== null && t.tip)}>
      {advice !== null && <Icon name="bulb" size={16} />}
      <span>{hintText}</span>
    </p>
  ) : null

  const waiting = thinking !== null ? tx`${game.players[thinking].name} überlegt …` : line
  const winners = result?.winners ?? []
  const iWon = winners.includes(viewer)
  const champion = game.winner !== null ? game.players[game.winner] : null
  const endTitle = session.tutorial
    ? tx`Übung geschafft`
    : hotseat && outcome
      ? champion
        ? tx`${champion.name} gewinnt die Partie`
        : tx`Alle am Gerät sind pleite`
      : outcome === 'won'
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
  // a dead heat on the number that the suit broke
  const suitDecided = !!result && !result.uncontested && result.placing.some((x) => !x.winner && x.score.distance === result.placing[0].score.distance)
  const sheetOpen = !busy && (game.phase === 'handEnd' || game.phase === 'gameOver' || outcome !== null) && result !== null

  const leave = () => {
    if (session.tutorial) {
      go('rules')
      return clear()
    }
    if (career && outcome) return go('result')
    go(career ? 'career' : 'free')
    clear()
  }
  const quit = () => {
    go(session.tutorial ? 'rules' : career ? 'career' : 'free')
    forfeit()
  }

  return (
    <LayoutGroup>
      <div className={cx(t.table, game.phase === 'showdown' && t.revealing)} style={venue.colors}>
        <header className={t.top}>
          <button className={common.iconBtn} onClick={() => (outcome ? leave() : setQuitting(true))} aria-label={tx`Tisch verlassen`}>
            <Icon name="close" />
          </button>
          <div className={t.topTitle}>
            <b>{session.title}</b>
            <span>
              {tx`Hand`} {game.handNumber} · {tx`Grundeinsatz`} {shiftAnteOf(game, game.handNumber)}
            </span>
          </div>
          <div className={t.rounds} aria-label={tx`Setzrunde ${game.round} von ${2}`}>
            {[1, 2].map((r) => (
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
            <Seat key={p.id} player={p} character={session.seats[p.id]} slot={i} opponents={opponents.length} />
          ))}

          <section className={t.center}>
            <div className={sp.row}>
              <Dice game={game} />
              <div className={sp.pileBtn} aria-hidden>
                <span className={cx(sp.slot, t.pileStack)}>{game.deck.length > 0 && <Card card={game.deck[game.deck.length - 1]} hand={game.handNumber} faceUp={false} lean={42} />}</span>
                <span className={t.pileLabel}>
                  {tx`Stapel`}
                  <em className="num">{game.deck.length}</em>
                </span>
              </div>
              <div className={sp.pot}>
                <span className={cx(sp.potChips, 'num')}>{game.pot}</span>
                <span className={sp.potLabel}>{tx`Topf`}</span>
              </div>
            </div>
          </section>

          <div className={t.console} aria-live="polite">
            <p className={cx(t.ticker, prompt && t.tickerMine)}>{prompt ?? waiting}</p>
          </div>
        </div>

        <section className={cx(t.me, myTurn && t.meActive)}>
          <div className={t.hintDesk}>{hint}</div>

          {me.selection.length > 0 && (
            <div className={s.selection}>
              <span className={s.selectionLabel}>{tx`Auswahl`}</span>
              <div className={s.selectionCards}>
                {me.selection.map((card) => (
                  <Card key={card.id} card={card} hand={game.handNumber} faceUp lean={20} className={s.selectionCard} />
                ))}
              </div>
            </div>
          )}

          <div className={cx(sp.hand, sp.handBox)} style={{ ['--n' as string]: Math.max(2, me.hand.length) }}>
            {me.hand.map((card) => {
              const tappable = canTap(card)
              const on = chosen.includes(card.id)
              return (
                <Card
                  key={card.id}
                  card={card}
                  hand={game.handNumber}
                  faceUp
                  className={cx(t.myCard, tappable && sp.pick, on && s.chosen, improving && !me.fresh.includes(card.id) && s.dim)}
                  onClick={tappable ? () => toggle(card) : undefined}
                  label={tappable ? (on ? tx`${signed(card.value)} zurücknehmen` : tx`${signed(card.value)} auswählen`) : undefined}
                />
              )
            })}
            {me.eliminated ? <p className={t.seatGone}>{tx`Du bist ausgeschieden`}</p> : me.folded && <p className={t.seatGone}>{tx`Du bist ausgestiegen`}</p>}
          </div>

          <p className={cx(t.myLabel, previewScore?.distance === 0 && t.scoreSabacc, 'num')}>
            {mine ? scoreText(mine.score) : previewScore ? scoreText(previewScore) : targetText(game.target)}
            {previewScore && (
              <span className={s.suited} title={SUIT_LABEL[game.target.suit]}>
                <SuitMark suit={game.target.suit} size={12} /> {previewScore.suited}
              </span>
            )}
            {!session.tutorial && (
              <button
                className={t.tipBtn}
                disabled={!myTurn || advice !== null || tipsLeft <= 0}
                onClick={() => takeTip() && setTip({ game, text: advise(game, viewer) })}
                aria-label={tx`Tipp – noch ${Number.isFinite(tipsLeft) ? tipsLeft : tx`beliebig viele`}`}
              >
                {bix ? <Critter animal={bix} size={22} perch={false} /> : <Icon name="bulb" size={15} />}
                {Number.isFinite(tipsLeft) && <b className="num">{tipsLeft}</b>}
              </button>
            )}
          </p>

          <div className={sp.purse}>
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

          <div className={sp.bar}>
            {selecting || improving ? (
              <>
                <button className={common.btn} onClick={() => setFolding(true)}>
                  {tx`Aussteigen`}
                </button>
                {improving && (
                  <button className={cx(common.btn, sp.wide)} onClick={() => setChosen(bestImprovement(me.selection, me.hand.filter((c) => me.fresh.includes(c.id)), game.target).map((c) => c.id))}>
                    {tx`Bestes wählen`}
                  </button>
                )}
                <button
                  className={cx(common.btn, common.btnPrimary, sp.wide)}
                  disabled={selecting && chosen.length === 0}
                  onClick={() => act(selecting ? { type: 'select', cards: chosen } : { type: 'improve', cards: chosen })}
                >
                  {selecting ? tx`Beiseitelegen · ${chosen.length}` : chosen.length ? tx`Dazulegen · ${chosen.length}` : tx`Nichts dazu`}
                </button>
              </>
            ) : betting ? (
              due > 0 ? (
                <>
                  <button className={common.btn} onClick={() => act({ type: 'fold' })}>
                    {tx`Aussteigen`}
                  </button>
                  <button className={cx(common.btn, common.btnPrimary)} onClick={() => act({ type: 'call' })}>
                    {tx`Mitgehen`} · {Math.min(due, me.chips)}
                  </button>
                  {shiftCanRaise(game, me) && (
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
              <button className={cx(common.btn, sp.wide)} disabled>
                {tx`Warten …`}
              </button>
            )}
          </div>
        </section>

        <Sheet open={sheetOpen} bare>
          <h2 className={cx(common.sheetTitle, iWon ? t.titleWin : undefined)}>{endTitle}</h2>
          {result && (
            <>
              {session.tutorial && <p className={common.sheetText}>{SHIFT_TUTORIAL_RESULT}</p>}
              <p className={common.sheetText}>
                {result.uncontested
                  ? tx`Alle anderen sind ausgestiegen. Der Topf (${result.pot}) geht ohne Aufdecken an den Letzten.`
                  : tx`${targetText(game.target)}. Am nächsten dran gewinnt den Topf (${result.pot}).`}
                {suitDecided && tx` Gleich nah am Ziel – die Karten der Zielfarbe haben entschieden.`}
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
                        <span className="num">{result.uncontested ? tx`nicht aufgedeckt` : scoreText(x.score)}</span>
                      </div>
                      <span className={cx(sp.values, 'num')}>{result.uncontested ? '' : cardsText(player.selection)}</span>
                      <div className={cx(sp.gain, 'num')}>
                        {x.winner && <b className={t.floaterGood}>+{Math.floor(result.pot / winners.length)}</b>}
                        <span>{player.eliminated ? tx`pleite` : chipsText(player.chips)}</span>
                      </div>
                    </motion.li>
                  )
                })}
              </ul>
            </>
          )}
          <div className={common.sheetActions}>
            {session.tutorial ? (
              <button className={cx(common.btn, common.btnPrimary)} onClick={leave}>
                {tx`Zurück zu den Regeln`}
              </button>
            ) : outcome && !career && !hotseat ? (
              <>
                <button className={cx(common.btn, common.btnGhost)} onClick={leave}>
                  {tx`Hauptmenü`}
                </button>
                <button className={cx(common.btn, common.btnPrimary)} onClick={() => start(session)}>
                  {tx`Nochmal spielen`}
                </button>
              </>
            ) : outcome ? (
              <button className={cx(common.btn, common.btnPrimary)} onClick={leave}>
                {tx`Weiter`}
              </button>
            ) : (
              <button className={cx(common.btn, common.btnPrimary)} onClick={() => act({ type: 'nextHand' })}>
                {tx`Nächste Hand`}
              </button>
            )}
          </div>
        </Sheet>

        <Sheet open={folding} onClose={() => setFolding(false)} dialog>
          <h2 className={common.sheetTitle}>{tx`Aussteigen?`}</h2>
          <p className={common.sheetText}>{tx`Du wirfst deine Karten weg und verlierst, was du in dieser Hand in den Topf gezahlt hast.`}</p>
          <div className={common.sheetActions}>
            <button className={cx(common.btn, common.btnGhost)} onClick={() => setFolding(false)}>
              {tx`Bleiben`}
            </button>
            <button
              className={cx(common.btn, common.btnDanger)}
              onClick={() => {
                setFolding(false)
                act({ type: 'fold' })
              }}
            >
              {tx`Aussteigen`}
            </button>
          </div>
        </Sheet>

        <Sheet open={quitting} onClose={() => setQuitting(false)} dialog>
          <h2 className={common.sheetTitle}>{tx`Tisch verlassen?`}</h2>
          <p className={common.sheetText}>{career ? tx`Die Partie zählt als verloren und dein Buy-in bleibt am Tisch.` : tx`Die laufende Partie wird abgebrochen.`}</p>
          <div className={common.sheetActions}>
            <button className={cx(common.btn, common.btnGhost)} onClick={() => setQuitting(false)}>
              {tx`Bleiben`}
            </button>
            <button className={cx(common.btn, common.btnDanger)} onClick={quit}>
              {tx`Verlassen`}
            </button>
          </div>
        </Sheet>

        {hotseat && <Curtain name={handoff === null ? null : game.players[handoff].name} onReady={takeOver} />}
      </div>
    </LayoutGroup>
  )
}
