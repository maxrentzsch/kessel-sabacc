import { useState } from 'react'
import { TABLES } from '../../career/tables'
import { TOKEN_IDS } from '../../engine'
import { sfx } from '../../audio/sfx'
import { exportSave, importSave } from '../../store/backup'
import type { ImportResult } from '../../store/backup'
import { useCareer } from '../../store/career'
import { useNav } from '../../store/nav'
import { useSettings } from '../../store/settings'
import { Icon } from '../art/Icons'
import common from '../common/common.module.css'
import { RankBar } from '../common/Rank'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import s from './Screens.module.css'

function Toggle({ label, note, value, onChange }: { label: string; note: string; value: boolean; onChange(v: boolean): void }) {
  return (
    <button className={s.toggle} role="switch" aria-checked={value} onClick={() => onChange(!value)}>
      <span>
        <b>{label}</b>
        <em>{note}</em>
      </span>
      <i className={cx(s.switch, value && s.switchOn)} />
    </button>
  )
}

export function ProfileScreen() {
  const go = useNav((n) => n.go)
  const career = useCareer()
  const settings = useSettings()
  const [confirm, setConfirm] = useState(false)
  /** the code of this career while it is on show */
  const [saved, setSaved] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  /** the code being pasted in, while the sheet for it is open */
  const [pasted, setPasted] = useState<string | null>(null)
  const [problem, setProblem] = useState<ImportResult | null>(null)
  const [loaded, setLoaded] = useState(false)

  const copy = async () => {
    if (!saved) return
    try {
      await navigator.clipboard.writeText(saved)
      setCopied(true)
    } catch {
      // No clipboard here: the code is selected in its field and can be copied by hand.
      setCopied(false)
    }
  }
  const share = () => {
    if (saved) void navigator.share({ title: 'Kessel Sabacc – Spielstand', text: saved }).catch(() => undefined)
  }
  const load = () => {
    const result = importSave(pasted ?? '')
    if (result !== 'ok') return setProblem(result)
    setPasted(null)
    setProblem(null)
    setLoaded(true)
  }
  const { stats } = career
  const n = (key: string) => stats[key] ?? 0
  const percent = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '–')

  const facts: [string, string | number][] = [
    ['Credits', career.credits],
    ['Tische gewonnen', `${TABLES.filter((t) => career.tableWins[t.id]).length}/${TABLES.length}`],
    ['Tokens', `${career.unlockedTokens.length}/${TOKEN_IDS.length}`],
    ['Partien', n('games')],
    ['Siegquote', percent(n('wins'), n('games'))],
    ['Hände gewonnen', percent(n('handsWon'), n('hands'))],
    ['Sabaccs', n('sabaccs')],
    ['Pure Sabaccs', n('pureSabaccs')],
    ['Tokens gespielt', n('tokensPlayed')],
    ['Duelle gewonnen', `${TABLES.filter((t) => career.duelWins[t.id]).length}/${TABLES.length}`],
    ['Gespäht', n('peeks')],
    ['Erwischt', n('caught')],
    ['Größter Gewinn', n('biggestPayout')],
    ['Tour-Rekord', career.tourBest],
    ['Tageshand-Serie', career.dailyBest],
  ]

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>Profil</h1>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.profile)}>
          <RankBar />
          <h2 className={s.fieldLabel}>Statistik</h2>
          <dl className={s.stats}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="num">{value}</dd>
              </div>
            ))}
          </dl>

          <h2 className={s.fieldLabel}>Einstellungen</h2>
          <div className={s.toggles}>
            <Toggle
              label="Ton"
              note="Karten, Chips und Würfel"
              value={settings.sound}
              onChange={(sound) => {
                settings.set({ sound })
                if (sound) sfx.chip(2)
              }}
            />
            <Toggle label="Atmosphäre" note="Stimmengewirr und Maschinen der Cantina" value={settings.ambience} onChange={(ambience) => settings.set({ ambience })} />
            <Toggle
              label="Ton trotz Stummschalter"
              note="iPhone: spielt auch im Lautlos-Modus, pausiert dafür andere Musik"
              value={settings.ignoreMute}
              onChange={(ignoreMute) => settings.set({ ignoreMute })}
            />
            <Toggle label="Vibration" note="Nur Android – iPhones erlauben das im Browser nicht" value={settings.haptics} onChange={(haptics) => settings.set({ haptics })} />
            <Toggle label="Tipps am Tisch" note="Erklärt, was gerade zu tun ist" value={settings.hints} onChange={(hints) => settings.set({ hints })} />
            <Toggle label="Schnelles Spiel" note="Kürzere Animationen und Denkpausen" value={settings.fast} onChange={(fast) => settings.set({ fast })} />
          </div>

          <h2 className={s.fieldLabel}>Spielstand</h2>
          <p className={s.fieldNote}>
            Dein Fortschritt liegt nur auf diesem Gerät, und ein Browser darf ihn löschen. Sichere ihn als Code – damit lässt er sich auch auf ein anderes Gerät übertragen.
          </p>
          <div className={s.saveRow}>
            <button
              className={common.btn}
              onClick={() => {
                setCopied(false)
                setSaved(exportSave())
              }}
            >
              Sichern
            </button>
            <button
              className={common.btn}
              onClick={() => {
                setProblem(null)
                setPasted('')
              }}
            >
              Laden
            </button>
          </div>
          {loaded && (
            <p className={s.saveDone}>
              <Icon name="check" size={16} /> Spielstand geladen.
            </p>
          )}

          <button className={cx(common.btn, common.btnDanger, common.btnBlock)} onClick={() => setConfirm(true)}>
            Karriere zurücksetzen
          </button>
        </div>
      </div>

      <Sheet open={saved !== null} onClose={() => setSaved(null)} dialog>
        <h2 className={common.sheetTitle}>Spielstand sichern</h2>
        <p className={common.sheetText}>Kopier diesen Code und heb ihn auf – in einer Notiz oder einer Nachricht an dich selbst. Unter „Laden“ stellt er alles wieder her.</p>
        <textarea className={s.saveCode} readOnly value={saved ?? ''} onFocus={(e) => e.currentTarget.select()} aria-label="Spielstand-Code" />
        <div className={common.sheetActions}>
          <button className={cx(common.btn, common.btnGhost)} onClick={() => setSaved(null)}>
            Fertig
          </button>
          {typeof navigator.share === 'function' && (
            <button className={common.btn} onClick={share}>
              Teilen
            </button>
          )}
          <button className={cx(common.btn, common.btnPrimary)} onClick={copy}>
            {copied ? 'Kopiert' : 'Kopieren'}
          </button>
        </div>
      </Sheet>

      <Sheet open={pasted !== null} onClose={() => setPasted(null)} dialog>
        <h2 className={common.sheetTitle}>Spielstand laden</h2>
        <p className={common.sheetText}>Füg hier einen gesicherten Code ein. Der Fortschritt auf diesem Gerät wird dadurch ersetzt.</p>
        <textarea
          className={s.saveCode}
          value={pasted ?? ''}
          onChange={(e) => {
            setPasted(e.target.value)
            setProblem(null)
          }}
          placeholder="KS1.…"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Spielstand-Code"
        />
        {problem && (
          <p className={s.fieldWarn}>
            {problem === 'format'
              ? 'Das ist kein Spielstand-Code. Er beginnt mit „KS1.“.'
              : problem === 'version'
                ? 'Dieser Code stammt aus einer neueren Version des Spiels.'
                : 'Der Code ist unvollständig oder beschädigt. Kopier ihn noch einmal ganz.'}
          </p>
        )}
        <div className={common.sheetActions}>
          <button className={cx(common.btn, common.btnGhost)} onClick={() => setPasted(null)}>
            Abbrechen
          </button>
          <button className={cx(common.btn, common.btnDanger)} disabled={!pasted?.trim()} onClick={load}>
            Ersetzen
          </button>
        </div>
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} dialog>
        <h2 className={common.sheetTitle}>Alles auf Anfang?</h2>
        <p className={common.sheetText}>Credits, freigeschaltete Tische, Tokens und Statistik werden gelöscht. Das lässt sich nicht rückgängig machen.</p>
        <div className={common.sheetActions}>
          <button className={cx(common.btn, common.btnGhost)} onClick={() => setConfirm(false)}>
            Abbrechen
          </button>
          <button
            className={cx(common.btn, common.btnDanger)}
            onClick={() => {
              career.reset()
              setConfirm(false)
            }}
          >
            Zurücksetzen
          </button>
        </div>
      </Sheet>
    </div>
  )
}
