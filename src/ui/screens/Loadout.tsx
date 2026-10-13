import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { stakeHandicap, STAKES, tableUnlocking } from '../../career/tables'
import { TOKEN_IDS } from '../../engine'
import type { TokenId } from '../../engine'
import { TOKEN_TEXT } from '../../i18n/de'
import { unlockAudio } from '../../audio/sfx'
import { useCareer } from '../../store/career'
import { useGame } from '../../store/game'
import { useNav } from '../../store/nav'
import { Icon } from '../art/Icons'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { cx } from '../cx'
import s from './Screens.module.css'

const SLOTS = 3

export function LoadoutScreen() {
  const go = useNav((n) => n.go)
  const pending = useNav((n) => n.pending)
  const career = useCareer()
  const start = useGame((g) => g.start)

  const pool = pending?.pool ?? []
  const [picked, setPicked] = useState<TokenId[]>(() => career.loadout.filter((t) => pool.includes(t)).slice(0, SLOTS))
  const [focus, setFocus] = useState<TokenId>(picked[0] ?? pool[0] ?? 'freeDraw')
  const [stake, setStake] = useState(STAKES[0])

  useEffect(() => {
    if (!pending) go('home')
  }, [pending, go])
  if (!pending) return null

  const { session } = pending
  // Only career tables and duels are played for a stake.
  const paid = session.kind === 'table' || session.kind === 'duel'
  const cost = (session.buyIn ?? 0) * stake.multiplier
  const handicap = paid ? stakeHandicap(stake, session.startingChips) : 0
  const back = () => go(session.kind === 'tour' ? 'tour' : paid ? 'career' : 'free')
  const ready = picked.length === Math.min(SLOTS, pool.length)
  const affordable = !paid || career.credits >= cost

  const toggle = (token: TokenId) => {
    setFocus(token)
    if (!pool.includes(token)) return
    setPicked((list) => (list.includes(token) ? list.filter((t) => t !== token) : list.length < SLOTS ? [...list, token] : list))
  }

  const begin = () => {
    unlockAudio()
    career.setLoadout(picked)
    if (paid) career.spend(cost)
    start(
      {
        ...session,
        buyIn: cost,
        payout: (session.payout ?? 0) * stake.payout,
        stake: stake.multiplier,
        playerChips: (session.playerChips ?? session.startingChips) - handicap,
      },
      picked,
    )
    go('table')
  }

  const focusLocked = !pool.includes(focus)
  const unlockAt = focusLocked ? tableUnlocking(focus) : undefined

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={back} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>Shift-Tokens</h1>
        {paid && <span className={common.credits}>{career.credits}</span>}
      </header>

      <div className={common.screenBody}>
        <div className={cx(common.column, s.loadout)}>
          <p className={s.lead}>
            Wähle {SLOTS} Tokens für <b>{session.title}</b>. Jedes kannst du einmal pro Partie spielen.
          </p>

          <div className={s.slots}>
            {Array.from({ length: SLOTS }, (_, i) => {
              const token = picked[i]
              return (
                <button key={i} className={cx(s.slot, token && s.slotFilled)} onClick={() => token && toggle(token)} aria-label={token ? `${TOKEN_TEXT[token].name} entfernen` : 'Leerer Platz'}>
                  {token ? (
                    <motion.span key={token} initial={{ scale: 0.3, rotate: -60 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                      <TokenIcon token={token} size={30} />
                    </motion.span>
                  ) : (
                    <span className="num">{i + 1}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className={s.focus} aria-live="polite">
            <h2 className={s.focusName}>
              {TOKEN_TEXT[focus].name}
              {focusLocked && <Icon name="lock" size={15} />}
            </h2>
            <p>{TOKEN_TEXT[focus].long}</p>
            {unlockAt && <p className={s.focusLock}>Freischalten: erster Sieg bei „{unlockAt.name}“</p>}
          </div>

          {paid && (
            <section className={s.field}>
              <h2 className={s.fieldLabel}>Einsatz</h2>
              <div className={s.segments} role="radiogroup">
                {STAKES.map((option) => {
                  const price = (session.buyIn ?? 0) * option.multiplier
                  // A stake that is out of reach can still be looked at: the note below says what is missing.
                  const short = career.credits < price
                  return (
                    <button
                      key={option.id}
                      role="radio"
                      aria-checked={option.id === stake.id}
                      className={cx(s.segment, s.segmentPriced, option.id === stake.id && s.segmentOn, short && s.segmentShort)}
                      onClick={() => setStake(option)}
                    >
                      {option.name}
                      <small className="num">
                        {short && <Icon name="lock" size={11} />}
                        {price}
                      </small>
                    </button>
                  )
                })}
              </div>
              <p className={s.fieldNote}>
                {stake.text}
                {handicap > 0 && ` Du startest mit ${handicap} ${handicap === 1 ? 'Chip' : 'Chips'} weniger.`} Buy-in <b className="num">{cost}</b>, Gewinn <b className="num">{(session.payout ?? 0) * stake.payout}</b>.
              </p>
              {!affordable && (
                <p className={s.fieldWarn}>
                  Dafür fehlen dir <b className="num">{cost - career.credits}</b> Credits.
                </p>
              )}
            </section>
          )}

          <div className={s.tokenGrid}>
            {TOKEN_IDS.map((token) => {
              const locked = !pool.includes(token)
              const on = picked.includes(token)
              return (
                <button
                  key={token}
                  className={cx(s.tokenTile, on && s.tokenTileOn, locked && s.tokenTileLocked, focus === token && s.tokenTileFocus)}
                  onClick={() => toggle(token)}
                  aria-pressed={on}
                >
                  <span className={s.tokenTileIcon}>
                    <TokenIcon token={token} size={24} />
                  </span>
                  <span className={s.tokenTileName}>{TOKEN_TEXT[token].name}</span>
                  {on && (
                    <span className={s.tokenTileCheck}>
                      <Icon name="check" size={13} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <footer className={s.stickyFoot}>
        <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} disabled={!ready || !affordable} onClick={begin}>
          {!ready ? `Noch ${SLOTS - picked.length} wählen` : !affordable ? `${cost - career.credits} Credits fehlen` : paid ?`Platz nehmen · ${cost} Credits` : 'Spiel starten'}
        </button>
      </footer>
    </div>
  )
}
