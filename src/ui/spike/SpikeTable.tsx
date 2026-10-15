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
import { isHotseat, seatsAround } from '../../store/game'
import { useNav } from '../../store/nav'
import { tempo, useSettings } from '../../store/settings'
import { useCareer } from '../../store/career'
import { SPIKE_NOTES, SPIKE_TUTORIAL, SPIKE_TUTORIAL_RESULT, useSpike } from '../../store/spike'
import { Critter } from '../art/Critter'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import type { Mood } from '../art/Portrait'
import common from '../common/common.module.css'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import { Backdrop } from '../table/Backdrop'
import { SLOTS } from '../table/Seat'
import { Curtain, SteadyHand, Suspicion } from '../table/Overlays'
import { Hub, Surface } from '../table/Surface'
import t from '../table/Table.module.css'
import s from './Spike.module.css'
import { SpikeBack, SpikeFace } from './SpikeCardArt'
import { SpikeRules } from './SpikeRules'
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
export function Card({ card, hand, faceUp, lean = 0, className, onClick, label }: CardProps) {
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
function useSeatLife(player: SpikePlayer, character: Character | null) {
  const [bubble, setBubble] = useState<{ id: number; text: string; speech: boolean; gesture?: boolean } | null>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms))
  }
  const say = (id: number, occasion: Parameters<typeof banter>[1], chance: number) => {
    if (!character || Math.random() > chance) return
    const text = banter(character.id, occasion)
    if (!text) return
    setBubble({ id, text, speech: true })
    sfx.voice(character.hue, 2 + Math.ceil(text.length / 9), character.sigil === 'droid')
    later(1500 + text.length * 55, () => setBubble((b) => (b?.id === id ? null : b)))
  }

  // A gesture before the move: shown as an action, never explained.
  const gesture = useSpike((g) => (g.gesture?.playerId === player.id ? g.gesture : null))
  const seenGesture = useRef(gesture?.id ?? 0)
  useEffect(() => {
    if (!gesture || gesture.id === seenGesture.current) return
    seenGesture.current = gesture.id
    const id = -1000 - gesture.id
    setBubble((b) => (b?.speech ? b : { id, text: gesture.text, speech: false, gesture: true }))
    later(2600, () => setBubble((b) => (b?.id === id ? null : b)))
  }, [gesture])

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

function Seat({ player, character, slot, opponents }: { player: SpikePlayer; character: Character | null; slot: number; opponents: number }) {
  const game = useSpike((g) => g.game)!
  const peeked = useSpike((g) => g.peeked)
  const simple = !!game.rules.simple
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
          {player.hand.map((card) => {
            // a card the player sneaked a look at stays open for them alone
            const seen = !open && peeked.includes(card.id)
            return <Card key={card.id} card={card} hand={game.handNumber} faceUp={open || seen} lean={open || seen ? 14 : 42} className={cx(s.mini, seen && t.miniSeen)} />
          })}
          {player.eliminated ? (
            <span className={cx(s.tag, s.tagOut)}>{tx`ausgeschieden`}</span>
          ) : player.folded ? (
            <span className={cx(s.tag, s.tagOut)}>{tx`ausgestiegen`}</span>
          ) : open ? (
            <span className={cx(s.tag, placing.winner && s.tagWin)}>{handName(placing.score, simple)}</span>
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
function advise(game: SpikeState, viewer: number): string {
  const me = game.players[viewer]
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

/**
 * Cheating at the Spike table: a look at one card of an opponent, and the
 * sylop up the sleeve. Only for a player alone at the table, in the card phase.
 */
function SpikePeekSheet({ open, onClose, canCheat }: { open: boolean; onClose(): void; canCheat: boolean }) {
  const game = useSpike((g) => g.game)!
  const session = useSpike((g) => g.session)!
  const viewer = useSpike((g) => g.viewer)
  const used = useSpike((g) => g.peekUsed)
  const watch = useSpike((g) => g.watch)
  const suspicion = useSpike((g) => g.suspicion)
  const cover = useSpike((g) => g.bixCover)
  const sleeveUsed = useSpike((g) => g.sleeveUsed)
  const peek = useSpike((g) => g.peek)
  const sleeve = useSpike((g) => g.sleeve)
  const bix = useCareer((c) => c.bix)
  const sleeves = useCareer((c) => c.sleeves)
  const steadyHand = useSettings((st) => st.steadyHand)
  const [steady, setSteady] = useState<string | null>(null)
  useEffect(() => {
    if (!open) setSteady(null)
  }, [open])

  const me = game.players[viewer]
  const ready = canCheat && !used
  const canSleeve = canCheat && session.mode === 'career' && !sleeveUsed && sleeves > 0
  const targets = game.players.filter((p) => !p.isHuman && !p.eliminated && !p.folded && p.hand.length > 0)
  const heat = (id: number) => watch[id] ?? 0

  if (steady)
    return (
      <Sheet open={open} onClose={onClose}>
        <SteadyHand
          onDone={(steadiness) => {
            onClose()
            sleeve(steady, steadiness)
          }}
        />
      </Sheet>
    )

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className={common.sheetTitle}>{tx`Spähen`}</h2>
      <p className={common.sheetText}>
        {tx`Wirf einen Blick auf eine Karte eines Gegners – einmal pro Hand, in deinem Zug der Kartenphase. Wer ausgespäht wird, wird misstrauisch, die anderen ein wenig. Ist einer ganz misstrauisch, wirst du erwischt und zahlst 2 Chips in den Sabacc-Topf.`}
      </p>
      <div className={t.heatRow}>
        <span>{tx`Verdacht`}</span>
        <Suspicion value={suspicion} />
      </div>
      {bix === 'lothcat' && suspicion >= 60 && <p className={t.tokenNote}>{tx`Bix legt die Ohren an. Der Tisch wird misstrauisch.`}</p>}
      {cover > 0 && <p className={t.tokenNote}>{cover === 1 ? tx`Fliegt ein Blick auf, lenkt Bix ein Mal ab.` : tx`Fliegt ein Blick auf, lenkt Bix noch ${cover} Mal ab.`}</p>}
      {!ready && <p className={t.tokenNote}>{used ? tx`In dieser Hand hast du schon gespäht.` : tx`Spähen kannst du nur in deinem Zug der Kartenphase.`}</p>}
      <div className={t.targets}>
        {targets.map((p) => (
          <button
            key={p.id}
            className={t.targetBtn}
            disabled={!ready}
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
            <span className={cx(t.heat, heat(p.id) >= 70 ? t.heatHigh : heat(p.id) >= 40 ? t.heatMid : undefined)} aria-label={tx`Verdacht ${Math.round(heat(p.id))} %`}>
              <i>
                <b style={{ width: `${Math.min(100, heat(p.id))}%` }} />
              </i>
            </span>
          </button>
        ))}
      </div>
      {canSleeve && (
        <div className={t.sleeve}>
          <h3 className={t.fieldLabel}>{tx`Ärmel`}</h3>
          <p className={t.tokenNote}>
            {tx`Tausch eine deiner Karten gegen einen Sylop aus dem Ärmel – einmal pro Partie. Alle am Tisch werden misstrauisch; bemerkt es einer, kostet es 3 Chips und Ansehen. Im Ärmel: ${sleeves}.`}
          </p>
          <div className={s.sleeveCards}>
            {me.hand.map((card) => (
              <button
                key={card.id}
                className={common.btn}
                onClick={() => {
                  if (steadyHand) return setSteady(card.id)
                  onClose()
                  sleeve(card.id)
                }}
              >
                {tx`${signed(card.value)} tauschen`}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={common.sheetActions}>
        <button className={cx(common.btn, common.btnGhost)} onClick={onClose}>
          {tx`Schließen`}
        </button>
      </div>
    </Sheet>
  )
}

export function SpikeTableScreen() {
  const game = useSpike((g) => g.game)
  const session = useSpike((g) => g.session)
  const busy = useSpike((g) => g.busy)
  const thinking = useSpike((g) => g.thinking)
  const outcome = useSpike((g) => g.outcome)
  const act = useSpike((g) => g.act)
  const clear = useSpike((g) => g.clear)
  const forfeit = useSpike((g) => g.forfeit)
  const start = useSpike((g) => g.start)
  const viewer = useSpike((g) => g.viewer)
  const handoff = useSpike((g) => g.handoff)
  const takeOver = useSpike((g) => g.takeOver)
  const tipsLeft = useSpike((g) => g.tipsLeft)
  const takeTip = useSpike((g) => g.takeTip)
  const suspicion = useSpike((g) => g.suspicion)
  const peekUsed = useSpike((g) => g.peekUsed)
  const tutorialStep = useSpike((g) => g.tutorialStep)
  const note = useSpike((g) => g.note)
  const dismissNote = useSpike((g) => g.dismissNote)
  const nudge = useSpike((g) => g.nudge)
  const go = useNav((n) => n.go)
  const hints = useSettings((st) => st.hints)
  const bix = useCareer((c) => (c.hasShip ? c.bix : null))

  /** what the player is in the middle of choosing a card for */
  const [mode, setMode] = useState<'gain' | 'swap' | null>(null)
  const [quitting, setQuitting] = useState(false)
  const [junking, setJunking] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const [crib, setCrib] = useState(false)
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
    // only while this is the screen: on its way out the table has let go of its game already
    if ((!game || !session) && useNav.getState().screen === 'spike') go('free')
  }, [game, session, go])
  // Nothing is left open from the last game.
  useEffect(() => {
    setCrib(false)
    setPeeking(false)
  }, [session])
  // A choice only stands for the turn it was started in.
  const turnKey = game ? `${game.handNumber}-${game.round}-${game.phase}-${game.current}` : ''
  useEffect(() => setMode(null), [turnKey])
  if (!game || !session) return null

  const hotseat = isHotseat(session)
  const career = session.mode === 'career'
  const simple = !!game.rules.simple
  const me = game.players[viewer]
  const opponents = seatsAround(game, viewer)
  const shown = game.phase === 'showdown' || game.phase === 'handEnd' || game.phase === 'gameOver'
  const myTurn = !busy && handoff === null && game.current === viewer && (game.phase === 'card' || game.phase === 'bet') && !me.folded && !me.eliminated
  const cardTurn = myTurn && game.phase === 'card'
  const betTurn = myTurn && game.phase === 'bet'
  const canCheat = cardTurn && !hotseat && !session.tutorial
  const top = game.discard[game.discard.length - 1]
  const due = owed(game, me)
  const size = betSize(game)
  const score = me.hand.length ? scoreSpikeHand(me.hand, !simple) : null
  const result = game.result
  const mine = shown ? result?.placing.find((x) => x.playerId === viewer) : undefined

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
          ? tx`Karte nehmen, tauschen oder stehen`
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
          : cardTurn && game.round === 2 && game.rules.dice !== false
            ? tx`Nach jeder Runde rollen die Spike-Würfel. Bei einem Pasch bekommen alle neue Karten.`
            : null
  const advice = tip && tip.game === game ? tip.text : null
  // In the practice hand Dessa does the talking, whatever the settings say.
  const coach = session.tutorial && cardTurn ? (SPIKE_TUTORIAL[tutorialStep]?.text ?? null) : null
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
  const sheetOpen = !busy && (game.phase === 'handEnd' || game.phase === 'gameOver' || outcome !== null) && result !== null

  // Where the table leads once it is done with: the career's result screen, or back to setting up.
  const leave = () => {
    if (session.tutorial) {
      go(useSpike.getState().tutorialFrom)
      return clear()
    }
    if (career && outcome) return go('result')
    go(career ? 'career' : 'free')
    clear()
  }
  const quit = () => {
    go(session.tutorial ? useSpike.getState().tutorialFrom : career ? 'career' : 'free')
    forfeit()
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
            <b>{session.title}</b>
            <span>
              {tx`Hand`} {game.handNumber} · {tx`Grundeinsatz`} {anteOf(game, game.handNumber)}
            </span>
          </div>
          <div className={t.rounds} aria-label={tx`Runde ${game.round} von ${3}`}>
            <Suspicion compact value={suspicion} />
            <button className={s.cribBtn} onClick={() => setCrib(true)} aria-label={tx`Spielregeln`}>
              ?
            </button>
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
            <Seat key={p.id} player={p} character={session.seats[p.id]} slot={i} opponents={opponents.length} />
          ))}

          <section className={t.center}>
            <div className={s.row}>
              {!simple && (
                <div className={cx(s.pot, s.potSabacc)}>
                  <span className={cx(s.potChips, 'num')}>{game.sabaccPot}</span>
                  <span className={s.potLabel}>{tx`Sabacc-Topf`}</span>
                </div>
              )}
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
                <span className={s.potLabel}>{simple ? tx`Topf` : tx`Hand-Topf`}</span>
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
              {handName(mine?.score ?? score, simple)}
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
                {!hotseat && !session.tutorial && (
                  <button className={cx(t.peekBtn, s.peek, canCheat && !peekUsed && t.peekBtnReady)} onClick={() => setPeeking(true)} aria-label={tx`Spähen`}>
                    <Icon name="eye" size={20} />
                  </button>
                )}
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
              {session.tutorial && <p className={common.sheetText}>{SPIKE_TUTORIAL_RESULT}</p>}
              <p className={common.sheetText}>
                {result.uncontested
                  ? tx`Alle anderen sind ausgestiegen. Der Hand-Topf (${result.handPot}) geht ohne Aufdecken an den Letzten.`
                  : simple
                    ? tx`Am nächsten an null – der Topf (${result.handPot}) ist vergeben.`
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
                        <span className="num">{result.uncontested ? tx`nicht aufgedeckt` : handName(x.score, simple)}</span>
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
            {session.tutorial ? (
              <button className={cx(common.btn, common.btnPrimary)} onClick={leave}>
                {useSpike.getState().tutorialFrom === 'rules' ? tx`Zurück zu den Regeln` : tx`Zurück zu Dessa`}
              </button>
            ) : outcome && !career && !hotseat ? (
              <>
                <button className={cx(common.btn, common.btnGhost)} onClick={leave}>
                  {tx`Hauptmenü`}
                </button>
                <button className={cx(common.btn, common.btnPrimary)} onClick={again}>
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

        <Sheet open={note !== null} onClose={dismissNote} dialog>
          {note && (
            <>
              <h2 className={common.sheetTitle}>{SPIKE_NOTES[note].title}</h2>
              <p className={common.sheetText}>{SPIKE_NOTES[note].text}</p>
            </>
          )}
          <div className={common.sheetActions}>
            <button className={cx(common.btn, common.btnPrimary)} onClick={dismissNote}>
              {tx`Verstanden`}
            </button>
          </div>
        </Sheet>

        <SpikePeekSheet open={peeking} onClose={() => setPeeking(false)} canCheat={canCheat} />

        <Sheet open={crib} onClose={() => setCrib(false)}>
          <div className={s.crib}>
            <SpikeRules />
          </div>
          <div className={common.sheetActions}>
            <button className={cx(common.btn, common.btnGhost)} onClick={() => setCrib(false)}>
              {tx`Schließen`}
            </button>
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
