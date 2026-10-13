import { motion } from 'motion/react'
import { ACHIEVEMENTS } from '../../career/achievements'
import { COSMETICS } from '../../career/cosmetics'
import { SHIP_MODULES } from '../../career/ship'
import { useCareer } from '../../store/career'
import { useNav } from '../../store/nav'
import { Icon } from '../art/Icons'
import common from '../common/common.module.css'
import { RankBar } from '../common/Rank'
import { cx } from '../cx'
import s from './Screens.module.css'

const HULLS = [
  { body: '#6b4a34', shade: '#4a3222', stripe: 'none' },
  { body: '#8d9499', shade: '#666d72', stripe: 'none' },
  { body: '#e3dac6', shade: '#b9ae94', stripe: '#e58a22' },
  { body: '#f3ecdc', shade: '#cfc5ae', stripe: '#3fb6a9' },
]

/** The freighter, drawn from how far each of its modules has been built. */
function Ship({ levels, free }: { levels: Record<string, number>; free: boolean }) {
  const hull = HULLS[levels.hull ?? 0]
  const engine = levels.engine ?? 0
  const sensors = levels.sensors ?? 0
  const lounge = levels.lounge ?? 0
  const vault = levels.vault ?? 0
  const windows = [150, 172, 194, 216, 238, 260]
  return (
    <svg viewBox="0 0 400 210" className={s.ship} aria-hidden>
      <defs>
        <linearGradient id="ship-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hull.body} />
          <stop offset="1" stopColor={hull.shade} />
        </linearGradient>
        <radialGradient id="ship-glow">
          <stop offset="0" stopColor="#d8fffb" />
          <stop offset="0.4" stopColor="#76ece4" stopOpacity="0.8" />
          <stop offset="1" stopColor="#76ece4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* hangar floor */}
      <ellipse cx="200" cy="184" rx="170" ry="14" fill="#000" opacity="0.45" />
      <path d="M10 190H390" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2" />

      <g className={cx(free && s.shipHover)}>
        {/* engine block and its glow */}
        {engine > 0 && <ellipse cx="34" cy="112" rx={14 + engine * 10} ry={8 + engine * 5} fill="url(#ship-glow)" className={s.shipGlow} />}
        <rect x="46" y="92" width="34" height="40" rx="6" fill="#3a4246" />
        {[0, 1, 2].slice(0, Math.max(1, engine)).map((i) => (
          <rect key={i} x="40" y={97 + i * 11} width="10" height="8" rx="2" fill={engine > 0 ? '#76ece4' : '#20262a'} />
        ))}

        {/* strongboxes under the hold */}
        {[0, 1, 2].slice(0, vault).map((i) => (
          <g key={i} transform={`translate(${128 + i * 44} 138)`}>
            <rect width="36" height="18" rx="3" fill="#5a4a20" stroke="#e8c04a" strokeWidth="2" />
            <circle cx="18" cy="9" r="3.500" fill="#e8c04a" />
          </g>
        ))}

        {/* hull */}
        <path d="M72 112c0-26 30-44 78-44h126c44 0 78 16 78 40s-34 34-78 34H126c-34 0-54-10-54-30z" fill="url(#ship-hull)" stroke="#1c1612" strokeWidth="2.500" />
        {hull.stripe !== 'none' && <path d="M84 118H346" stroke={hull.stripe} strokeWidth="7" strokeLinecap="round" />}
        {(levels.hull ?? 0) === 0 && (
          <g fill="#3a2418" opacity="0.7">
            <path d="M120 84l22 4-6 14-20-6zM230 78l30 2-8 12-24-4zM176 122l26 2-4 10-24-2z" />
          </g>
        )}
        {(levels.hull ?? 0) >= 3 && (
          <text x="208" y="138" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="3" fill="#1c1612" fontFamily="var(--font-display)">
            SANDLÄUFER
          </text>
        )}

        {/* lounge windows */}
        {windows.map((x, i) => (
          <rect key={x} x={x} y="90" width="13" height="11" rx="3" fill={i < lounge * 2 ? '#ffd9a0' : '#1c2226'} stroke="#1c1612" strokeWidth="1.500" />
        ))}

        {/* cockpit */}
        <path d="M296 78c26 2 44 12 50 26h-52z" fill="#18323a" stroke="#1c1612" strokeWidth="2.500" />
        <path d="M304 84c14 2 24 7 30 14" stroke="#76ece4" strokeWidth="2.500" strokeLinecap="round" opacity="0.7" fill="none" />

        {/* sensors */}
        {sensors >= 1 && <path d="M190 68V50" stroke="#aeb6ba" strokeWidth="3" strokeLinecap="round" />}
        {sensors === 1 && <circle cx="190" cy="48" r="4" fill="#76ece4" />}
        {sensors >= 2 && <path d="M172 50c4-14 32-14 36 0z" fill="#aeb6ba" stroke="#1c1612" strokeWidth="2" />}
        {sensors >= 3 && <ellipse cx="190" cy="40" rx="24" ry="5" fill="none" stroke="#76ece4" strokeWidth="2" className={s.shipScan} />}

        {/* landing gear */}
        <path d="M130 142v26M270 142v26M118 170h24M258 170h24" stroke="#3a4246" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* impounded: clamped to the floor */}
      {!free && (
        <g>
          <path d="M112 158h36v26h-36zM252 158h36v26h-36z" fill="#5a1414" stroke="#e0584c" strokeWidth="2.500" />
          <circle cx="200" cy="168" r="6" fill="#e0584c" className={s.shipAlarm} />
        </g>
      )}
    </svg>
  )
}

export function HangarScreen() {
  const go = useNav((n) => n.go)
  const career = useCareer()
  const free = (career.tableWins.crown ?? 0) > 0
  const done = Object.keys(career.achievements).length
  const owned = career.owned.length

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>Sandläufer</h1>
        <span className={common.credits}>{career.credits}</span>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.hangar)}>
          <RankBar />

          <div className={s.dock}>
            <Ship levels={career.ship} free={free} />
            <p className={cx(s.dockNote, free && s.dockFree)}>
              {free ? 'Sie gehört wieder dir. Startklar, wann immer du willst.' : 'Gepfändet in Madame Oshis Hangar. Schrauben darfst du trotzdem – fliegen erst nach der Kessel-Krone.'}
            </p>
          </div>

          <div className={s.hubLinks}>
            <button className={common.btn} onClick={() => go('collection')}>
              Sammlung
              <small className="num">
                {owned}/{COSMETICS.length}
              </small>
            </button>
            <button className={common.btn} onClick={() => go('achievements')}>
              Erfolge
              <small className="num">
                {done}/{ACHIEVEMENTS.length}
              </small>
            </button>
          </div>

          <h2 className={s.fieldLabel}>Ausbau</h2>
          <div className={s.modules}>
            {SHIP_MODULES.map((module, i) => {
              const level = career.ship[module.id] ?? 0
              const price = module.levels[level]
              return (
                <motion.div key={module.id} className={s.module} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                  <div className={s.moduleInfo}>
                    <b>{module.name}</b>
                    <span className={s.pips}>
                      {module.levels.map((_, n) => (
                        <i key={n} className={cx(n < level && s.pipOn)} />
                      ))}
                    </span>
                    <em>{level > 0 && module.perks ? module.perks[level - 1] : module.text}</em>
                    {price !== undefined && module.perks && <em className={s.moduleNext}>Nächste Stufe: {module.perks[level]}</em>}
                  </div>
                  {price !== undefined ? (
                    <button className={cx(common.btn, career.credits >= price && common.btnPrimary)} disabled={career.credits < price} onClick={() => career.upgrade(module.id)}>
                      <span className="num">{price}</span>
                    </button>
                  ) : (
                    <span className={s.moduleDone}>
                      <Icon name="check" size={18} />
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
