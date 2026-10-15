import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { TABLES } from '../../career/tables'
import { TOKEN_IDS } from '../../engine'
import { sfx } from '../../audio/sfx'
import { exportSave, importSave } from '../../store/backup'
import type { ImportResult } from '../../store/backup'
import { LANG, setLang } from '../../i18n'
import { useCareer } from '../../store/career'
import { useNav } from '../../store/nav'
import { useSettings } from '../../store/settings'
import { Icon } from '../art/Icons'
import common from '../common/common.module.css'
import { Launch } from '../common/Launch'
import { RankBar } from '../common/Rank'
import { Sheet } from '../common/Sheet'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

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
  const [watching, setWatching] = useState(false)

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
    if (saved) void navigator.share({ title: tx`Kessel Sabacc – Spielstand`, text: saved }).catch(() => undefined)
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
    [tx`Guthaben`, career.credits],
    [tx`Tische gewonnen`, `${TABLES.filter((t) => career.tableWins[t.id]).length}/${TABLES.length}`],
    [tx`Tokens`, `${career.unlockedTokens.length}/${TOKEN_IDS.length}`],
    [tx`Partien`, n('games')],
    [tx`Siegquote`, percent(n('wins'), n('games'))],
    [tx`Hände gewonnen`, percent(n('handsWon'), n('hands'))],
    [tx`Sabaccs`, n('sabaccs')],
    [tx`Pure Sabaccs`, n('pureSabaccs')],
    [tx`Tokens gespielt`, n('tokensPlayed')],
    [tx`Duelle gewonnen`, `${TABLES.filter((t) => career.duelWins[t.id]).length}/${TABLES.length}`],
    [tx`Gespäht`, n('peeks')],
    [tx`Erwischt`, n('caught')],
    [tx`Größter Gewinn`, n('biggestPayout')],
    [tx`Tour-Rekord`, career.tourBest],
    [tx`Tageshand-Serie`, career.dailyBest],
  ]

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Profil`}</h1>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.profile)}>
          <RankBar />
          <h2 className={s.fieldLabel}>{tx`Statistik`}</h2>
          <dl className={s.stats}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="num">{value}</dd>
              </div>
            ))}
          </dl>

          {career.storySeen.includes('launch') && (
            <button className={cx(common.btn, common.btnBlock)} onClick={() => setWatching(true)}>
              {tx`Den Start von Tarsk noch einmal ansehen`}
            </button>
          )}

          <h2 className={s.fieldLabel}>{tx`Sprache`}</h2>
          <div className={s.segments} role="radiogroup" aria-label={tx`Sprache`}>
            <button role="radio" aria-checked={LANG === 'de'} lang="de" className={cx(s.segment, LANG === 'de' && s.segmentOn)} onClick={() => setLang('de')}>
              Deutsch
            </button>
            <button role="radio" aria-checked={LANG === 'en'} lang="en" className={cx(s.segment, LANG === 'en' && s.segmentOn)} onClick={() => setLang('en')}>
              English
            </button>
          </div>

          <h2 className={s.fieldLabel}>{tx`Einstellungen`}</h2>
          <div className={s.toggles}>
            <Toggle
              label={tx`Ton`}
              note={tx`Karten, Chips und Würfel`}
              value={settings.sound}
              onChange={(sound) => {
                settings.set({ sound })
                if (sound) sfx.chip(2)
              }}
            />
            <Toggle label={tx`Atmosphäre`} note={tx`Stimmengewirr und Maschinen der Cantina`} value={settings.ambience} onChange={(ambience) => settings.set({ ambience })} />
            <Toggle
              label={tx`Ton trotz Stummschalter`}
              note={tx`iPhone: spielt auch im Lautlos-Modus, pausiert dafür andere Musik`}
              value={settings.ignoreMute}
              onChange={(ignoreMute) => settings.set({ ignoreMute })}
            />
            <Toggle label={tx`Vibration`} note={tx`Nur Android – iPhones erlauben das im Browser nicht`} value={settings.haptics} onChange={(haptics) => settings.set({ haptics })} />
            <Toggle label={tx`Tipps am Tisch`} note={tx`Erklärt, was gerade zu tun ist`} value={settings.hints} onChange={(hints) => settings.set({ hints })} />
            <Toggle label={tx`Schnelles Spiel`} note={tx`Kürzere Animationen und Denkpausen`} value={settings.fast} onChange={(fast) => settings.set({ fast })} />
            <Toggle
              label={tx`Ziffern auf Spike-Karten`}
              note={tx`Corellian Spike: zeigt den Wert als Zahl. Die Originalkarten haben nur Symbole zum Abzählen`}
              value={settings.cardNumbers}
              onChange={(cardNumbers) => settings.set({ cardNumbers })}
            />
            <Toggle
              label={tx`Ruhige Hand beim Ärmel`}
              note={tx`Ein kurzer Geschicklichkeitstest beim Kartentausch. Aus: ein einfacher Knopf mit festem Risiko`}
              value={settings.steadyHand}
              onChange={(steadyHand) => settings.set({ steadyHand })}
            />
          </div>

          <h2 className={s.fieldLabel}>{tx`Spielstand`}</h2>
          <p className={s.fieldNote}>
            {tx`Dein Fortschritt liegt nur auf diesem Gerät, und ein Browser darf ihn löschen. Sichere ihn als Code – damit lässt er sich auch auf ein anderes Gerät übertragen.`}
          </p>
          <div className={s.saveRow}>
            <button
              className={common.btn}
              onClick={() => {
                setCopied(false)
                setSaved(exportSave())
              }}
            >
              {tx`Sichern`}
            </button>
            <button
              className={common.btn}
              onClick={() => {
                setProblem(null)
                setPasted('')
              }}
            >
              {tx`Laden`}
            </button>
          </div>
          {loaded && (
            <p className={s.saveDone}>
              <Icon name="check" size={16} />{tx` Spielstand geladen.`}
            </p>
          )}

          <button className={cx(common.btn, common.btnDanger, common.btnBlock)} onClick={() => setConfirm(true)}>
            {tx`Karriere zurücksetzen`}
          </button>
        </div>
      </div>

      <Sheet open={saved !== null} onClose={() => setSaved(null)} dialog>
        <h2 className={common.sheetTitle}>{tx`Spielstand sichern`}</h2>
        <p className={common.sheetText}>{tx`Kopier diesen Code und heb ihn auf – in einer Notiz oder einer Nachricht an dich selbst. Unter „Laden“ stellt er alles wieder her.`}</p>
        <textarea className={s.saveCode} readOnly value={saved ?? ''} onFocus={(e) => e.currentTarget.select()} aria-label={tx`Spielstand-Code`} />
        <div className={common.sheetActions}>
          <button className={cx(common.btn, common.btnGhost)} onClick={() => setSaved(null)}>
            {tx`Fertig`}
          </button>
          {typeof navigator.share === 'function' && (
            <button className={common.btn} onClick={share}>
              {tx`Teilen`}
            </button>
          )}
          <button className={cx(common.btn, common.btnPrimary)} onClick={copy}>
            {copied ? tx`Kopiert` : tx`Kopieren`}
          </button>
        </div>
      </Sheet>

      <Sheet open={pasted !== null} onClose={() => setPasted(null)} dialog>
        <h2 className={common.sheetTitle}>{tx`Spielstand laden`}</h2>
        <p className={common.sheetText}>{tx`Füg hier einen gesicherten Code ein. Der Fortschritt auf diesem Gerät wird dadurch ersetzt.`}</p>
        <textarea
          className={s.saveCode}
          value={pasted ?? ''}
          onChange={(e) => {
            setPasted(e.target.value)
            setProblem(null)
          }}
          placeholder={tx`KS1.…`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={tx`Spielstand-Code`}
        />
        {problem && (
          <p className={s.fieldWarn}>
            {problem === 'format'
              ? tx`Das ist kein Spielstand-Code. Er beginnt mit „KS1.“.`
              : problem === 'version'
                ? tx`Dieser Code stammt aus einer neueren Version des Spiels.`
                : tx`Der Code ist unvollständig oder beschädigt. Kopier ihn noch einmal ganz.`}
          </p>
        )}
        <div className={common.sheetActions}>
          <button className={cx(common.btn, common.btnGhost)} onClick={() => setPasted(null)}>
            {tx`Abbrechen`}
          </button>
          <button className={cx(common.btn, common.btnDanger)} disabled={!pasted?.trim()} onClick={load}>
            {tx`Ersetzen`}
          </button>
        </div>
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} dialog>
        <h2 className={common.sheetTitle}>{tx`Alles auf Anfang?`}</h2>
        <p className={common.sheetText}>{tx`Credits, freigeschaltete Tische, Tokens und Statistik werden gelöscht. Das lässt sich nicht rückgängig machen.`}</p>
        <div className={common.sheetActions}>
          <button className={cx(common.btn, common.btnGhost)} onClick={() => setConfirm(false)}>
            {tx`Abbrechen`}
          </button>
          <button
            className={cx(common.btn, common.btnDanger)}
            onClick={() => {
              career.reset()
              setConfirm(false)
            }}
          >
            {tx`Zurücksetzen`}
          </button>
        </div>
      </Sheet>
      <AnimatePresence>{watching && <Launch replay onDone={() => setWatching(false)} />}</AnimatePresence>
    </div>
  )
}
