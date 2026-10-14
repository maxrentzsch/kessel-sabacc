import { unlockAudio } from '../../audio/sfx'
import type { Difficulty } from '../../ai/policy'
import { dailyReward, dailyStop, dayBefore, today, TOUR_ENTRY, TOUR_STAGES, TOUR_UNLOCK, tourPot, tourRuleCount, tourSeats, tourStop } from '../../career/tour'
import type { Stop } from '../../career/tour'
import { venueOf } from '../../career/venues'
import { TOKEN_TEXT } from '../../i18n/texts'
import { useCareer } from '../../store/career'
import { useGame } from '../../store/game'
import type { Session } from '../../store/game'
import { useNav } from '../../store/nav'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

function level(difficulty: Difficulty): string {
  return difficulty === 'hard' ? tx`spielt hart` : difficulty === 'medium' ? tx`solide` : tx`unerfahren`
}

/** Who sits at a made-up table and what is different about it. */
function StopCard({ stop }: { stop: Stop }) {
  return (
    <div className={s.stop}>
      <header>
        <b>{stop.title}</b>
        <em>{venueOf(stop.venue).place}</em>
      </header>
      <div className={s.tableOpponents}>
        {stop.opponents.map((c) => (
          <span key={c.id} className={s.opponentChip}>
            <Portrait character={c} size={44} frame />
            <span>
              <b>{c.name}</b>
              <em>{level(c.profile.difficulty)}</em>
            </span>
          </span>
        ))}
      </div>
      {stop.ruleTexts.map((text) => (
        <p key={text} className={s.houseRule}>
          <b>{tx`Hausregel`}</b>
          {text}
        </p>
      ))}
    </div>
  )
}

/** The whole way ahead: who waits at every stop and what the pot is worth after it. */
function Route({ wins, on }: { wins: number; on: boolean }) {
  const stages = Array.from({ length: TOUR_STAGES }, (_, i) => i + 1)
  const beyond = tourPot(TOUR_STAGES + 1) - tourPot(TOUR_STAGES)
  return (
    <section className={s.route}>
      <h2 className={s.routeHead}>
        <span className={s.fieldLabel}>{tx`Die Route`}</span>
        <span className={s.fieldLabel}>{tx`Topf`}</span>
      </h2>
      <ol>
        {stages.map((stage) => {
          const done = on && stage <= wins
          const here = on && stage === wins + 1
          const seats = tourSeats(stage)
          return (
            <li key={stage} className={cx(s.routeStop, done && s.routeDone, here && s.routeHere)}>
              <span className={cx(common.hexBadge, s.routeNo, 'num')}>{done ? <Icon name="check" size={16} /> : stage}</span>
              <span className={s.routeWho}>
                <b>{seats.length === 1 ? tx`Duell` : tx`${seats.length} Gegner`}</b>
                <em>
                  {seats.map(level).join(', ')} · {tourRuleCount(stage) === 1 ? tx`eine Hausregel` : tx`zwei Hausregeln`}
                </em>
              </span>
              <b className={cx(s.routePot, 'num')}>{tourPot(stage)}</b>
            </li>
          )
        })}
      </ol>
      <p className={s.routeMore}>{tx`Danach bringt jeder weitere Sieg ${beyond} Credits mehr.`}</p>
    </section>
  )
}

function stopSession(stop: Stop, kind: 'tour' | 'daily', seed?: number): Session {
  return {
    mode: 'career',
    kind,
    table: null,
    title: stop.title,
    venue: stop.venue,
    rules: stop.rules,
    seed,
    seats: [null, ...stop.opponents],
    startingChips: stop.chips,
  }
}

export function TourScreen() {
  const go = useNav((n) => n.go)
  const prepare = useNav((n) => n.prepare)
  const career = useCareer()
  const tablesWon = Object.values(career.tableWins).filter((n) => n > 0).length
  const open = tablesWon >= TOUR_UNLOCK
  const tour = career.tour
  const stop = tour ? tourStop(tour.seed, tour.wins + 1) : null

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Auf Tour`}</h1>
        <span className={common.credits}>{career.credits}</span>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.tour)}>
          <p className={s.lead}>
            {tx`Ein Tisch nach dem anderen, jeder mit eigenen Regeln und härteren Gegnern. Mit jedem Sieg wächst der Topf – wer verliert, verliert ihn ganz. Aussteigen kannst du nach jedem Sieg.`}
          </p>

          <dl className={s.tableFacts}>
            <div>
              <dt>{tx`Topf`}</dt>
              <dd className="num">{tour ? tourPot(tour.wins) : 0}</dd>
            </div>
            <div>
              <dt>{tx`Nächster Sieg`}</dt>
              <dd className="num">{tourPot((tour?.wins ?? 0) + 1)}</dd>
            </div>
            <div>
              <dt>{tx`Rekord`}</dt>
              <dd className="num">{career.tourBest}</dd>
            </div>
          </dl>

          {!open && (
            <p className={s.locked}>
              <Icon name="lock" size={16} />{tx` Gewinne erst an `}{TOUR_UNLOCK}{tx` Karrieretischen (`}{tablesWon}/{TOUR_UNLOCK}).
            </p>
          )}

          {open && !tour && (
            <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} disabled={career.credits < TOUR_ENTRY} onClick={() => career.startTour()}>
              {tx`Tour starten · `}{TOUR_ENTRY}{tx` Credits`}
            </button>
          )}

          {tour && stop && (
            <>
              <StopCard stop={stop} />
              <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} onClick={() => prepare({ pool: career.unlockedTokens, session: stopSession(stop, 'tour') })}>
                {tx`Platz nehmen`}
              </button>
              <button className={cx(common.btn, common.btnBlock)} onClick={() => career.cashOut()}>
                {tour.wins > 0 ? tx`Aussteigen · ${tourPot(tour.wins)} Credits kassieren` : tx`Tour abbrechen (Einsatz verfällt)`}
              </button>
            </>
          )}

          <Route wins={tour?.wins ?? 0} on={!!tour} />
        </div>
      </div>
    </div>
  )
}

export function DailyScreen() {
  const go = useNav((n) => n.go)
  const career = useCareer()
  const start = useGame((g) => g.start)
  const date = today()
  const daily = dailyStop(date)
  const played = career.daily?.date === date
  const won = played && career.daily!.won
  // The streak counts days at the table in a row; it only survives if yesterday was one of them.
  const streak = played ? career.dailyStreak : career.daily?.date === dayBefore(date) ? career.dailyStreak + 1 : 1

  const play = () => {
    unlockAudio()
    start(stopSession(daily, 'daily', daily.seed), daily.tokens)
    go('table')
  }

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Tageshand`}</h1>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.tour)}>
          <p className={s.lead}>{tx`Jeden Tag ein Tisch: dieselben Gegner, dieselben Karten und dieselben Tokens für alle. Ein Versuch – wer aufsteht, hat verloren. Jeder Tag in Folge am Tisch erhöht die Belohnung für einen Sieg.`}</p>

          <dl className={s.tableFacts}>
            <div>
              <dt>{tx`Serie`}</dt>
              <dd className="num">{played ? streak : streak - 1}</dd>
            </div>
            <div>
              <dt>{tx`Heute`}</dt>
              <dd className="num">{dailyReward(streak)}</dd>
            </div>
            <div>
              <dt>{tx`Rekord`}</dt>
              <dd className="num">{career.dailyBest}</dd>
            </div>
          </dl>

          <div className={s.streak}>
            <span className={s.fieldLabel}>{tx`Belohnung nach Tagen in Folge`}</span>
            <ol>
              {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => (
                <li key={day} className={cx(day <= (played ? streak : streak - 1) && s.streakDone, !played && day === Math.min(streak, 7) && s.streakToday)}>
                  <small>{tx`Tag ${day}`}</small>
                  <b className="num">{dailyReward(day)}</b>
                </li>
              ))}
            </ol>
          </div>

          <StopCard stop={daily} />

          <div className={s.dailyTokens}>
            <span className={s.fieldLabel}>{tx`Deine Tokens heute`}</span>
            {daily.tokens.map((token) => (
              <span key={token} className={s.rewardToken} title={TOKEN_TEXT[token].long}>
                <TokenIcon token={token} size={15} /> {TOKEN_TEXT[token].name}
              </span>
            ))}
          </div>

          {played ? (
            <p className={cx(s.locked, won && s.dailyWon)}>
              <Icon name={won ? 'check' : 'lock'} size={16} /> {won ? tx`Heute gewonnen. Morgen wartet eine neue Hand.` : tx`Heute schon gespielt. Morgen wartet eine neue Hand.`}
            </p>
          ) : (
            <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} onClick={play}>
              {tx`Platz nehmen`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
