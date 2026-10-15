import { useState } from 'react'
import { CHARACTERS } from '../../ai/personalities'
import type { Character } from '../../ai/personalities'
import type { Difficulty } from '../../ai/policy'
import { randomVenueId } from '../../career/venues'
import { TOKEN_IDS } from '../../engine'
import type { TokenId } from '../../engine'
import { unlockAudio } from '../../audio/sfx'
import { useGame } from '../../store/game'
import { useNav } from '../../store/nav'
import { useSpike } from '../../store/spike'
import { Icon } from '../art/Icons'
import common from '../common/common.module.css'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

const DIFFICULTIES: { id: Difficulty; name: string; text: string }[] = [
  { id: 'easy', name: tx`Leicht`, text: tx`Zieht nach Gefühl und verschenkt Tokens.` },
  { id: 'medium', name: tx`Mittel`, text: tx`Rechnet mit, macht aber Fehler.` },
  { id: 'hard', name: tx`Schwer`, text: tx`Zählt Karten und setzt Tokens gezielt.` },
]

/** Random opponents of the wanted strength, topped up with the next tier if needed. */
function pickOpponents(count: number, difficulty: Difficulty): Character[] {
  const shuffled = Object.values(CHARACTERS).sort(() => Math.random() - 0.5)
  const fits = shuffled.filter((c) => c.profile.difficulty === difficulty)
  const rest = shuffled.filter((c) => c.profile.difficulty !== difficulty)
  return [...fits, ...rest].slice(0, count).map((c) => ({ ...c, profile: { ...c.profile, difficulty } }))
}

function Segments<T extends string | number>({ value, options, onChange }: { value: T; options: { id: T; name: string }[]; onChange(v: T): void }) {
  return (
    <div className={s.segments} role="radiogroup">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={o.id === value} className={cx(s.segment, o.id === value && s.segmentOn)} onClick={() => onChange(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  )
}

/** Three different shift tokens, drawn at random for a person at a game passed round. */
function dealTokens(): TokenId[] {
  return [...TOKEN_IDS].sort(() => Math.random() - 0.5).slice(0, 3)
}

/** At most four at the table, and never fewer than two. */
const MAX_SEATS = 4

type Variant = 'kessel' | 'spike'

/** What the strengths mean in a game without shift tokens. */
const SPIKE_DIFFICULTY: Record<Difficulty, string> = {
  easy: tx`Spielt nach Gefühl und setzt planlos.`,
  medium: tx`Rechnet mit, verschätzt sich aber.`,
  hard: tx`Zählt Karten und setzt nach seinen Chancen.`,
}

export function FreePlayScreen() {
  const go = useNav((n) => n.go)
  const prepare = useNav((n) => n.prepare)
  const startSpike = useSpike((g) => g.start)
  const [variant, setVariant] = useState<Variant>('kessel')
  const [count, setCount] = useState(2)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [chips, setChips] = useState(6)
  const [spikeChips, setSpikeChips] = useState(20)
  const [people, setPeople] = useState(1)
  const [names, setNames] = useState<string[]>(['', '', '', ''])
  const startGame = useGame((g) => g.start)
  const together = variant === 'kessel' && people > 1
  const fewest = together ? 0 : 1
  const most = MAX_SEATS - (together ? people : 1)
  const opponents = Math.min(most, Math.max(fewest, count))
  const nameOf = (i: number) => names[i].trim() || tx`Spieler ${i + 1}`

  const playSpike = () => {
    unlockAudio()
    startSpike({
      variant: 'spike',
      mode: 'free',
      table: null,
      title: 'Corellian Spike',
      venue: randomVenueId(),
      seats: [null, ...pickOpponents(opponents, difficulty)],
      startingChips: spikeChips,
    })
    go('spike')
  }

  // Several people at one device: everybody gets three tokens at random, and off it goes.
  const startTogether = () => {
    unlockAudio()
    startGame(
      {
        mode: 'free',
        table: null,
        title: tx`Runde am Gerät`,
        venue: randomVenueId(),
        seats: [...Array.from({ length: people }, () => null), ...pickOpponents(opponents, difficulty)],
        people: Array.from({ length: people }, (_, seat) => ({ seat, name: nameOf(seat), tokens: dealTokens() })),
        startingChips: chips,
      },
      [],
    )
    go('table')
  }

  const start = () =>
    prepare({
      pool: [...TOKEN_IDS],
      session: {
        mode: 'free',
        table: null,
        title: tx`Freies Spiel`,
        venue: randomVenueId(),
        seats: [null, ...pickOpponents(opponents, difficulty)],
        startingChips: chips,
      },
    })

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Freies Spiel`}</h1>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.form)}>
          <section className={s.field}>
            <h2 className={s.fieldLabel}>{tx`Spielart`}</h2>
            <Segments<Variant>
              value={variant}
              onChange={setVariant}
              options={[
                { id: 'kessel', name: 'Kessel Sabacc' },
                { id: 'spike', name: 'Corellian Spike' },
              ]}
            />
            <p className={s.fieldNote}>
              {variant === 'kessel'
                ? tx`Zwei Karten, drei Runden, Shift-Tokens. Das Spiel der Karriere.`
                : tx`Die Karten sollen zusammen null ergeben. Mit Setzrunden, zwei Töpfen und den Spike-Würfeln.`}
            </p>
          </section>
          {variant === 'kessel' && (
            <section className={s.field}>
              <h2 className={s.fieldLabel}>{tx`Spieler an diesem Gerät`}</h2>
              <Segments<number> value={people} onChange={setPeople} options={[1, 2, 3, 4].map((n) => ({ id: n, name: String(n) }))} />
              {together && (
                <>
                  <div className={s.nameGrid}>
                    {Array.from({ length: people }, (_, i) => (
                      <input
                        key={i}
                        className={s.nameInput}
                        value={names[i]}
                        maxLength={14}
                        placeholder={tx`Spieler ${i + 1}`}
                        aria-label={tx`Name von Spieler ${i + 1}`}
                        onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                      />
                    ))}
                  </div>
                  <p className={s.fieldNote}>
                    {tx`Ihr gebt das Gerät nach jedem Zug weiter; dazwischen bleibt der Tisch verdeckt. Jeder bekommt drei zufällige Shift-Tokens, Spähen gibt es hier nicht, und die Karriere bleibt unberührt.`}
                  </p>
                </>
              )}
            </section>
          )}
          <section className={s.field}>
            <h2 className={s.fieldLabel}>{together ? tx`Gegner der KI` : tx`Gegner`}</h2>
            <Segments<number>
              value={opponents}
              onChange={setCount}
              options={Array.from({ length: most - fewest + 1 }, (_, i) => fewest + i).map((n) => ({ id: n, name: String(n) }))}
            />
          </section>
          <section className={s.field}>
            <h2 className={s.fieldLabel}>{tx`Schwierigkeit`}</h2>
            <Segments<Difficulty> value={difficulty} onChange={setDifficulty} options={DIFFICULTIES} />
            <p className={s.fieldNote}>{variant === 'kessel' ? DIFFICULTIES.find((d) => d.id === difficulty)!.text : SPIKE_DIFFICULTY[difficulty]}</p>
          </section>
          {variant === 'kessel' ? (
            <>
              <section className={s.field}>
                <h2 className={s.fieldLabel}>{tx`Chips pro Spieler`}</h2>
                <Segments<number> value={chips} onChange={setChips} options={[4, 5, 6, 7, 8].map((n) => ({ id: n, name: String(n) }))} />
                <p className={s.fieldNote}>{together ? tx`Weniger Chips, kürzere Partie.` : tx`Weniger Chips, kürzere Partie. Alle 16 Shift-Tokens stehen zur Wahl.`}</p>
              </section>
              <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} onClick={together ? startTogether : start}>
                {together ? tx`Spiel starten` : tx`Tokens wählen`}
              </button>
            </>
          ) : (
            <>
              <section className={s.field}>
                <h2 className={s.fieldLabel}>{tx`Chips pro Spieler`}</h2>
                <Segments<number> value={spikeChips} onChange={setSpikeChips} options={[10, 20, 30].map((n) => ({ id: n, name: String(n) }))} />
                <p className={s.fieldNote}>{tx`Der Grundeinsatz steigt alle vier Hände, damit eine Partie ein Ende findet.`}</p>
              </section>
              <button className={cx(common.btn, common.btnPrimary, common.btnBlock)} onClick={playSpike}>
                {tx`Spiel starten`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
