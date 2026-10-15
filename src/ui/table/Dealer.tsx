import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { STANDARD_RULES } from '../../engine'
import type { Rules } from '../../engine'
import { isYou, seatsAround, useGame } from '../../store/game'
import { tempo } from '../../store/settings'
import { cx } from '../cx'
import { useFeed } from './feed'
import { REVEAL_PHASES, SLOTS } from './Seat'
import s from './Table.module.css'
import { tx } from '../../i18n'

/** What is different about this table, in the dealer's clipped way of speaking. */
function houseRules(rules: Rules): string | null {
  const parts: string[] = []
  if (rules.rounds !== STANDARD_RULES.rounds) parts.push(tx`${rules.rounds} Runden pro Hand`)
  if (rules.sylops !== STANDARD_RULES.sylops) parts.push(tx`${rules.sylops} Sylops pro Deck`)
  if (rules.impostors !== STANDARD_RULES.impostors) parts.push(rules.impostors === 0 ? tx`keine Impostoren` : tx`${rules.impostors} Impostoren pro Deck`)
  if (rules.penaltyBonus > 0) parts.push(tx`${rules.penaltyBonus} Chip Steuer pro verlorener Hand`)
  return parts.length ? parts.join(', ') : null
}

type Gesture = 'deal' | 'shuffle' | 'alarm'

/**
 * The house droid that runs the table: it deals, calls the rounds, keeps an
 * eye on whoever is to move – and a closer one on a player it suspects.
 */
export function Dealer() {
  const game = useGame((g) => g.game)!
  const session = useGame((g) => g.session)!
  const viewer = useGame((g) => g.viewer)
  const suspicion = useGame((g) => g.suspicion)
  const caught = useGame((g) => g.caught)
  const [line, setLine] = useState<{ id: number; text: string } | null>(null)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const serial = useRef(0)
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms))
  }
  const say = (text: string, delay = 0) => {
    // The coach does the talking in the practice hand.
    if (session.tutorial) return
    const id = ++serial.current
    later(delay, () => {
      setLine({ id, text })
      sfx.voice(140, 2 + Math.ceil(text.length / 14), true)
      later(1700 + text.length * 50, () => setLine((l) => (l?.id === id ? null : l)))
    })
  }
  const move = (next: Gesture, ms: number) => {
    setGesture(next)
    later(ms, () => setGesture((g) => (g === next ? null : g)))
  }
  const dealTime = () => (game.players.filter((p) => !p.eliminated).length * 0.22 + 0.9) * 1000 * tempo()

  // The opening deal happens before the table is on screen.
  useEffect(() => {
    if (game.handNumber !== 1 || game.round !== 1) return
    move('deal', dealTime())
    const rules = houseRules(game.rules)
    say(rules ? tx`Hausregel: ${rules}.` : tx`Einsätze bitte.`, 2800)
    // only when the droid takes its place
  }, [])

  const seenCaught = useRef(caught)
  useEffect(() => {
    if (caught === seenCaught.current) return
    seenCaught.current = caught
    move('alarm', 2400)
    say(tx`Betrugsversuch registriert. Zwei Chips.`)
  })

  // Crossing the line from curious to suspicious is worth a warning – once.
  const wary = suspicion >= 70
  const wasWary = useRef(wary)
  useEffect(() => {
    if (wary && !wasWary.current && caught === seenCaught.current) say(tx`Ich beobachte dich.`, 500)
    wasWary.current = wary
  })

  useFeed((event) => {
    const current = useGame.getState().game
    if (!current) return
    switch (event.type) {
      case 'handStart':
        if (event.hand === 1) break
        move('deal', dealTime())
        say(tx`Neue Hand.`, 300)
        break
      case 'roundStart':
        if (event.round > 1 && event.round === current.rules.rounds) say(tx`Letzte Runde.`, 200)
        break
      case 'reshuffled':
        move('shuffle', 1100)
        say(tx`Stapel leer. Ich mische neu.`)
        break
      case 'showdown':
        say(tx`Karten auf den Tisch.`)
        break
      case 'eliminated':
        say(isYou(current, event.playerId) ? tx`Du bist raus.` : tx`${current.players[event.playerId].name} ist raus.`, 900)
        break
    }
  })

  // Look at whoever is to move: opponents sit along the far rim, the player in front of it.
  const opponents = seatsAround(game, viewer)
  const slot = opponents.findIndex((p) => p.id === game.current)
  const idle = REVEAL_PHASES.includes(game.phase)
  const gaze = gesture === 'alarm' || (wary && !idle) ? { x: 2.2, y: 2 } : idle ? { x: 1.2, y: -0.4 } : slot < 0 ? { x: 2.2, y: 2 } : { x: 0.6 + (SLOTS[opponents.length][slot].x + 1) * 1.1, y: -1.8 }
  const mood = gesture === 'alarm' || suspicion >= 70 ? s.dealerAlarm : suspicion >= 40 ? s.dealerWary : game.phase === 'showdown' ? s.dealerShow : undefined

  const explain = () => {
    const rules = houseRules(game.rules)
    say(tx`Runde ${Math.min(game.round, game.rules.rounds)} von ${game.rules.rounds}. ${rules ? tx`Hausregel: ${rules}.` : tx`Standardregeln.`}`)
  }

  return (
    <div className={cx(s.dealer, mood, gesture === 'deal' && s.dealerDealing, gesture === 'shuffle' && s.dealerShuffling, gesture === 'alarm' && s.dealerShaking)}>
      <AnimatePresence>
        {line && (
          <motion.p
            key={line.id}
            className={s.dealerLine}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            {line.text}
          </motion.p>
        )}
      </AnimatePresence>
      <button className={s.dealerBody} onClick={explain} aria-label={tx`Geber-Droide: Regeln dieses Tischs`}>
        <svg viewBox="0 0 60 78" aria-hidden>
          <ellipse className={s.dealerShadow} cx="30" cy="73" rx="15" ry="3.6" />
          <g className={s.dealerFloat}>
            {/* thruster */}
            <ellipse className={s.dealerJet} cx="30" cy="63" rx="7" ry="2.6" />
            {/* arms: the right one deals */}
            <path className={s.dealerArm} d="M19 46 L10 53 L8 58" />
            <g className={s.dealerHand}>
              <path className={s.dealerArm} d="M41 46 L50 51 L53 56" />
              <rect className={s.dealerCard} x="50" y="53" width="7" height="9" rx="1.6" />
            </g>
            {/* body */}
            <path className={s.dealerHull} d="M18 39 H42 L38.5 59 Q30 63 21.5 59 Z" />
            <path className={s.dealerBand} d="M19.2 46 H40.8 L40 50.5 H20 Z" />
            <circle className={s.dealerLamp} cx="30" cy="54.5" r="1.7" />
            {/* head */}
            <path className={s.dealerNeck} d="M24 36 H36 V40 H24 Z" />
            <path className={s.dealerHead} d="M13 37 V28 Q13 13 30 13 Q47 13 47 28 V37 Z" />
            <path className={s.dealerVisor} d="M16.5 22.5 H43.5 Q45 27 43.5 32.5 H16.5 Q15 27 16.5 22.5 Z" />
            <g style={{ transform: `translate(${gaze.x}px, ${gaze.y}px)` }} className={s.dealerGaze}>
              <circle className={s.dealerEye} cx="30" cy="27.5" r="3.6" />
              <circle className={s.dealerGlint} cx="31.2" cy="26.3" r="1" />
            </g>
            <path className={s.dealerAntenna} d="M38 14.5 L41 6" />
            <circle className={s.dealerTip} cx="41.2" cy="5.4" r="1.6" />
          </g>
        </svg>
      </button>
    </div>
  )
}
