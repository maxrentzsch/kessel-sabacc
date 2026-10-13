import { cosmetic } from '../../career/cosmetics'
import { rankProgress } from '../../career/reputation'
import { useCareer } from '../../store/career'
import s from './common.module.css'

/** What the player is called: their rank, unless they wear a title from the collection. */
export function usePlayerTitle(): string {
  const rep = useCareer((c) => c.rep)
  const title = useCareer((c) => c.look.title)
  return title === 'title-rank' ? rankProgress(rep).rank.title : (cosmetic(title)?.name ?? rankProgress(rep).rank.title)
}

/** Rank, title and how far it is to the next rank. */
export function RankBar() {
  const rep = useCareer((c) => c.rep)
  const title = usePlayerTitle()
  const { rank, next, share } = rankProgress(rep)
  return (
    <div className={s.rank}>
      <span className={s.rankLevel}>{rank.level}</span>
      <div className={s.rankBody}>
        <b>{title}</b>
        <i>
          <span style={{ width: `${Math.round(share * 100)}%` }} />
        </i>
        <em className="num">{next ? `${rep} / ${next.at} Ruf` : `${rep} Ruf · höchster Rang`}</em>
      </div>
    </div>
  )
}
