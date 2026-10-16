import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { CHARACTERS } from '../../ai/personalities'
import type { Character } from '../../ai/personalities'
import { debtLeft, instalmentDue, INSTALMENTS, sectorPlace } from '../../career/debt'
import { JOBS } from '../../career/jobs'
import type { Job } from '../../career/jobs'
import { MAPS } from '../../career/maps'
import { CUSTOMS_CHIPS, customsFine, HEAT_CHECK } from '../../career/heat'
import { banquetMissing, endingOpen, finalSeats, HUNTERS, KEY_HOLDERS, keysHeld, patronOf, residenceMissing, secondInstalmentDue, thirdInstalmentDue } from '../../career/route'
import { standingEffects, standingName, SYNDICATE, SYNDICATES } from '../../career/syndicates'
import type { Syndicate } from '../../career/syndicates'
import { SCENES } from '../../career/story'
import type { Choice, Scene as SceneDef } from '../../career/story'
import { duelBuyIn, duelPayout, FIELD, payoutFor, tableById, TABLES } from '../../career/tables'
import type { TableDef } from '../../career/tables'
import { TOKEN_TEXT } from '../../i18n/texts'
import { runnerUpRefund, useCareer } from '../../store/career'
import type { Session } from '../../store/game'
import { useGame } from '../../store/game'
import { useShift } from '../../store/shift'
import { useSpike } from '../../store/spike'
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

/**
 * Legend mode: everybody plays their best, you start a chip short – for twice the money.
 * A syndicate's standing changes the price, and one that has turned hostile sends an enforcer.
 */
function tableSession(table: TableDef, legend: boolean, standing: Partial<Record<Syndicate, number>> = {}, flags: string[] = [], career?: ReturnType<typeof useCareer.getState>): Session {
  const effect = standingEffects(table.syndicate ? (standing[table.syndicate] ?? 0) : 0)
  // At the final table the story decides who sits there.
  const opponents = table.id === 'finaltable' && career ? finalSeats(career) : table.opponents
  const seats = opponents.map((id) => (legend ? duelist(CHARACTERS[id]) : CHARACTERS[id]))
  // An outlaw has a price on their head: in legend mode a hunter sits at every table.
  if (legend && flags.includes('ending-outlaw')) seats[seats.length - 1] = duelist(CHARACTERS[HUNTERS[TABLES.indexOf(table) % HUNTERS.length]])
  // Oshi's partner finds the doors of the Crown open, and the seats cheaper.
  const partner = table.chapter === 'station' && flags.includes('oshi-partner') ? 0.8 : 1
  if (effect.enforcer && table.syndicate) seats[0] = duelist(CHARACTERS[SYNDICATE[table.syndicate].enforcer])
  // Once Oshi has sold the debt, the Red Seal's man sits in on the route's open tables.
  if (CREDITOR_TABLES.includes(table.id) && flags.includes('oshi-refused') && !seats.some((c) => c.id === 'dray')) seats[0] = CHARACTERS.dray
  return {
    ...variantOf(table),
    mode: 'career',
    kind: 'table',
    table,
    legend,
    title: table.name,
    venue: table.id,
    rules: table.rules,
    buyIn: Math.round(table.buyIn * (legend ? 2 : 1) * effect.buyIn * partner),
    payout: Math.round(payoutFor(table) * (legend ? 2 : 1) * effect.payout),
    seats: [null, ...seats],
    startingChips: table.chips,
    playerChips: legend ? table.chips - 1 : undefined,
  }
}

/** Tables where the creditor sits in once the debt has been sold. */
const CREDITOR_TABLES = ['convoy', 'barge']

/** What a table's variant adds to a session. */
function variantOf(table: TableDef): Pick<Session, 'variant' | 'spikeRules' | 'shiftRules'> {
  if (table.variant === 'spike') return { variant: 'spike', spikeRules: table.spikeRules }
  if (table.variant === 'shift') return { variant: 'shift', shiftRules: table.shiftRules }
  return {}
}

/** The quick hand at a customs check: a short game of Coruscant Shift against the officer on duty. */
function customsSession(): Session {
  return {
    variant: 'shift',
    mode: 'career',
    kind: 'customs',
    table: null,
    title: tx`Zollkontrolle`,
    venue: 'customs',
    buyIn: 0,
    payout: 0,
    seats: [null, duelist(CHARACTERS.hask)],
    startingChips: CUSTOMS_CHIPS,
  }
}

function duelSession(table: TableDef): Session {
  return {
    ...variantOf(table),
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
const ROUTE: TableDef[] = [...TABLES.filter((t) => t.chapter === 'tarsk'), FIELD, ...TABLES.filter((t) => t.chapter !== 'tarsk')]

type View = 'tarsk' | 'kessel' | 'trade' | 'core' | 'station'

/** Which chart a table is on. */
const viewOf = (table: TableDef): View => table.chapter

/** Why a table cannot be played yet. */
function lockedBecause(table: TableDef, career: ReturnType<typeof useCareer.getState>): string {
  if (table.chapter !== 'tarsk' && !career.hasShip) return tx`Erst ein Schiff gewinnen`
  if (table.chapter === 'trade' && !career.tableWins.crown) return tx`Erst die Kessel-Krone gewinnen`
  if (table.chapter === 'core' && !career.tableWins.banquet) return tx`Erst das Bankett gewinnen`
  if (table.chapter === 'station' && !career.tableWins.residence) return tx`Erst die Residenz gewinnen`
  const before = ROUTE[ROUTE.indexOf(table) - 1]
  if (table.id === 'banquet' && career.tableWins[before.id]) return tx`Es fehlt: ${banquetMissing(career).join(', ')}`
  if (table.id === 'residence' && career.tableWins[before.id]) return tx`Es fehlt: ${residenceMissing(career).join(', ')}`
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
        {won ? tx`Die Sandläufer gehört dir` : !unlocked ? lockedBecause(FIELD, career) : tx`Zum Landefeld`}
      </button>
    </motion.article>
  )
}

/** A job from the board that is played as a duel of its own. */
function jobDuel(job: Job, table: TableDef): Session {
  const goal = job.goal as Extract<Job['goal'], { kind: 'duel' }>
  return {
    ...variantOf(table),
    mode: 'career',
    kind: 'job',
    job: job.id,
    table,
    title: job.title,
    venue: table.id,
    rules: table.rules,
    buyIn: goal.buyIn,
    payout: 0,
    seats: [null, duelist(CHARACTERS[goal.against])],
    startingChips: table.chips,
  }
}

/** The jobs on a table's board that are still open. */
function Board({ table, taken, onTake, onSit, onPay }: { table: TableDef; taken: string | null; onTake(id: string | null): void; onSit(session: Session): void; onPay(job: Job): void }) {
  const career = useCareer()
  const held = keysHeld(career.storySeen)
  const open = JOBS.filter(
    (job) =>
      job.table === table.id &&
      !career.jobsDone.includes(job.id) &&
      (!job.requires || career.storySeen.includes(job.requires)) &&
      // a key already held is not for sale any more
      (!job.reward.key || !held.includes(job.reward.key)),
  )
  if (!career.hasShip || career.legend || open.length === 0) return null
  return (
    <div className={s.board}>
      <h3 className={s.fieldLabel}>{tx`Aufträge`}</h3>
      {open.map((job) => {
        const goal = job.goal
        return (
          <div key={job.id} className={cx(s.job, taken === job.id && s.jobTaken)}>
            <div>
              <b>{job.title}</b>
              <em>{job.text}</em>
              <span className={s.jobReward}>
                {job.reward.credits > 0 && <span className="num">+{job.reward.credits}</span>}
                {job.reward.standing && <span>{tx`Ansehen: ${SYNDICATE[job.reward.standing].name}`}</span>}
              </span>
            </div>
            {goal.kind === 'pay' ? (
              <button className={common.btn} disabled={career.credits < goal.amount} onClick={() => onPay(job)}>
                <span className="num">{goal.amount}</span>
              </button>
            ) : goal.kind === 'duel' ? (
              <button className={common.btn} disabled={career.credits < goal.buyIn + career.tripCost(table.id)} onClick={() => onSit(jobDuel(job, table))}>
                <span className="num">{goal.buyIn}</span>
              </button>
            ) : (
              <button className={cx(common.btn, taken === job.id && common.btnPrimary)} aria-pressed={taken === job.id} onClick={() => onTake(taken === job.id ? null : job.id)}>
                {taken === job.id ? tx`Angenommen` : tx`Annehmen`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TableCard({ table, onSit, onPay }: { table: TableDef; onSit(session: Session): void; onPay(job: Job): void }) {
  const career = useCareer()
  const legend = career.legend
  // legend mode replays the tables already won
  const unlocked = legend ? !!career.tableWins[table.id] : career.isUnlocked(table)
  const wins = (legend ? career.legendWins : career.tableWins)[table.id] ?? 0
  const session = tableSession(table, legend, career.standing, career.storySeen, career)
  const [taken, setTaken] = useState<string | null>(null)
  const fuel = career.tripCost(table.id)
  const due = instalmentDue(career.debt)
  const standing = table.syndicate ? (career.standing[table.syndicate] ?? 0) : null
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

      {table.syndicate && career.hasShip && (
        <p className={s.tableSyndicate}>
          {SYNDICATE[table.syndicate].name} · {standingName(standing!)}
          {standingEffects(standing!).enforcer && <b>{tx` · schickt einen Vollstrecker`}</b>}
        </p>
      )}

      <div className={s.tableOpponents}>
        {session.seats.slice(1).map((c) => (
          <span key={c!.id} className={s.opponentChip}>
            <Portrait character={c} size={44} frame />
            <span>
              <b>{c!.name}</b>
              <em>{c!.title}</em>
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

      <Board table={table} taken={taken} onTake={setTaken} onSit={onSit} onPay={onPay} />

      <button
        className={cx(common.btn, unlocked && career.credits >= session.buyIn! + fuel && common.btnPrimary, common.btnBlock)}
        disabled={!unlocked || career.credits < session.buyIn! + fuel}
        onClick={() => onSit({ ...session, job: taken ?? undefined })}
      >
        {!unlocked
          ? table.id === 'crown' && career.hasShip && due > 0 && career.isUnlocked(TABLES[TABLES.indexOf(table) - 1]) && career.tableWins[TABLES[TABLES.indexOf(table) - 1].id]
            ? tx`Erst Oshis Rate zahlen (fehlen ${due})`
            : lockedBecause(table, career)
          : career.credits < session.buyIn! + fuel
            ? tx`${session.buyIn! + fuel - career.credits} Credits fehlen`
            : fuel > 0
              ? tx`Platz nehmen · Sprung ${fuel}`
              : tx`Platz nehmen`}
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

/** Oshi's note and how the syndicates see the player: shown once the ship is won. */
/** What is due now: the first instalment before the Crown, the second before the banquet. */
function dueNow(career: ReturnType<typeof useCareer.getState>): number {
  if (!career.tableWins.crown) return instalmentDue(career.debt)
  if (!career.tableWins.banquet) return secondInstalmentDue(career.debt, career.storySeen)
  return career.tableWins.residence ? 0 : thirdInstalmentDue(career.debt, career.storySeen)
}

function Ledger({ onPay }: { onPay(): void }) {
  const career = useCareer()
  if (!career.hasShip) return null
  const due = dueNow(career)
  const act2 = !!career.tableWins.crown
  const act3 = !!career.tableWins.banquet
  const stolen = career.storySeen.includes('ledger-stolen')
  const held = keysHeld(career.storySeen)
  const patron = patronOf(career.storySeen)
  // whoever holds the note now: Oshi, or the Red Seal she sold it to
  const holder = career.storySeen.includes('oshi-refused') && act2 ? tx`Schuldschein beim Roten Siegel` : tx`Oshis Schuldschein`
  return (
    <div className={cx(common.plate, s.ledger)}>
      <div className={s.ledgerDebt}>
        <div>
          <span className={s.fieldLabel}>{holder}</span>
          <b className="num">{stolen ? 0 : debtLeft(career.debt)}</b>
          <em>
            {stolen
              ? tx`Das Schuldbuch liegt in deinem Frachtraum. Keine Schuld mehr – nur eine wütende Oshi.`
              : act3
                ? due > 0
                  ? tx`Dritte Rate bis zur Residenz: noch ${due}`
                  : tx`Die Schuld ist bezahlt. Bis auf den letzten Credit.`
                : !act2
              ? due > 0
                ? tx`Erste Rate bis zur Kessel-Krone: noch ${due} von ${INSTALMENTS[0] + career.debt.extra}`
                : tx`Die erste Rate ist bezahlt.`
              : due > 0
                ? tx`Zweite Rate bis zum Bankett: noch ${due}`
                : career.tableWins.banquet
                  ? tx`Die zweite Rate ist bezahlt. Die dritte wartet im Kern.`
                  : tx`Die zweite Rate ist bezahlt.`}
          </em>
        </div>
        {due > 0 && (
          <button className={common.btn} disabled={career.credits === 0} onClick={onPay}>
            {tx`Einzahlen`}
          </button>
        )}
      </div>
      {act3 && (
        <div className={s.ledgerHeat} aria-label={tx`Aufmerksamkeit der Garnison: ${career.heat} von 100`}>
          <span className={s.fieldLabel}>{tx`Garnison`}</span>
          <i className={cx(career.heat >= HEAT_CHECK && s.heatHot)}>
            <b style={{ width: `${career.heat}%` }} />
          </i>
          <em>{career.heat >= HEAT_CHECK ? tx`Kontrollen an jedem Sprungpunkt` : career.heat > 0 ? tx`Man kennt dein Gesicht` : tx`Unauffällig`}</em>
        </div>
      )}
      {act2 && !act3 && (
        <div className={s.ledgerKeys} aria-label={tx`Schlüssel zu den Navdaten`}>
          <span className={s.fieldLabel}>{tx`Schlüssel`}</span>
          {KEY_HOLDERS.map((id) => (
            <span key={id} className={cx(s.key, held.includes(id) && s.keyHeld)} title={held.includes(id) ? tx`vorhanden` : tx`fehlt`}>
              <Icon name={held.includes(id) ? 'check' : 'lock'} size={12} />
              {SYNDICATE[id].name}
              {patron === id && <em>{tx` · Schutzherr`}</em>}
            </span>
          ))}
        </div>
      )}
      <div className={s.ledgerStanding}>
        {SYNDICATES.map((id) => {
          const level = career.standing[id] ?? 0
          return (
            <span key={id} className={cx(s.standing, level < 0 && s.standingLow, level > 0 && s.standingHigh)} title={SYNDICATE[id].trade}>
              <b>{SYNDICATE[id].name}</b>
              <em>{standingName(level)}</em>
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Paying towards the instalment: a few round sums, or all that is still due. */
function PaySheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const career = useCareer()
  const due = dueNow(career)
  const sold = career.storySeen.includes('oshi-refused') && !!career.tableWins.crown
  const sums = [...new Set([500, 1000, 2500].filter((n) => n < due).concat(due))].filter((n) => n > 0)
  return (
    <Sheet open={open} onClose={onClose} dialog>
      <h2 className={common.sheetTitle}>{sold ? tx`An das Rote Siegel zahlen` : tx`An Oshi zahlen`}</h2>
      <p className={common.sheetText}>
        {career.tableWins.crown ? tx`Noch ${due} Credits bis zur zweiten Rate. Du hast ${career.credits}.` : tx`Noch ${due} Credits bis zur ersten Rate. Du hast ${career.credits}.`}
      </p>
      <div className={s.paySums}>
        {sums.map((sum) => (
          <button
            key={sum}
            className={cx(common.btn, sum === due && common.btnPrimary)}
            disabled={career.credits < sum}
            onClick={() => {
              career.payDebt(sum)
              onClose()
            }}
          >
            {sum === due ? tx`Alles: ${sum}` : <span className="num">{sum}</span>}
          </button>
        ))}
      </div>
      <div className={common.sheetActions}>
        <button className={cx(common.btn, common.btnGhost)} onClick={onClose}>
          {tx`Später`}
        </button>
      </div>
    </Sheet>
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
  const startSpikeTutorial = useSpike((g) => g.startTutorial)
  const startShiftTutorial = useShift((g) => g.startTutorial)
  const startShift = useShift((g) => g.start)
  const [customs, setCustoms] = useState<Session | null>(null)
  const career = useCareer()
  const [bailedOut, setBailedOut] = useState(0)
  const [telling, setTelling] = useState<Telling | null>(null)
  const [launching, setLaunching] = useState(false)
  const [paying, setPaying] = useState(false)
  const { legend, storySeen, tableWins, markStory, finishScene, hasShip, bix } = career
  // On Tarsk until there is a ship; then out in the sector, with Tarsk a tap away; after the Crown on the trade route.
  const [view, setView] = useState<View>(
    !hasShip
      ? 'tarsk'
      : tableWins.residence && storySeen.includes('win-residence')
        ? 'station'
        : tableWins.banquet && storySeen.includes('win-banquet')
          ? 'core'
          : tableWins.crown && storySeen.includes('win-crown')
            ? 'trade'
            : 'kessel',
  )
  // which charts can be opened: Tarsk always, the sector with the ship, the route once the jump lock is gone, the core after the banquet
  const canOpen = (id: string) => id === 'tarsk' || (id === 'kessel' && hasShip) || (id === 'trade' && !!tableWins.crown) || (id === 'core' && !!tableWins.banquet) || (id === 'station' && !!tableWins.residence)
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
    const next = id as View
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
    // The first look at the trade route: the long jump, Oshi's answer, and Mira's confession.
    if (view === 'trade' && !storySeen.includes('mira-confession')) return setTelling({ scene: SCENES[storySeen.includes('oshi-courier') ? 'trade-arrival-courier' : 'trade-arrival-sold'] })
    // Coruscant, the first time: the garrison, Orrin, and a word about the ledger.
    if (view === 'core' && !storySeen.includes('core-arrival')) return setTelling({ scene: SCENES['core-arrival'] })
    // The Crown, the first time: the station wakes, and the tournament is agreed.
    if (view === 'station' && !storySeen.includes('station-arrival')) return setTelling({ scene: SCENES['station-arrival'] })
    // The crystal Bix brought back from the gala.
    if (storySeen.includes('ledger-stolen') && !storySeen.includes('ledger-scene')) {
      markStory('ledger-scene')
      return setTelling({ scene: SCENES['ledger-stolen'] })
    }
    const untold = TABLES.filter((t) => tableWins[t.id] && !storySeen.includes(`win-${t.id}`))
    const latest = untold[untold.length - 1]
    if (!latest) return
    setView(viewOf(latest))
    setSelected(latest.id)
    setTelling({
      scene: SCENES[`win-${latest.id}`],
      done: () => {
        // Wins from before the story was told stay untold.
        for (const t of untold) markStory(`win-${t.id}`)
        const next = ROUTE[ROUTE.indexOf(latest) + 1]
        if (next) {
          setView(!hasShip ? 'tarsk' : viewOf(next))
          setSelected(next.id)
        }
      },
    })
  }, [telling, launching, storySeen, tableWins, markStory, hasShip, bix, view])

  // A job that only asks for credits; paying back Pim and Kessk has a scene of its own.
  const payJob = (job: Job) => {
    if (career.payJob(job) && job.id === 'repay') setTelling({ scene: SCENES.repaid })
  }

  const practise = () => {
    unlockAudio()
    startTutorial()
    go('table')
  }

  // Orrin's practice hand of Coruscant Shift, before the first game in the gambling hall.
  const practiseShift = () => {
    unlockAudio()
    startShiftTutorial('career')
    go('shift')
  }

  // Dessa's practice hand of Corellian Spike, before the first game in the canteen.
  const practiseSpike = () => {
    unlockAudio()
    startSpikeTutorial()
    go('spike')
  }

  const sit = (session: Session) => {
    const at = session.table!
    // In the core a warm ship is stopped at the jump point first.
    if (at.chapter === 'core' && career.heat >= HEAT_CHECK && career.location !== at.id && !customs) return setCustoms(session)
    // Flying there costs fuel; on Tarsk the speeder is free.
    const start = () => {
      career.travel(at.id)
      prepare({ pool: career.unlockedTokens, session })
    }
    // The night of the stake game starts with the ride to the landing field.
    if (session.kind === 'stake') return storySeen.includes('ride') ? start() : setTelling({ scene: SCENES.ride, done: start })
    // Whoever holds the table has a word to say before the first game there.
    if (session.kind !== 'table' || session.legend || storySeen.includes(`intro-${at.id}`)) return start()
    const chose = (choice: Choice | undefined, flag: string) => !!choice?.effects?.some((e) => 'flag' in e && e.flag === flag)
    setTelling({
      scene: SCENES[`intro-${at.id}`],
      // Pim offers a practice hand before the very first game, Dessa before the first game of Corellian Spike.
      done: (choice) => {
        if (chose(choice, 'practice')) return practise()
        if (chose(choice, 'practice-spike')) return practiseSpike()
        if (chose(choice, 'practice-shift')) return practiseShift()
        if (useCareer.getState().storySeen.includes('shift-known') && at.id === 'level1') return setSelected('penthouse')
        // Whoever knows the game already goes straight on to the convoy.
        if (useCareer.getState().storySeen.includes('spike-known') && at.id === 'hallis1') return setSelected('convoy')
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
            {hasShip && (
              <div className={s.segments} role="radiogroup" aria-label={tx`Karte`}>
                <button role="radio" aria-checked={view === 'tarsk'} className={cx(s.segment, view === 'tarsk' && s.segmentOn)} onClick={() => openMap('tarsk')}>
                  {tx`Tarsk`}
                </button>
                <button role="radio" aria-checked={view === 'kessel'} className={cx(s.segment, view === 'kessel' && s.segmentOn)} onClick={() => openMap('kessel')}>
                  {tableWins.crown ? tx`Kessel` : tx`Kessel-Sektor`}
                </button>
                {!!tableWins.crown && (
                  <button role="radio" aria-checked={view === 'trade'} className={cx(s.segment, view === 'trade' && s.segmentOn)} onClick={() => openMap('trade')}>
                    {tableWins.banquet ? tx`Route` : tx`Handelsroute`}
                  </button>
                )}
                {!!tableWins.banquet && (
                  <button role="radio" aria-checked={view === 'core'} className={cx(s.segment, view === 'core' && s.segmentOn)} onClick={() => openMap('core')}>
                    {tx`Kern`}
                  </button>
                )}
                {!!tableWins.residence && (
                  <button role="radio" aria-checked={view === 'station'} className={cx(s.segment, view === 'station' && s.segmentOn)} onClick={() => openMap('station')}>
                    {tx`Krone`}
                  </button>
                )}
              </div>
            )}
            <div className={cx(common.plate, s.starFrame, view === 'tarsk' && s.planetFrame)}>
              <StarMap
                map={map}
                tables={onMap}
                standing={standing}
                selected={table.id}
                onSelect={(t) => setSelected(t.id)}
                ship={hasShip}
                onOpen={openMap}
                canOpen={canOpen}
                here={view === 'tarsk' ? career.location : sectorPlace(career.location)}
              />
            </div>
          </div>
          <div className={s.galaxySide}>
            <Ledger onPay={() => setPaying(true)} />
            {table === FIELD ? <StakeCard key="field" onSit={sit} /> : <TableCard key={`${table.id}-${legend}`} table={table} onSit={sit} onPay={payJob} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {telling && (
          <Scene
            key={telling.scene.id}
            scene={telling.scene}
            bix={bix}
            allows={(choice) => !choice.requires || endingOpen(choice.requires, career)}
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

      <PaySheet open={paying} onClose={() => setPaying(false)} />

      <Sheet open={customs !== null} onClose={() => setCustoms(null)} dialog>
        <h2 className={common.sheetTitle}>{tx`Zollkontrolle`}</h2>
        <p className={common.sheetText}>
          {tx`Am Sprungpunkt wartet ein Kutter der Garnison. Hauptmann Hask kennt dein Gesicht. Zahl die Strafe – oder spiel eine schnelle Hand gegen ihn: gewinnst du, vergisst er dich; verlierst du, kostet es 500.`}
        </p>
        <div className={common.sheetActions}>
          <button
            className={common.btn}
            disabled={career.credits < customsFine(career.heat)}
            onClick={() => {
              const next = customs!
              career.payCustoms(customsFine(career.heat))
              setCustoms(null)
              sit(next)
            }}
          >
            {tx`Zahlen · ${customsFine(career.heat)}`}
          </button>
          <button
            className={cx(common.btn, common.btnPrimary)}
            onClick={() => {
              setCustoms(null)
              unlockAudio()
              startShift(customsSession())
              go('shift')
            }}
          >
            {tx`Schnelle Hand`}
          </button>
        </div>
      </Sheet>

      <Sheet open={bailedOut > 0 && !telling} onClose={() => setBailedOut(0)} dialog>
        <h2 className={common.sheetTitle}>{hasShip ? tx`Oshi leiht nach` : tx`Aufs Haus`}</h2>
        <p className={common.sheetText}>
          {hasShip
            ? tx`Du bist blank. Brakk schiebt dir ${bailedOut} Credits über den Tisch – „Madame Oshi lässt grüßen“. Sie kommen auf deine nächste Rate.`
            : tx`Du bist blank. Der Wirt vom Rostigen Anker schiebt dir ${bailedOut} Credits über den Tresen – „aber das letzte Mal“. Sagt er jedes Mal.`}
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
