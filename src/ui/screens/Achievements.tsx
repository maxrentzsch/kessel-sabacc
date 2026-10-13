import { motion } from 'motion/react'
import { ACHIEVEMENTS } from '../../career/achievements'
import { useCareer } from '../../store/career'
import { useNav } from '../../store/nav'
import { Icon } from '../art/Icons'
import common from '../common/common.module.css'
import { cx } from '../cx'
import s from './Screens.module.css'

export function AchievementsScreen() {
  const go = useNav((n) => n.go)
  const career = useCareer()
  const done = ACHIEVEMENTS.filter((a) => career.achievements[a.id])
  // open goals first, the ones closest to done on top
  const open = ACHIEVEMENTS.filter((a) => !career.achievements[a.id])
    .map((a) => ({ a, progress: a.progress(career) }))
    .sort((x, y) => y.progress[0] / y.progress[1] - x.progress[0] / x.progress[1])

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('ship')} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>Erfolge</h1>
        <span className={cx(common.credits, s.plainCount)}>
          {done.length}/{ACHIEVEMENTS.length}
        </span>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.feats)}>
          {open.map(({ a, progress: [have, goal] }, i) => (
            <motion.div key={a.id} className={s.feat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
              <span className={s.featIcon}>
                <Icon name="trophy" size={20} />
              </span>
              <div className={s.featBody}>
                <b>{a.name}</b>
                <span>{a.text}</span>
                {goal > 1 && (
                  <i>
                    <span style={{ width: `${Math.min(100, (have / goal) * 100)}%` }} />
                  </i>
                )}
              </div>
              <div className={cx(s.featReward, 'num')}>
                {a.credits > 0 && <b>{a.credits}</b>}
                <span>+{a.rep} Ruf</span>
              </div>
            </motion.div>
          ))}
          {done.length > 0 && <h2 className={s.fieldLabel}>Erreicht</h2>}
          {done.map((a) => (
            <div key={a.id} className={cx(s.feat, s.featDone)}>
              <span className={s.featIcon}>
                <Icon name="check" size={20} />
              </span>
              <div className={s.featBody}>
                <b>{a.name}</b>
                <span>{a.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
