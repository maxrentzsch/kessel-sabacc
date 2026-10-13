import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { CHARACTERS } from '../../ai/personalities'
import { sfx } from '../../audio/sfx'
import { YOU } from '../../career/story'
import type { Line } from '../../career/story'
import { venueOf } from '../../career/venues'
import { Portrait } from '../art/Portrait'
import { cx } from '../cx'
import s from './common.module.css'
import { tx } from '../../i18n'

interface Props {
  lines: Line[]
  /** whose room this plays in; paints the scene */
  venue?: string
  /** what the scene is called, in small letters above it */
  title?: string
  onDone(): void
}

/** How fast the words appear, in letters per tick. */
const TICK = 22

/**
 * A piece of the story: one line at a time, written out as it is spoken.
 * A tap finishes the line, the next tap moves on.
 */
export function Scene({ lines, venue, title, onDone }: Props) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const line = lines[index]
  const speaker = line.who && line.who !== YOU ? CHARACTERS[line.who] : null
  const typing = shown < line.text.length

  useEffect(() => {
    setShown(0)
    if (speaker) sfx.voice(speaker.hue, 2 + Math.ceil(line.text.length / 12), speaker.sigil === 'droid')
    const timer = setInterval(() => setShown((n) => n + 2), TICK)
    return () => clearInterval(timer)
    // one run per line
  }, [index])

  const next = () => {
    if (typing) setShown(line.text.length)
    else if (index < lines.length - 1) setIndex(index + 1)
    else onDone()
  }

  return (
    <motion.div
      className={s.scene}
      style={venueOf(venue).colors}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onClick={next}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && next()}
      aria-label={tx`Weiter`}
    >
      <div className={s.sceneRoom} aria-hidden />
      <button
        className={s.sceneSkip}
        onClick={(e) => {
          e.stopPropagation()
          onDone()
        }}
      >
        {tx`Überspringen`}
      </button>
      {/* whoever speaks stands in the room, large */}
      <div className={s.sceneStage}>
        <AnimatePresence mode="wait">
          {line.who && (
            <motion.div
              key={line.who}
              className={s.sceneFigure}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Portrait character={speaker} mood={line.mood ?? 'idle'} talking={typing} alive frame size="100%" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={s.sceneBody}>
        {title && <p className={s.sceneTitle}>{title}</p>}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${index}-${line.who}`}
            className={cx(s.sceneLine, !line.who && s.sceneNarration)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {line.who && (
              <div className={s.sceneWho}>
                <b>{speaker ? speaker.name : tx`Du`}</b>
                {speaker && <em>{speaker.title}</em>}
              </div>
            )}
            <p aria-live="polite">
              {line.text.slice(0, shown)}
              <span className={s.sceneRest}>{line.text.slice(shown)}</span>
            </p>
          </motion.div>
        </AnimatePresence>
        <p className={cx(s.sceneMore, typing && s.sceneMoreOff)}>{index < lines.length - 1 ? tx`Tippen für weiter` : tx`Tippen zum Schließen`}</p>
      </div>
    </motion.div>
  )
}
