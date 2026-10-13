import { useEffect, useRef, useState } from 'react'
import { banter } from '../../ai/banter'
import type { Occasion } from '../../ai/banter'
import type { Character } from '../../ai/personalities'
import { sfx } from '../../audio/sfx'
import type { GameEvent, GameState } from '../../engine'
import { SOURCE_NAME, TOKEN_TEXT } from '../../i18n/texts'
import { revealOrder, useGame } from '../../store/game'
import { tempo } from '../../store/settings'
import type { Mood } from '../art/Portrait'
import { tx } from '../../i18n'

/** Run `handler` once for every event published after the component mounted. */
export function useFeed(handler: (event: GameEvent, id: number) => void): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    let seen = useGame.getState().feed.at(-1)?.id ?? 0
    return useGame.subscribe((state) => {
      for (const item of state.feed) {
        if (item.id <= seen) continue
        seen = item.id
        ref.current(item.event, item.id)
      }
    })
  }, [])
}

export interface Floater {
  id: number
  delta: number
}

/** Short-lived "+2 / −1" markers for a player's chip changes. */
export function useChipFloaters(playerId: number): Floater[] {
  const [floaters, setFloaters] = useState<Floater[]>([])
  useFeed((event, id) => {
    if (event.type !== 'chips' || event.playerId !== playerId) return
    setFloaters((list) => [...list, { id, delta: event.delta }])
    setTimeout(() => setFloaters((list) => list.filter((f) => f.id !== id)), 1500)
  })
  return floaters
}

export interface Bubble {
  id: number
  text: string
  /** a spoken line rather than a status like "Steht" */
  speech: boolean
}

export interface SeatLife {
  mood: Mood
  talking: boolean
  bubble: Bubble | null
}

/**
 * Everything that makes an opponent feel present: what they say, how they
 * react to the table and the short status notes about their moves.
 */
export function useSeatLife(playerId: number, character: Character): SeatLife {
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [flash, setFlash] = useState<{ id: number; mood: Mood } | null>(null)
  const thinking = useGame((g) => g.thinking === playerId)
  const eliminated = useGame((g) => g.game?.players[playerId]?.eliminated ?? false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const spokeAt = useRef(0)

  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms))
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const say = (id: number, occasion: Occasion, chance: number, delay = 0, force = false) => {
    if (Math.random() > chance) return
    later(delay, () => {
      // One line at a time: nobody talks over themselves.
      if (!force && Date.now() - spokeAt.current < 3500) return
      const text = banter(character.id, occasion)
      if (!text) return
      spokeAt.current = Date.now()
      setBubble({ id, text, speech: true })
      sfx.voice(character.hue, 2 + Math.ceil(text.length / 9), character.sigil === 'droid')
      later(1500 + text.length * 55, () => setBubble((b) => (b?.id === id ? null : b)))
    })
  }
  const note = (id: number, text: string) => {
    setBubble((b) => (b?.speech ? b : { id, text, speech: false }))
    later(1500 * tempo() + 300, () => setBubble((b) => (b?.id === id ? null : b)))
  }
  const feel = (id: number, mood: Mood, ms = 2800) => {
    setFlash({ id, mood })
    later(ms, () => setFlash((f) => (f?.id === id ? null : f)))
  }

  // Caught cheating: everybody at the table has something to say about it.
  const caught = useGame((g) => g.caught)
  const seenCaught = useRef(caught)
  useEffect(() => {
    if (caught === seenCaught.current) return
    seenCaught.current = caught
    feel(-caught, 'angry', 3600)
    say(-caught, 'cheat', 0.6, 300 + Math.random() * 900, true)
  })

  // The opening deal happens before the table is on screen, so greet from here.
  useEffect(() => {
    const game = useGame.getState().game
    if (game?.handNumber === 1 && game.round === 1) say(0, 'start', 0.45, 900 + Math.random() * 2600)
  }, [])

  useFeed((event, id) => {
    switch (event.type) {
      case 'drew':
        if (event.playerId === playerId) note(id, event.free ? tx`Zieht gratis` : tx`Zieht`)
        break
      case 'stood':
        if (event.playerId === playerId) note(id, event.forced ? tx`Muss stehen` : tx`Steht`)
        break
      case 'tokenBlocked':
        if (event.playerId !== playerId) break
        note(id, tx`Immun!`)
        feel(id, 'smug')
        break
      case 'tokenPlayed':
        if (event.playerId === playerId) {
          feel(id, 'smug', 3200)
          say(id, 'token', 0.85, 350)
        } else if (event.target === playerId) {
          feel(id, 'angry', 3600)
          say(id, 'hit', 0.7, 1300)
        }
        break
      case 'chips':
        if (event.playerId !== playerId || event.delta >= 0) break
        if (event.reason !== 'tariff' && event.reason !== 'audit' && event.reason !== 'embezzle') break
        feel(id, 'angry', 3200)
        say(id, 'hit', 0.3, 1300)
        break
      case 'handRedrawn':
        if (event.playerId === playerId) feel(id, 'worried', 3200)
        break
      case 'settled': {
        const mine = event.result.ranking.find((r) => r.playerId === playerId)
        if (!mine) break
        if (mine.winner) {
          feel(id, 'happy', 4500)
          say(id, 'win', 0.85, 500)
        } else {
          feel(id, mine.score.category === 'none' ? 'worried' : 'angry', 4500)
          say(id, 'lose', 0.4, 900)
        }
        break
      }
      case 'eliminated':
        if (event.playerId === playerId) say(id, 'out', 1, 1600, true)
        break
    }
  })

  const mood: Mood = eliminated ? 'out' : (flash?.mood ?? (thinking ? 'thinking' : 'idle'))
  return { mood, talking: bubble?.speech ?? false, bubble }
}

/** One line describing an event for the status ticker. */
export function describe(event: GameEvent, game: GameState): string | null {
  const name = (id: number) => game.players[id].name
  const you = (id: number) => game.players[id].isHuman
  // Whole sentences for every case: the two languages do not build them alike.
  switch (event.type) {
    case 'handStart':
      return you(event.dealer) ? tx`Hand ${event.hand} – du eröffnest` : tx`Hand ${event.hand} – ${name(event.dealer)} eröffnet`
    case 'tokenPlayed': {
      const token = TOKEN_TEXT[event.token].name
      const who = event.playerId
      if (event.target === undefined) return you(who) ? tx`Du spielst ${token}` : tx`${name(who)} spielt ${token}`
      if (you(who)) return tx`Du spielst ${token} gegen ${name(event.target)}`
      return you(event.target) ? tx`${name(who)} spielt ${token} gegen dich` : tx`${name(who)} spielt ${token} gegen ${name(event.target)}`
    }
    case 'drew': {
      const source = SOURCE_NAME[event.source]
      return you(event.playerId) ? tx`Du ziehst: ${source}` : tx`${name(event.playerId)} zieht: ${source}`
    }
    case 'discarded':
      if (you(event.playerId)) return event.keep === 'new' ? tx`Du behältst die neue Karte` : tx`Du behältst die alte Karte`
      return event.keep === 'new' ? tx`${name(event.playerId)} behält die neue Karte` : tx`${name(event.playerId)} behält die alte Karte`
    case 'stood':
      if (you(event.playerId)) return event.forced ? tx`Du stehst (Embargo)` : tx`Du stehst`
      return event.forced ? tx`${name(event.playerId)} steht (Embargo)` : tx`${name(event.playerId)} steht`
    case 'diceRolled':
      if (you(event.playerId)) return event.purpose === 'impostor' ? tx`Du würfelst für den Impostor` : tx`Du würfelst`
      return event.purpose === 'impostor' ? tx`${name(event.playerId)} würfelt für den Impostor` : tx`${name(event.playerId)} würfelt`
    case 'handsSwapped':
      return tx`${name(event.a)} und ${name(event.b)} tauschen die Hände`
    case 'handRedrawn':
      return you(event.playerId) ? tx`Du bekommst eine neue Hand` : tx`${name(event.playerId)} bekommt eine neue Hand`
    case 'showdown':
      return tx`Karten auf den Tisch!`
    default:
      return null
  }
}

/** Where a seat stands in the showdown: is its hand open, is it in the spotlight? */
export function useReveal(playerId: number) {
  const game = useGame((g) => g.game)!
  const step = useGame((g) => g.revealStep)
  const order = revealOrder(game)
  const index = order.indexOf(playerId)
  const over = game.phase === 'handEnd' || game.phase === 'gameOver'
  const showdown = game.phase === 'showdown' && step !== null
  const shown = over || (showdown && index >= 0 && index <= step)
  const allOpen = over || (showdown && step >= order.length)
  const result = game.result?.ranking.find((r) => r.playerId === playerId)
  return {
    /** this hand has been turned over */
    shown,
    /** this hand is being turned over right now */
    focus: showdown && order[step] === playerId,
    /** somebody else is in the spotlight */
    dimmed: showdown && step < order.length && order[step] !== playerId,
    winner: allOpen && !!result?.winner,
    result: shown ? result : undefined,
    settled: over,
  }
}
