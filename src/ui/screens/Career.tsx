import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { CHARACTERS } from '../../ai/personalities'
import type { Character } from '../../ai/personalities'
import { MAPS } from '../../career/maps'
import { SCENES } from '../../career/story'
import type { Choice, Scene as SceneDef } from '../../career/story'
import { duelBuyIn, duelPayout, FIELD, payoutFor, tableById, TABLES } from '../../career/tables'
import type { TableDef } from '../../career/tables'
import { TOKEN_TEXT } from '../../i18n/texts'
import { runnerUpRefund, useCareer } from '../../store/career'
import type { Session } from '../../store/game'
import { useGame } from '../../store/game'
import { useNav } from '../../store/nav'
import { unlockAudio } from '../../audio/sfx'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { Launch } from '../common/Launch'
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

/** The stake game: Mira's freighter against what Pim and Kessk lent. */
function stakeSession(): Session {
  return {
    mode: 'career',
    kind: 'stake',
    table: FIELD,
    title: FIELD.name,
    venue: FIELD.id,
    rules: FIELD.rules,
    buyIn: 0,
    payout: 0,
    seats: [null, CHARACTERS.mira],
    startingChips: FIELD.chips,
  }
}

/** The order the story leads through: Tarsk's tables, the stake game, then out into the sector. */
const ROUTE: TableDef[] = [...TABLES.filter((t) => t.chapter === 'tarsk'), FIELD, ...TABLES.filter((t) => t.chapter === 'kessel')]

/** Why a table cannot be played yet. */
function lockedBecause(table: TableDef, hasShip: boolean): string {
  if (table.chapter === 'kessel' && !hasShip) return tx`Erst ein Schiff gewinnen`
  const before = ROUTE[ROUTE.indexOf(table) - 1]
  return tx`Erst „${before.name}“ gewinnen`
}

function StakeCard({ onSit }: { onSit(session: Session): void }) {
  const career = useCareer()
  const unlocked = career.isUnlocked(FIELD)
  const won = career.hasShip
  return (
    <motion.article
      className={cx(common.plate, s.tableCard, !unlocked && s.tableLocked, won && s.tableWon)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className={s.tableHead}>
        <span className={cx(common.hexBadge, s.tableNo, 'num')}>{ROUTE.indexOf(FIELD) + 1}</span>
        <div>
          <h2 className={s.tableName}>{FIELD.name}</h2>
          <p className={s.tablePlace}>{FIELD.place}</p>
        </div>
        {!unlocked && (
          <span className={s.tableBadge}>
            <Icon name="lock" size={15} />
          </span>
        )}
      </header>
      <p className={s.tableBlurb}>{FIELD.blurb}</p>
      <div className={s.tableOpponents}>
        <span className={s.opponentChip}>
          <Portrait character={CHARACTERS.mira} size={44} frame />
          <span>
            <b>{CHARACTERS.mira.name}</b>
            <em>{CHARACTERS.mira.title}</em>
          </span>
        </span>
      </div>
      <dl className={s.tableFacts}>
        <div>
          <dt>{tx`Einsatz`}</dt>
          <dd className="num">{tx`2.000`}</dd>
        </div>
        <div>
          <dt>{tx`Preis`}</dt>
          <dd>{tx`ein Frachter`}</dd>
        </div>
        <div>
          <dt>{tx`Chips`}</dt>
          <dd className="num">{FIELD.chips}</dd>
        </div>
      </dl>
      <p className={s.tableReward}>{tx`Die 2.000 Credits leihen dir Pim und Kessk. Verlierst du, darfst du es noch einmal versuchen.`}</p>
      <button className={cx(common.btn, unlocked && !won && common.btnPrimary, common.btnBlock)} disabled={!unlocked || won} onClick={() => onSit(stakeSession())}>
        {won ? tx`Die Sandläufer gehört dir` : !unlocked ? lockedBecause(FIELD, career.hasShip) : tx`Zum Landefeld`}
      </button>
    </motion.article>
  )
}

function TableCard({ table, onSit }: { table: TableDef; onSit(session: Session): void }) {
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
      className={cx(common.plate, s.tableCard, !unlocked && s.tableLocked, wins > 0 && s.tableWon)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <header className={s.tableHead}>
        <span className={cx(common.hexBadge, s.tableNo, 'num')}>{ROUTE.indexOf(table) + 1}</span>
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
        {!unlocked ? lockedBecause(table, career.hasShip) : career.credits < session.buyIn! ? tx`${session.buyIn! - career.credits} Credits fehlen` : tx`Platz nehmen`}
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

/** A piece of the story waiting to be told, and what follows once it has been. */
interface Telling {
  scene: SceneDef
  /** called with the answer given last, if the scene asked something */
  done?(choice?: Choice): void
}

export function CareerScreen() {
  const go = useNav((n) => n.go)
  const prepare = useNav((n) => n.prepare)
  const startTutorial = useGame((g) => g.startTutorial)
  const career = useCareer()
  const [bailedOut, setBailedOut] = useState(0)
  const [telling, setTelling] = useState<Telling | null>(null)
  const [launching, setLaunching] = useState(false)
  const { legend, storySeen, tableWins, markStory, finishScene, hasShip, bix } = career
  // On Tarsk until there is a ship; then out in the sector, with Tarsk a tap away.
  const [view, setView] = useState<'tarsk' | 'kessel'>(hasShip ? 'kessel' : 'tarsk')
  const map = MAPS[view]
  const onMap = map.places.filter((p) => !p.opens).map((p) => tableById(p.id) ?? FIELD)

  const standing = (table: TableDef): Standing => {
    if (table === FIELD) return hasShip ? 'won' : career.isUnlocked(FIELD) && !legend ? 'open' : 'locked'
    return (legend ? career.legendWins : tableWins)[table.id] ? 'won' : legend || career.isUnlocked(table) ? 'open' : 'locked'
  }
  // The player starts out where there is something left to win.
  const firstOpen = (tables: TableDef[]) => (tables.find((t) => standing(t) === 'open') ?? tables[tables.length - 1]).id
  const [selected, setSelected] = useState(() => firstOpen(onMap))
  const table = onMap.find((t) => t.id === selected) ?? onMap[0]

  const openMap = (id: string) => {
    const next = id === 'tarsk' ? 'tarsk' : 'kessel'
    setView(next)
    setSelected(firstOpen(MAPS[next].places.filter((p) => !p.opens).map((p) => tableById(p.id) ?? FIELD)))
  }

  const bailOutIfBroke = career.bailOutIfBroke
  useEffect(() => {
    setBailedOut(bailOutIfBroke())
  }, [bailOutIfBroke])

  // The story moves on when the map is opened: how it all began, the night the ship was won, what the last win set in motion.
  useEffect(() => {
    if (telling || launching) return
    if (!storySeen.includes('prologue-tarsk')) return setTelling({ scene: SCENES['prologue-tarsk'] })
    // A career from before the story began on Tarsk has a ship but never rode to the landing field.
    if (hasShip && !bix) return setTelling({ scene: SCENES.flashback })
    if (hasShip && bix && !storySeen.includes(`win-${FIELD.id}-${bix}`)) return setTelling({ scene: SCENES[`win-${FIELD.id}-${bix}`] })
    if (hasShip && storySeen.includes('launch') && !storySeen.includes('jump-lock') && !tableWins.crown) return setTelling({ scene: SCENES['jump-lock'] })
    const untold = TABLES.filter((t) => tableWins[t.id] && !storySeen.includes(`win-${t.id}`))
    const latest = untold[untold.length - 1]
    if (!latest) return
    setView(latest.chapter)
    setSelected(latest.id)
    setTelling({
      scene: SCENES[`win-${latest.id}`],
      done: () => {
        // Wins from before the story was told stay untold.
        for (const t of untold) markStory(`win-${t.id}`)
        const next = ROUTE[ROUTE.indexOf(latest) + 1]
        if (next) {
          setView(next.chapter === 'tarsk' || !hasShip ? 'tarsk' : 'kessel')
          setSelected(next.id)
        }
      },
    })
  }, [telling, launching, storySeen, tableWins, markStory, hasShip, bix])

  const practise = () => {
    unlockAudio()
    startTutorial()
    go('table')
  }

  const sit = (session: Session) => {
    const at = session.table!
    const start = () => prepare({ pool: career.unlockedTokens, session })
    // The night of the stake game starts with the ride to the landing field.
    if (session.kind === 'stake') return storySeen.includes('ride') ? start() : setTelling({ scene: SCENES.ride, done: start })
    // Whoever holds the table has a word to say before the first game there.
    if (session.kind !== 'table' || session.legend || storySeen.includes(`intro-${at.id}`)) return start()
    setTelling({
      scene: SCENES[`intro-${at.id}`],
      // Pim offers a practice hand before the very first game.
      done: (choice) => (choice?.effects?.some((e) => 'flag' in e && e.flag === 'practice') ? practise() : start()),
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
            {hasShip && (
              <div className={s.segments} role="radiogroup" aria-label={tx`Karte`}>
                <button role="radio" aria-checked={view === 'tarsk'} className={cx(s.segment, view === 'tarsk' && s.segmentOn)} onClick={() => openMap('tarsk')}>
                  {tx`Tarsk`}
                </button>
                <button role="radio" aria-checked={view === 'kessel'} className={cx(s.segment, view === 'kessel' && s.segmentOn)} onClick={() => openMap('kessel')}>
                  {tx`Kessel-Sektor`}
                </button>
              </div>
            )}
            <div className={cx(common.plate, s.starFrame, view === 'tarsk' && s.planetFrame)}>
              <StarMap map={map} tables={onMap} standing={standing} selected={table.id} onSelect={(t) => setSelected(t.id)} ship={hasShip} onOpen={openMap} />
            </div>
          </div>
          {table === FIELD ? <StakeCard key="field" onSit={sit} /> : <TableCard key={`${table.id}-${legend}`} table={table} onSit={sit} />}
        </div>
      </div>

      <AnimatePresence>
        {telling && (
          <Scene
            key={telling.scene.id}
            scene={telling.scene}
            onDone={(choice?: Choice) => {
              finishScene(telling.scene, choice)
              // A sequence may follow the scene; then an answer may lead on to the next scene; otherwise whatever waited for this one goes ahead.
              if (telling.scene.cinematic === 'launch') setLaunching(true)
              const next = choice?.next ?? telling.scene.next
              if (next) setTelling({ scene: SCENES[next], done: telling.done })
              else {
                setTelling(null)
                telling.done?.(choice)
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {launching && (
          <Launch
            onDone={() => {
              markStory('launch')
              setLaunching(false)
              openMap('kessel')
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
