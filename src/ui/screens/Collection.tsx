import { useState } from 'react'
import { CHIPS, COSMETICS, FELTS, KIND_NAME } from '../../career/cosmetics'
import type { Cosmetic, CosmeticKind } from '../../career/cosmetics'
import { rankOf } from '../../career/reputation'
import { sfx } from '../../audio/sfx'
import { useCareer } from '../../store/career'
import { useNav } from '../../store/nav'
import { CardBack } from '../art/CardArt'
import { Icon } from '../art/Icons'
import common from '../common/common.module.css'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

const KINDS: CosmeticKind[] = ['back', 'felt', 'chip', 'title']

/** What a piece of the collection looks like. */
function Preview({ item }: { item: Cosmetic }) {
  const rep = useCareer((c) => c.rep)
  if (item.kind === 'back') {
    return (
      <span className={s.previewBacks}>
        <CardBack suit="sand" skin={item.id} />
        <CardBack suit="blood" skin={item.id} />
      </span>
    )
  }
  if (item.kind === 'felt') {
    const felt = FELTS[item.id]
    return <span className={s.previewFelt} style={felt ? { background: `radial-gradient(circle, ${felt[0]}, ${felt[1]} 55%, ${felt[2]})` } : undefined} />
  }
  if (item.kind === 'chip') {
    const [a, b, c] = CHIPS[item.id]
    return (
      <span className={s.previewChips} style={{ ['--chip-a' as string]: a, ['--chip-b' as string]: b, ['--chip-c' as string]: c }}>
        <i />
        <i />
        <i />
      </span>
    )
  }
  return <span className={s.previewTitle}>{item.id === 'title-rank' ? rankOf(rep).title : item.name}</span>
}

function Tile({ item }: { item: Cosmetic }) {
  const career = useCareer()
  const owned = career.owned.includes(item.id)
  const inUse = career.look[item.kind] === item.id
  const affordable = item.price !== undefined && career.credits >= item.price

  const act = () => {
    if (owned) career.equip(item.id)
    else if (career.buy(item.id)) sfx.chip(3)
  }

  return (
    <button className={cx(s.piece, inUse && s.pieceOn, !owned && s.pieceLocked)} onClick={act} disabled={!owned && !affordable} aria-pressed={inUse}>
      <Preview item={item} />
      <b>{item.kind === 'title' && item.id === 'title-rank' ? tx`Dein Rang` : item.name}</b>
      {inUse ? (
        <em className={s.pieceState}>
          <Icon name="check" size={13} />{tx` In Benutzung`}
        </em>
      ) : owned ? (
        <em>{tx`Antippen zum Benutzen`}</em>
      ) : item.price !== undefined ? (
        <em className={cx(s.piecePrice, 'num')}>{item.price}{tx` Credits`}</em>
      ) : (
        <em>
          <Icon name="lock" size={12} /> {item.hint}
        </em>
      )}
    </button>
  )
}

export function CollectionScreen() {
  const go = useNav((n) => n.go)
  const credits = useCareer((c) => c.credits)
  const [kind, setKind] = useState<CosmeticKind>('back')

  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('ship')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Sammlung`}</h1>
        <span className={common.credits}>{credits}</span>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.collection)}>
          <div className={s.segments} role="tablist">
            {KINDS.map((k) => (
              <button key={k} role="tab" aria-selected={k === kind} className={cx(s.segment, k === kind && s.segmentOn)} onClick={() => setKind(k)}>
                {KIND_NAME[k]}
              </button>
            ))}
          </div>
          <div className={cx(s.pieces, kind === 'title' && s.piecesWide)}>
            {COSMETICS.filter((c) => c.kind === kind).map((item) => (
              <Tile key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
