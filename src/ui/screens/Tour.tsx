import { unlockAudio } from '../../audio/sfx'
import { dailyReward, dailyStop, dayBefore, today, TOUR_ENTRY, TOUR_UNLOCK, tourPot, tourStop } from '../../career/tour'
import type { Stop } from '../../career/tour'
import { venueOf } from '../../career/venues'
import { TOKEN_TEXT } from '../../i18n/de'
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
              <em>{c.profile.difficulty === 'hard' ? 'spielt hart' : c.profile.difficulty === 'medium' ? 'solide' : 'unerfahren'}</em>
            </span>
          </span>
        ))}
      </div>
      {stop.ruleTexts.map((text) => (
        <p key={text} className={s.houseRule}>
          <b>Hausregel</b>
          {text}
        </p>
      ))}
    </div>
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
        <button className={common.iconBtn} onClick={() => go('home')} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>Auf Tour</h1>
        <span className={common.credits}>{career.credits}</span>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.tour)}>
          <p className={s.lead}>
            Ein Tisch nach dem anderen, jeder mit eigenen Regeln und härteren Gegnern. Mit jedem Sieg wächst der Topf – wer verliert, verliert ihn ganz. Aussteigen kannst du nach jedem
            Sieg.
          </p>

          <dl className={s.tableFacts}>
            <div>
              <dt>Topf</dt>
              <dd className="num">{tour ? tourPot(tour.wins) : 0}</dd>
            </div>
            <div>
              <dt>Nächster Sieg</dt>
              <dd className="num">{tourPot((tour?.wins ?? 0) + 1)}</dd>
            </div>
            <div>
              <dt>Rekord</dt>
              <dd className="num">{career.tourBest}</dd>
            </div>
          </dl>

          {!open && (
            <p className={s.locked}>
              <Icon name="lock" size={16} /> Gewinne erst an {TOUR_UNLOCK} Karrieretischen ({tablesWon}/{TOUR_UNLOCK}).
            </p>
          )}

          {open && !tour && (
            <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} disabled={career.credits < TOUR_ENTRY} onClick={() => career.startTour()}>
              Tour starten · {TOUR_ENTRY} Credits
            </button>
          )}

          {tour && stop && (
            <>
              <StopCard stop={stop} />
              <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} onClick={() => prepare({ pool: career.unlockedTokens, session: stopSession(stop, 'tour') })}>
                Platz nehmen
              </button>
              <button className={cx(common.btn, common.btnBlock)} onClick={() => career.cashOut()}>
                {tour.wins > 0 ? `Aussteigen · ${tourPot(tour.wins)} Credits kassieren` : 'Tour abbrechen (Einsatz verfällt)'}
              </button>
            </>
          )}
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
        <button className={common.iconBtn} onClick={() => go('home')} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>Tageshand</h1>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.tour)}>
          <p className={s.lead}>Jeden Tag ein Tisch: dieselben Gegner, dieselben Karten und dieselben Tokens für alle. Ein Versuch – wer aufsteht, hat verloren. Jeder Tag in Folge am Tisch erhöht die Belohnung für einen Sieg.</p>

          <dl className={s.tableFacts}>
            <div>
              <dt>Serie</dt>
              <dd className="num">{played ? streak : streak - 1}</dd>
            </div>
            <div>
              <dt>Heute</dt>
              <dd className="num">{dailyReward(streak)}</dd>
            </div>
            <div>
              <dt>Rekord</dt>
              <dd className="num">{career.dailyBest}</dd>
            </div>
          </dl>

          <StopCard stop={daily} />

          <div className={s.dailyTokens}>
            <span className={s.fieldLabel}>Deine Tokens heute</span>
            {daily.tokens.map((token) => (
              <span key={token} className={s.rewardToken} title={TOKEN_TEXT[token].long}>
                <TokenIcon token={token} size={15} /> {TOKEN_TEXT[token].name}
              </span>
            ))}
          </div>

          {played ? (
            <p className={cx(s.locked, won && s.dailyWon)}>
              <Icon name={won ? 'check' : 'lock'} size={16} /> {won ? 'Heute gewonnen. Morgen wartet eine neue Hand.' : 'Heute schon gespielt. Morgen wartet eine neue Hand.'}
            </p>
          ) : (
            <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} onClick={play}>
              Platz nehmen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
