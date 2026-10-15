import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { CHARACTERS } from '../../ai/personalities'
import { sfx } from '../../audio/sfx'
import { ANIMALS, BIX, YOU } from '../../career/story'
import type { Animal, Choice, Scene as SceneDef } from '../../career/story'
import { venueOf } from '../../career/venues'
import { ANIMAL_NAME, ANIMAL_VOICE, Critter } from '../art/Critter'
import { Portrait } from '../art/Portrait'
import { cx } from '../cx'
import s from './common.module.css'
import { tx } from '../../i18n'

interface Props {
  scene: SceneDef
  /** the animal that came along, for lines spoken by Bix */
  bix?: Animal | null
  /** the scene is over; `choice` is the answer the player gave, if it asked for one */
  onDone(choice?: Choice): void
}

/** How fast the words appear, in letters per tick. */
const TICK = 22

/**
 * A piece of the story: one line at a time, written out as it is spoken.
 * A tap finishes the line, the next tap moves on. A scene that asks
 * something waits on its last line for one of the answers.
 */
export function Scene({ scene, bix, onDone }: Props) {
  const { lines, venue, title, choices } = scene
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const line = lines[index]
  const animal = line.who === BIX ? (bix ?? 'vulptex') : (ANIMALS as readonly (string | null)[]).includes(line.who) ? (line.who as Animal) : null
  const speaker = line.who && line.who !== YOU && !animal ? CHARACTERS[line.who] : null
  const typing = shown < line.text.length

  useEffect(() => {
    setShown(0)
    if (speaker) sfx.voice(speaker.hue, 2 + Math.ceil(line.text.length / 12), speaker.sigil === 'droid')
    else if (animal) sfx.voice(ANIMAL_VOICE[animal], 2, false)
    const timer = setInterval(() => setShown((n) => n + 2), TICK)
    return () => clearInterval(timer)
    // one run per line
  }, [index])

  const last = index === lines.length - 1
  const asking = last && !typing && !!choices
  const next = () => {
    if (typing) setShown(line.text.length)
    else if (!last) setIndex(index + 1)
    else if (!choices) onDone()
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
          // A question still needs its answer: skip to it.
          if (!choices) return onDone()
          setIndex(lines.length - 1)
          setShown(lines[lines.length - 1].text.length)
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
              {animal ? <Critter animal={animal} size="100%" /> : <Portrait character={speaker} mood={line.mood ?? 'idle'} talking={typing} alive frame size="100%" />}
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
                <b>{speaker ? speaker.name : line.who === BIX ? 'Bix' : animal ? ANIMAL_NAME[animal] : tx`Du`}</b>
                {speaker && <em>{speaker.title}</em>}
              </div>
            )}
            <p aria-live="polite">
              {line.text.slice(0, shown)}
              <span className={s.sceneRest}>{line.text.slice(shown)}</span>
            </p>
          </motion.div>
        </AnimatePresence>
        {asking ? (
          <div className={s.sceneChoices}>
            {choices.map((choice) => (
              <button
                key={choice.text}
                className={s.sceneChoice}
                onClick={(e) => {
                  e.stopPropagation()
                  onDone(choice)
                }}
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <p className={cx(s.sceneMore, typing && s.sceneMoreOff)}>{!last || choices ? tx`Tippen für weiter` : tx`Tippen zum Schließen`}</p>
        )}
      </div>
    </motion.div>
  )
}
