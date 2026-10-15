import { motion } from 'motion/react'
import { CHARACTERS } from '../../ai/personalities'
import { TELL_PROOF, TELLS } from '../../ai/tells'
import { TOKEN_TEXT } from '../../i18n/texts'
import { useCareer } from '../../store/career'
import { useNav } from '../../store/nav'
import { Icon } from '../art/Icons'
import { Portrait } from '../art/Portrait'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

/**
 * A file on every opponent the player has sat down with: the record against
 * them, the tokens they have shown, and their habit once it has been seen
 * to mean something.
 */
export function DossiersScreen() {
  const go = useNav((n) => n.go)
  const dossiers = useCareer((c) => c.dossiers)
  const met = Object.entries(dossiers)
    .filter(([id, d]) => CHARACTERS[id] && d.met > 0)
    .sort(([, a], [, b]) => b.met - a.met)

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('ship')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Dossiers`}</h1>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.feats)}>
          <p className={s.lead}>{tx`Jeder hat eine Angewohnheit, die seine Hand verrät – nicht immer ehrlich. Bestätigt sie sich beim Aufdecken oft genug, steht hier, was sie bedeutet.`}</p>
          {met.length === 0 && <p className={s.locked}>{tx`Noch niemand. Setz dich an einen Tisch.`}</p>}
          {met.map(([id, d], i) => {
            const c = CHARACTERS[id]
            const tell = TELLS[id]
            const known = tell && d.tellProof >= TELL_PROOF
            return (
              <motion.article key={id} className={s.dossier} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                <header>
                  <Portrait character={c} size={52} frame />
                  <div>
                    <b>{c.name}</b>
                    <em>{c.title}</em>
                    <span>{tx`Partien: ${d.met} · gewonnen: ${d.won} · an diesen Gegner verloren: ${d.lost}`}</span>
                  </div>
                </header>
                {d.tokens.length > 0 && (
                  <p className={s.tableReward}>
                    <span>{tx`Spielt:`}</span>
                    {d.tokens.map((t) => (
                      <span key={t} className={s.rewardToken} title={TOKEN_TEXT[t].long}>
                        <TokenIcon token={t} size={15} /> {TOKEN_TEXT[t].name}
                      </span>
                    ))}
                  </p>
                )}
                {tell && (
                  <p className={cx(s.dossierTell, known && s.dossierKnown)}>
                    {d.tellProof === 0 ? (
                      tx`Eine Angewohnheit? Noch ist dir nichts aufgefallen.`
                    ) : known ? (
                      <>
                        <i>{tell.gesture}</i>
                        {tell.meaning === 'strong' ? tx` – dann ist die Hand meist stark.` : tx` – dann ist die Hand meist schwach.`}
                      </>
                    ) : (
                      <>
                        <i>{tell.gesture}</i>
                        {tx` – was das heißt, weißt du noch nicht (${d.tellProof}/${TELL_PROOF}).`}
                      </>
                    )}
                  </p>
                )}
              </motion.article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
