import { motion } from 'motion/react'
import { rankOf } from '../../career/reputation'
import { TABLES } from '../../career/tables'
import { today } from '../../career/tour'
import type { Card } from '../../engine'
import { unlockAudio } from '../../audio/sfx'
import { useCareer } from '../../store/career'
import { useGame } from '../../store/game'
import { useNav } from '../../store/nav'
import { CardBack, CardFace } from '../art/CardArt'
import common from '../common/common.module.css'
import { usePlayerTitle } from '../common/Rank'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

const SAND: Card = { id: 'hero-sand', suit: 'sand', kind: 'number', value: 1 }
const BLOOD: Card = { id: 'hero-blood', suit: 'blood', kind: 'number', value: 1 }

const float = (delay: number) => ({
  animate: { y: [0, -9, 0] },
  transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const, delay },
})

export function HomeScreen() {
  const go = useNav((n) => n.go)
  const credits = useCareer((c) => c.credits)
  const tableWins = useCareer((c) => c.tableWins)
  const games = useCareer((c) => c.stats.games)
  const beaten = TABLES.filter((t) => tableWins[t.id]).length
  const tour = useCareer((c) => c.tour)
  const tourBest = useCareer((c) => c.tourBest)
  const dailyOpen = useCareer((c) => c.daily?.date !== today())
  const rank = rankOf(useCareer((c) => c.rep))
  const title = usePlayerTitle()
  const savedRun = useGame((g) => g.savedRun)
  const resume = useGame((g) => g.resume)

  const startTutorial = useGame((g) => g.startTutorial)
  const practise = () => {
    unlockAudio()
    startTutorial()
    go('table')
  }

  const continueRun = () => {
    unlockAudio()
    if (resume()) go('table')
  }

  return (
    <div className={cx(common.screen, s.home)}>
      <div className={s.hero}>
        <div className={s.heroCards} aria-hidden>
          <motion.div className={cx(s.heroCard, s.heroBackL)} initial={{ opacity: 0, rotate: 0, x: 0 }} animate={{ opacity: 1, rotate: -24, x: '-92%' }} transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <CardBack suit="sand" />
          </motion.div>
          <motion.div className={cx(s.heroCard, s.heroBackR)} initial={{ opacity: 0, rotate: 0, x: 0 }} animate={{ opacity: 1, rotate: 24, x: '92%' }} transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <CardBack suit="blood" />
          </motion.div>
          <motion.div className={s.heroCard} initial={{ opacity: 0, y: 40, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: -9, x: '-36%' }} transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <motion.div {...float(0)}>
              <CardFace card={SAND} />
            </motion.div>
          </motion.div>
          <motion.div className={s.heroCard} initial={{ opacity: 0, y: 40, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: 9, x: '36%' }} transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <motion.div {...float(1.2)}>
              <CardFace card={BLOOD} />
            </motion.div>
          </motion.div>
        </div>
        <motion.h1 className={s.logo} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
          <span>{tx`Kessel`}</span>
          <b>{tx`Sabacc`}</b>
        </motion.h1>
        <motion.p className={s.tagline} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          {tx`Zwei Karten. Drei Runden. Kein Erbarmen.`}
        </motion.p>
      </div>

      <motion.nav className={s.menu} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}>
        {savedRun && (
          <button className={cx(common.btn, common.btnPrimary, common.btnBlock, s.menuMain)} onClick={continueRun}>
            <span>{tx`Partie fortsetzen`}</span>
            <small>{savedRun}</small>
          </button>
        )}
        <button className={cx(common.btn, !savedRun && common.btnPrimary, common.btnBlock, s.menuMain)} onClick={() => go('career')}>
          <span>{games > 0 ? tx`Karriere fortsetzen` : tx`Karriere starten`}</span>
          <small className="num">
            {credits}{tx` Credits · `}{beaten}/{TABLES.length}{tx` Tische`}
          </small>
        </button>
        <div className={s.menuRow}>
          <button className={cx(common.btn, s.menuTile, dailyOpen && s.menuTileNew)} onClick={() => go('daily')}>
            <span>{tx`Tageshand`}</span>
            <small>{dailyOpen ? tx`Heute noch offen` : tx`Morgen wieder`}</small>
          </button>
          <button className={cx(common.btn, s.menuTile)} onClick={() => go('tour')}>
            <span>{tx`Auf Tour`}</span>
            <small className="num">{tour ? tx`Halt ${tour.wins + 1}` : tx`Rekord ${tourBest}`}</small>
          </button>
        </div>
        <div className={s.menuRow}>
          <button className={cx(common.btn, s.menuTile)} onClick={() => go('ship')}>
            <span>{tx`Sandläufer`}</span>
            <small>
              {tx`Rang `}{rank.level} · {title}
            </small>
          </button>
          <button className={cx(common.btn, s.menuTile)} onClick={() => go('free')}>
            <span>{tx`Freies Spiel`}</span>
            <small>{tx`Eigene Regeln`}</small>
          </button>
        </div>
        <div className={s.menuTrio}>
          <button className={common.btn} onClick={practise}>
            {tx`Übung`}
          </button>
          <button className={common.btn} onClick={() => go('rules')}>
            {tx`Regeln`}
          </button>
          <button className={common.btn} onClick={() => go('profile')}>
            {tx`Profil`}
          </button>
        </div>
      </motion.nav>
    </div>
  )
}
