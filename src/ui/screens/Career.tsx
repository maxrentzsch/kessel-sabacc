import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { CHARACTERS } from '../../ai/personalities'
import type { Character } from '../../ai/personalities'
import { arrivalScene, PROLOGUE_SCENE, victoryScene } from '../../career/story'
import type { Line } from '../../career/story'
import { duelBuyIn, duelPayout, payoutFor, TABLES } from '../../career/tables'
import type { TableDef } from '../../career/tables'
import { TOKEN_TEXT } from '../../i18n/texts'
import { runnerUpRefund, useCareer } from '../../store/career'
import type { Session } from '../../store/game'
import { useNav } from '../../store/nav'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { Scene } from '../common/Scene'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import s from './Screens.module.css'
import { StarMap } from './StarMap'
import type { Standing } from './StarMap'
import { tx } from '../../i18n'

/** In a duel the rival plays at their very best, whatever they are like at their own table. */
function duelist(rival: Character): Character {
  return { ...rival, profile: { ...rival.profile, difficulty: 'hard' } }
}

/** Legend mode: everybody plays their best, you start a chip short – for twice the money. */
function tableSession(table: TableDef, legend: boolean): Session {
  const seats = table.opponents.map((id) => (legend ? duelist(CHARACTERS[id]) : CHARACTERS[id]))
  return {
    mode: 'career',
    kind: 'table',
    table,
    legend,
    title: table.name,
    venue: table.id,
    rules: table.rules,
    buyIn: table.buyIn * (legend ? 2 : 1),
    payout: payoutFor(table) * (legend ? 2 : 1),
    seats: [null, ...seats],
    startingChips: table.chips,
    playerChips: legend ? table.chips - 1 : undefined,
  }
}

function duelSession(table: TableDef): Session {
  return {
    mode: 'career',
    kind: 'duel',
    table,
    title: tx`Duell: ${CHARACTERS[table.rival].name}`,
    venue: table.id,
    rules: table.rules,
    buyIn: duelBuyIn(table),
    payout: duelPayout(table),
    seats: [null, duelist(CHARACTERS[table.rival])],
    startingChips: table.chips,
  }
}

function TableCard({ table, index, onSit }: { table: TableDef; index: number; onSit(session: Session): void }) {
  const career = useCareer()
  const legend = career.legend
  const unlocked = legend || career.isUnlocked(table)
  const wins = (legend ? career.legendWins : career.tableWins)[table.id] ?? 0
  const session = tableSession(table, legend)
  const duels = career.duelWins[table.id] ?? 0
  const rival = CHARACTERS[table.rival]
  const pendingTokens = table.unlocks.filter((t) => !career.unlockedTokens.includes(t))

  return (
    <motion.article
      className={cx(s.tableCard, !unlocked && s.tableLocked, wins > 0 && s.tableWon)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className={s.tableHead}>
        <span className={cx(s.tableNo, 'num')}>{index + 1}</span>
        <div>
          <h2 className={s.tableName}>{table.name}</h2>
          <p className={s.tablePlace}>{table.place}</p>
        </div>
        {wins > 0 && (
          <span className={s.tableBadge}>
            <Icon name="trophy" size={15} /> {wins}×
          </span>
        )}
        {!unlocked && (
          <span className={s.tableBadge}>
            <Icon name="lock" size={15} />
          </span>
        )}
      </header>

      <p className={s.tableBlurb}>{table.blurb}</p>

      <div className={s.tableOpponents}>
        {table.opponents.map((id) => (
          <span key={id} className={s.opponentChip}>
            <Portrait character={CHARACTERS[id]} size={44} frame />
            <span>
              <b>{CHARACTERS[id].name}</b>
              <em>{CHARACTERS[id].title}</em>
            </span>
          </span>
        ))}
      </div>

      {table.ruleText && (
        <p className={s.houseRule}>
          <b>{tx`Hausregel`}</b>
          {table.ruleText}
        </p>
      )}

      <dl className={s.tableFacts}>
        <div>
          <dt>{tx`Buy-in`}</dt>
          <dd className="num">{session.buyIn}</dd>
        </div>
        <div>
          <dt>{tx`Gewinn`}</dt>
          <dd className="num">{session.payout}</dd>
        </div>
        <div>
          <dt>{tx`Chips`}</dt>
          <dd className="num">{session.playerChips ?? table.chips}</dd>
        </div>
      </dl>

      {runnerUpRefund(session) && <p className={s.tableReward}>{tx`Platz 2: Buy-in zurück`}</p>}

      {pendingTokens.length > 0 && (
        <p className={s.tableReward}>
          <span>{tx`Erster Sieg:`}</span>
          {pendingTokens.map((t) => (
            <span key={t} className={s.rewardToken} title={TOKEN_TEXT[t].name}>
              <TokenIcon token={t} size={15} /> {TOKEN_TEXT[t].name}
            </span>
          ))}
        </p>
      )}

      <button
        className={cx(common.btn, unlocked && career.credits >= session.buyIn! && common.btnPrimary, common.btnBlock)}
        disabled={!unlocked || career.credits < session.buyIn!}
        onClick={() => onSit(session)}
      >
        {!unlocked ? tx`Erst „${TABLES[index - 1].name}“ gewinnen` : career.credits < session.buyIn! ? tx`${session.buyIn! - career.credits} Credits fehlen` : tx`Platz nehmen`}
      </button>

      {!legend && wins > 0 && (
        <div className={cx(s.duel, duels > 0 && s.duelWon)}>
          <Portrait character={rival} size={50} frame />
          <div>
            <b>{tx`Duell gegen `}{rival.name}</b>
            <em>
              {tx`Eins gegen eins um `}<span className="num">{duelPayout(table)}</span>{tx` Credits`}{duels > 0 && tx` · ${duels}× gewonnen`}
            </em>
          </div>
          <button className={common.btn} disabled={career.credits < duelBuyIn(table)} onClick={() => onSit(duelSession(table))}>
            <span className="num">{duelBuyIn(table)}</span>
          </button>
        </div>
      )}
    </motion.article>
  )
}

/** A piece of the story waiting to be told, and what follows from it. */
interface Telling {
  lines: Line[]
  venue: string
  title: string
  done(): void
}

export function CareerScreen() {
  const go = useNav((n) => n.go)
  const prepare = useNav((n) => n.prepare)
  const career = useCareer()
  const [bailedOut, setBailedOut] = useState(0)
  const [telling, setTelling] = useState<Telling | null>(null)
  const { legend, storySeen, tableWins, markStory } = career

  const standing = (table: TableDef): Standing =>
    (legend ? career.legendWins : tableWins)[table.id] ? 'won' : legend || career.isUnlocked(table) ? 'open' : 'locked'
  // The player starts out where there is something left to win.
  const [selected, setSelected] = useState(() => (TABLES.find((t) => standing(t) === 'open') ?? TABLES[TABLES.length - 1]).id)
  const table = TABLES.find((t) => t.id === selected)!

  const bailOutIfBroke = career.bailOutIfBroke
  useEffect(() => {
    setBailedOut(bailOutIfBroke())
  }, [bailOutIfBroke])

  // The story moves on when the map is opened: first how it all began, later what the last win set in motion.
  useEffect(() => {
    if (telling) return
    if (!storySeen.includes('prologue')) {
      setTelling({ lines: PROLOGUE_SCENE, venue: 'crown', title: tx`Die Sandläufer`, done: () => markStory('prologue') })
      return
    }
    const untold = TABLES.filter((t) => tableWins[t.id] && !storySeen.includes(`win-${t.id}`))
    const latest = untold[untold.length - 1]
    if (!latest) return
    setSelected(latest.id)
    setTelling({
      lines: victoryScene(latest),
      venue: latest.id,
      title: latest.name,
      done: () => {
        // Wins from before the story was told stay untold.
        for (const t of untold) markStory(`win-${t.id}`)
        const next = TABLES[TABLES.indexOf(latest) + 1]
        if (next) setSelected(next.id)
      },
    })
  }, [telling, storySeen, tableWins, markStory])

  const sit = (session: Session) => {
    const at = session.table!
    const start = () => prepare({ pool: career.unlockedTokens, session })
    // Whoever holds the table has a word to say before the first game there.
    if (session.kind !== 'table' || session.legend || storySeen.includes(`intro-${at.id}`)) return start()
    setTelling({
      lines: arrivalScene(at),
      venue: at.id,
      title: at.name,
      done: () => {
        markStory(`intro-${at.id}`)
        start()
      },
    })
  }

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Karriere`}</h1>
        <span className={common.credits}>{career.credits}</span>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.galaxy)}>
          <div className={s.galaxyMap}>
            {(tableWins.crown ?? 0) > 0 && (
              <div className={s.legendSwitch}>
                <div className={s.segments} role="radiogroup">
                  <button role="radio" aria-checked={!legend} className={cx(s.segment, !legend && s.segmentOn)} onClick={() => career.setLegend(false)}>
                    {tx`Karriere`}
                  </button>
                  <button role="radio" aria-checked={legend} className={cx(s.segment, legend && s.segmentOn)} onClick={() => career.setLegend(true)}>
                    {tx`Legende`}
                  </button>
                </div>
                {legend && <p className={s.fieldNote}>{tx`Jeder Gegner spielt sein bestes Spiel, du startest mit einem Chip weniger – für doppelten Einsatz und Gewinn.`}</p>}
              </div>
            )}
            <StarMap tables={TABLES} standing={standing} selected={selected} onSelect={(t) => setSelected(t.id)} ship={(tableWins.crown ?? 0) > 0} />
          </div>
          <TableCard key={`${selected}-${legend}`} table={table} index={TABLES.indexOf(table)} onSit={sit} />
        </div>
      </div>

      <AnimatePresence>
        {telling && (
          <Scene
            key={telling.title}
            lines={telling.lines}
            venue={telling.venue}
            title={telling.title}
            onDone={() => {
              setTelling(null)
              telling.done()
            }}
          />
        )}
      </AnimatePresence>

      <Sheet open={bailedOut > 0 && !telling} onClose={() => setBailedOut(0)} dialog>
        <h2 className={common.sheetTitle}>{tx`Aufs Haus`}</h2>
        <p className={common.sheetText}>
          {tx`Du bist blank. Der Wirt vom Rostigen Anker schiebt dir `}{bailedOut}{tx` Credits über den Tresen – „aber das letzte Mal“. Sagt er jedes Mal.`}
        </p>
        <div className={common.sheetActions}>
          <button className={cx(common.btn, common.btnPrimary)} onClick={() => setBailedOut(0)}>
            {tx`Danke`}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
