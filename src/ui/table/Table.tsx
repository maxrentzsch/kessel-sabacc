import { LayoutGroup } from 'motion/react'
import { useEffect, useState } from 'react'
import { setAmbienceMix } from '../../audio/sfx'
import { FELTS } from '../../career/cosmetics'
import { TUTORIAL_STEPS } from '../../career/tutorial'
import { venueOf } from '../../career/venues'
import { canDraw, canDrawFrom, drawCost } from '../../engine'
import type { DrawSource, GameState, TokenId } from '../../engine'
import { TOKEN_TEXT } from '../../i18n/texts'
import { useCareer } from '../../store/career'
import { HUMAN, useGame } from '../../store/game'
import { useNav } from '../../store/nav'
import { useSettings } from '../../store/settings'
import { Icon } from '../art/Icons'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import { Backdrop } from './Backdrop'
import { Dealer } from './Dealer'
import { TableRipple, TokenBeams } from './Effects'
import { describe, useFeed } from './feed'
import { useInspect } from './inspect'
import { MyArea } from './MyArea'
import { Announcer, DiceOverlay, PeekSheet, ResultSheet, RevealCallout, Suspicion, TokenBanner, TokenSheet } from './Overlays'
import { Piles } from './Piles'
import { pruneCardMemory } from './PlayingCard'
import { Seat } from './Seat'
import { Hub, Surface } from './Surface'
import s from './Table.module.css'
import { tx } from '../../i18n'

const HUMAN_PHASES: GameState['phase'][] = ['turn', 'discard', 'primeChoice', 'impostor']
const SHORTCUTS: Record<string, DrawSource> = { '1': 'sandDiscard', '2': 'sandDeck', '3': 'bloodDeck', '4': 'bloodDiscard' }

function Modifiers({ game }: { game: GameState }) {
  const m = game.modifiers
  const items: { token: TokenId; text: string }[] = []
  if (m.primeValue !== null) items.push({ token: 'primeSabacc', text: tx`Prime Sabacc: ${m.primeValue}` })
  if (m.cookTheBooks) items.push({ token: 'cookTheBooks', text: tx`Rang umgekehrt` })
  if (m.sylopZero) items.push({ token: 'markdown', text: tx`Sylop = 0` })
  if (m.impostorSix) items.push({ token: 'majorFraud', text: tx`Impostor = 6` })
  if (items.length === 0) return null
  return (
    <div className={s.mods}>
      {items.map((item) => (
        <span key={item.token} className={s.mod} title={TOKEN_TEXT[item.token].long}>
          <TokenIcon token={item.token} size={14} />
          {item.text}
        </span>
      ))}
    </div>
  )
}

/** What the player is expected to do right now, plus an optional explanation. */
function prompt(game: GameState): { line: string; hint: string | null } {
  const me = game.players[HUMAN]
  switch (game.phase) {
    case 'turn': {
      // Explain the goal once, then get out of the way.
      const first = game.handNumber === 1
      const hint = !first
        ? null
        : game.round === 1
          ? tx`Ziel: zwei gleiche Werte – ein Sabacc, je niedriger desto besser. Wer verliert, zahlt seinen Einsatz plus die Differenz seiner Karten.`
          : game.round === 2 && me.tokens.length > 0 && !game.tokenPlayedThisTurn
            ? tx`Unten links liegen deine Shift-Tokens. Antippen zeigt, was sie tun – eins pro Zug, jedes nur einmal pro Partie.`
            : null
      if (me.embargoed) return { line: tx`Embargo: du musst stehen`, hint: tx`Ein Token darfst du vorher trotzdem spielen.` }
      if (!canDraw(game, me)) return { line: tx`Kein Chip: du musst stehen`, hint: tx`Mit Gratiszug oder Rückerstattung könntest du trotzdem ziehen.` }
      const cost = drawCost(me) === 0 ? tx`gratis` : tx`1 Chip`
      return { line: tx`Karte ziehen (${cost}) oder stehen`, hint }
    }
    case 'discard':
      return {
        line: tx`Welche Karte behältst du?`,
        hint: game.handNumber === 1 ? tx`Du hältst immer genau eine Sand- und eine Blut-Karte. Die andere landet offen auf der Ablage.` : null,
      }
    case 'impostor':
      return { line: tx`Wähle einen Würfel`, hint: null }
    case 'primeChoice':
      return { line: tx`Wähle den Prime-Wert`, hint: null }
    default:
      return { line: '', hint: null }
  }
}

export function TableScreen() {
  const game = useGame((g) => g.game)
  const session = useGame((g) => g.session)
  const busy = useGame((g) => g.busy)
  const thinking = useGame((g) => g.thinking)
  const outcome = useGame((g) => g.outcome)
  const act = useGame((g) => g.act)
  const forfeit = useGame((g) => g.forfeit)
  const go = useNav((n) => n.go)
  const hints = useSettings((st) => st.hints)
  const clear = useGame((g) => g.clear)
  const tutorialStep = useGame((g) => g.tutorialStep)
  const tutorialNext = useGame((g) => g.tutorialNext)
  const nudge = useGame((g) => g.nudge)

  const [quitting, setQuitting] = useState(false)
  const [line, setLine] = useState('')
  const [hintSlot, setHintSlot] = useState<HTMLDivElement | null>(null)

  useFeed((event) => {
    const current = useGame.getState().game
    const text = current && describe(event, current)
    if (text) setLine(text)
  })

  // Nothing is left open from the last game.
  useEffect(() => useInspect.getState().close, [])

  const handNumber = game?.handNumber ?? 0
  useEffect(() => pruneCardMemory(handNumber), [handNumber])

  const canAct = !!game && !busy && game.current === HUMAN && HUMAN_PHASES.includes(game.phase)
  const drawing = canAct && game.phase === 'turn' && canDraw(game, game.players[HUMAN])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = useGame.getState().game
      if (!g || !canAct || g.phase !== 'turn' || e.metaKey || e.ctrlKey || e.altKey) return
      const source = SHORTCUTS[e.key]
      if (source && drawing && canDrawFrom(g, source)) act({ type: 'draw', source })
      if (e.key.toLowerCase() === 's') act({ type: 'stand' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canAct, drawing, act])

  const venue = venueOf(session?.venue)
  // A felt from the collection covers whatever the house has on its table.
  const felt = FELTS[useCareer((c) => c.look.felt)]
  const colors = felt ? { ...venue.colors, '--felt-a': felt[0], '--felt-b': felt[1], '--felt-c': felt[2] } : venue.colors
  useEffect(() => setAmbienceMix(venue.sound), [venue])

  useEffect(() => {
    if (!game || !session) go('home')
  }, [game, session, go])
  if (!game || !session) return null

  const opponents = game.players.filter((p) => !p.isHuman)
  const showdown = game.phase === 'showdown'
  // In the practice hand the coach does the talking.
  const mine = canAct && !session.tutorial ? prompt(game) : null
  const waiting = thinking !== null ? tx`${game.players[thinking].name} überlegt …` : line

  const leave = () => {
    if (outcome) go('result')
    else setQuitting(true)
  }
  const endTutorial = () => {
    clear()
    go('home')
  }

  // Practice hand: the coach explains the step that is due right now.
  const step = session.tutorial ? TUTORIAL_STEPS[tutorialStep] : undefined
  const stepDue = step && (step.when === 'start' || (canAct && game.phase === step.when))
  const coach = stepDue ? (
    <div key={`${tutorialStep}-${nudge}`} className={cx(s.hint, s.coach)}>
      <p>{step.text}</p>
      {!step.expect && (
        <button className={cx(common.btn, common.btnPrimary)} onClick={tutorialNext}>
          {tx`Weiter`}
        </button>
      )}
    </div>
  ) : null
  const hint = session.tutorial ? coach : hints && mine?.hint ? <p className={s.hint}>{mine.hint}</p> : null

  return (
    <LayoutGroup>
      <div className={cx(s.table, showdown && s.revealing)} style={colors}>
        <header className={s.top}>
          <button className={common.iconBtn} onClick={leave} aria-label={tx`Tisch verlassen`}>
            <Icon name="close" />
          </button>
          <div className={s.topTitle}>
            <b>{session.title}</b>
            <span>{tx`Hand `}{game.handNumber}</span>
          </div>
          <div className={s.rounds} aria-label={tx`Runde ${game.round} von ${game.rules.rounds}`}>
            <Suspicion compact />
            <span className={s.roundLabel}>{tx`Runde`}</span>
            {Array.from({ length: game.rules.rounds }, (_, i) => i + 1).map((r) => (
              <i key={r} className={cx(s.roundPip, r < game.round && s.roundDone, r === game.round && s.roundNow)} />
            ))}
          </div>
          <Modifiers game={game} />
        </header>

        {/* Everything here is sized in table units, so the scene fits whatever room the screen leaves. */}
        <div className={s.scene}>
          <Backdrop dim={showdown} />
          <div className={s.hintTop} ref={setHintSlot} />
          <div className={s.tableTop} aria-hidden>
            <i className={s.tableShadow} />
            <i className={s.discSide} />
            <i className={s.disc}>
              <Surface opponents={opponents.length} />
            </i>
            <TableRipple />
          </div>
          <Hub />

          {opponents.map((p, i) => (
            <Seat
              key={p.id}
              player={p}
              character={session.seats[p.id]!}
              slot={i}
              opponents={opponents.length}
            />
          ))}

          <Dealer />

          <section className={s.center}>
            <Piles enabled={drawing} onDraw={(source) => act({ type: 'draw', source })} />
          </section>
          <div className={s.console} aria-live="polite">
            <p className={cx(s.ticker, mine && s.tickerMine)}>{mine ? mine.line : waiting}</p>
          </div>
        </div>

        <MyArea canAct={canAct} hint={hint} hintSlot={hintSlot} canPeek={!session.tutorial} />

        <TokenBeams />
        <Announcer />
        <RevealCallout />
        <TokenBanner />
        <DiceOverlay canAct={canAct} />
        <ResultSheet onLeave={session.tutorial ? endTutorial : () => go('result')} />
        <TokenSheet canAct={canAct} />
        <PeekSheet canAct={canAct} />

        <Sheet open={quitting} onClose={() => setQuitting(false)} dialog>
          <h2 className={common.sheetTitle}>{tx`Tisch verlassen?`}</h2>
          <p className={common.sheetText}>
            {session.tutorial
              ? tx`Die Übungshand wird abgebrochen. Du kannst sie jederzeit neu starten.`
              : session.kind === 'tour'
                ? tx`Die Partie zählt als verloren – damit ist die Tour vorbei und der Topf weg.`
                : session.kind === 'daily'
                  ? tx`Die Tageshand zählt dann als verloren. Einen zweiten Versuch gibt es heute nicht.`
                  : session.mode === 'career'
                    ? tx`Die Partie zählt als verloren und dein Buy-in bleibt am Tisch.`
                : tx`Die laufende Partie wird abgebrochen.`}
          </p>
          <div className={common.sheetActions}>
            <button className={cx(common.btn, common.btnGhost)} onClick={() => setQuitting(false)}>
              {tx`Bleiben`}
            </button>
            <button
              className={cx(common.btn, common.btnDanger)}
              onClick={() => {
                if (session.tutorial) return endTutorial()
                forfeit()
                go(session.kind === 'tour' ? 'tour' : session.kind === 'daily' ? 'daily' : session.mode === 'career' ? 'career' : 'home')
              }}
            >
              {tx`Verlassen`}
            </button>
          </div>
        </Sheet>
      </div>
    </LayoutGroup>
  )
}
