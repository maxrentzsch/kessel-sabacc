import { animate, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { CHARACTERS } from '../../ai/personalities'
import { achievement } from '../../career/achievements'
import { TABLES } from '../../career/tables'
import { tourPot } from '../../career/tour'
import { TOKEN_TEXT } from '../../i18n/texts'
import { useCareer } from '../../store/career'
import { useGame } from '../../store/game'
import { useNav } from '../../store/nav'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { RankBar } from '../common/Rank'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.4,
      delay: 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `+${Math.round(v)}`
      },
    })
    return () => controls.stop()
  }, [to])
  return (
    <span ref={ref} className="num">
      +0
    </span>
  )
}

export function ResultScreen() {
  const go = useNav((n) => n.go)
  const session = useGame((g) => g.session)
  const outcome = useGame((g) => g.outcome)
  const summary = useGame((g) => g.summary)
  const game = useGame((g) => g.game)
  const clear = useGame((g) => g.clear)
  const credits = useCareer((c) => c.credits)
  const gameRep = useCareer((c) => c.gameRep)
  const recent = useCareer((c) => c.recent)
  const tourState = useCareer((c) => c.tour)
  const streak = useCareer((c) => c.dailyStreak)
  const basePrice = useNav((n) => n.pending?.session.buyIn ?? 0)

  useEffect(() => {
    if (!session || !outcome) go('home')
  }, [session, outcome, go])
  if (!session || !outcome || !summary) return null

  const won = outcome === 'won'
  const career = session.mode === 'career'
  const table = session.table
  const nextTable = table ? TABLES[TABLES.indexOf(table) + 1] : undefined
  const duel = session.kind === 'duel'
  const tour = session.kind === 'tour'
  const daily = session.kind === 'daily'
  const canRetry = !career || credits >= basePrice
  const champion = won && career && !duel && table === TABLES[TABLES.length - 1]
  const rival = table ? CHARACTERS[table.rival] : null

  const leave = (to: 'career' | 'home' | 'loadout' | 'tour' | 'daily') => {
    clear()
    go(to)
  }

  return (
    <div className={cx(common.screen, s.result, won ? s.resultWon : s.resultLost)}>
      <div className={s.resultBody}>
        <motion.p className={s.resultKicker} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {session.title} · {game?.handNumber ?? 0}{tx` Hände`}
        </motion.p>
        <motion.h1
          className={cx(s.resultTitle, 'display')}
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.15 }}
        >
          {champion ? tx`Kessel-Krone!` : won ? (duel ? tx`Duell gewonnen` : tour ? tx`Weiter geht’s` : tx`Sieg`) : tour ? tx`Tour vorbei` : summary.refund > 0 ? tx`Zweiter Platz` : tx`Pleite`}
        </motion.h1>
        <motion.p className={s.resultText} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          {champion
            ? tx`Madame Oshi legt wortlos ihre Karten ab. Die „Sandläufer“ gehört wieder dir – und die ganze Galaxis weiß es.`
            : tour
              ? won
                ? tx`Halt ${tourState?.wins ?? 0} geschafft. Im Topf liegen jetzt ${tourPot(tourState?.wins ?? 0)} Credits – aussteigen oder weiterziehen?`
                : tx`Der Topf ist weg. Die nächste Tour beginnt wieder bei null.`
              : daily
                ? won
                  ? tx`Tageshand gewonnen – am ${streak}. Tag in Folge dabei. Morgen wartet die nächste.`
                  : tx`Die Tageshand ging verloren. Deine Serie läuft weiter, wenn du morgen wieder am Tisch sitzt.`
                : won
              ? tx`Du bist als Letzter mit Chips übrig. Die anderen starren in leere Hände.`
              : summary.refund > 0
                ? tx`Nur einer hat länger durchgehalten als du. Dafür gibt das Haus dein Buy-in zurück.`
              : career
                ? tx`Deine Chips sind weg, dein Buy-in auch. Der Tisch wartet auf deine Revanche.`
                : tx`Deine Chips sind weg. Neue Runde, neues Glück.`}
        </motion.p>

        {won && summary.payout > 0 && (
          <motion.div className={s.payout} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <CountUp to={summary.payout} />
            <small>{tx`Credits`}</small>
          </motion.div>
        )}
        {summary.refund > 0 && (
          <motion.div className={s.payout} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <CountUp to={summary.refund} />
            <small>{tx`Credits zurück`}</small>
          </motion.div>
        )}

        <motion.div className={s.earned} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <p className={s.earnedRep}>
            <b className="num">+{gameRep}</b>{tx` Ruf`}
          </p>
          <RankBar />
          {recent.map((id) => (
            <div key={id} className={s.earnedFeat}>
              <Icon name="trophy" size={18} />
              <span>
                <b>{achievement(id)?.name}</b>
                <em>{achievement(id)?.text}</em>
              </span>
            </div>
          ))}
        </motion.div>

        {summary.newTokens.length > 0 && (
          <div className={s.unlocks}>
            <p className={s.unlocksTitle}>{tx`Neue Shift-Tokens`}</p>
            {summary.newTokens.map((token, i) => (
              <motion.div
                key={token}
                className={s.unlock}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + i * 0.25, type: 'spring', stiffness: 260, damping: 22 }}
              >
                <span className={s.unlockIcon}>
                  <TokenIcon token={token} size={26} />
                </span>
                <span>
                  <b>{TOKEN_TEXT[token].name}</b>
                  <em>{TOKEN_TEXT[token].short}</em>
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {rival && table && (summary.firstWin || summary.firstDuelWin) && (
          <motion.div className={s.outro} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>
            <Portrait character={rival} size={60} mood={summary.firstDuelWin ? 'angry' : 'worried'} alive frame />
            <p>
              <b>{rival.name}</b>
              {summary.firstDuelWin ? tx`„Das war das letzte Mal. Wirklich.“` : tx`„${table.outro}“`}
            </p>
          </motion.div>
        )}

        {won && summary.firstWin && nextTable && (
          <motion.p className={s.resultNext} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
            {tx`Neuer Tisch freigeschaltet: `}<b>{nextTable.name}</b>
          </motion.p>
        )}
      </div>

      <footer className={s.stickyFoot}>
        {/* After a loss the rematch is the obvious next step. */}
        {tour || daily ? (
          <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} onClick={() => leave(tour ? 'tour' : 'daily')}>
            {tour ? tx`Zur Tour` : tx`Weiter`}
          </button>
        ) : (
          <>
            <button className={cx(common.btn, !won && canRetry && common.btnPrimary, common.btnBlock)} disabled={!canRetry} onClick={() => leave('loadout')} style={{ order: won ? 1 : 0 }}>
              {won ? tx`Nochmal spielen` : tx`Revanche`}
            </button>
            <button className={cx(common.btn, (won || !canRetry) && common.btnPrimary, common.btnBlock)} onClick={() => leave(career ? 'career' : 'home')}>
              {career ? tx`Zur Karriere` : tx`Hauptmenü`}
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
