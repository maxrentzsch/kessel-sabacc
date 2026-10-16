import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../ai/personalities'
import { ANIMALS, BIX, SCENES, TRIGGERS, YOU } from './story'
import type { Scene } from './story'
import { VENUES } from './venues'

const scenes = Object.values(SCENES)
const follows = (scene: Scene): string[] => [...(scene.next ? [scene.next] : []), ...(scene.choices ?? []).flatMap((c) => (c.next ? [c.next] : []))]

describe('the story', () => {
  it('files every scene under its own id', () => {
    for (const [id, scene] of Object.entries(SCENES)) expect(scene.id).toBe(id)
  })

  it('only leads to scenes that exist', () => {
    for (const scene of scenes) for (const next of follows(scene)) expect(SCENES[next], `${scene.id} → ${next}`).toBeDefined()
    for (const id of TRIGGERS) expect(SCENES[id], id).toBeDefined()
  })

  it('can reach every scene from something that happens in the game', () => {
    const reached = new Set<string>()
    const visit = (id: string) => {
      if (reached.has(id)) return
      reached.add(id)
      follows(SCENES[id]).forEach(visit)
    }
    TRIGGERS.forEach(visit)
    expect(scenes.filter((scene) => !reached.has(scene.id)).map((scene) => scene.id)).toEqual([])
  })

  it('never leads back to a scene already played on the way', () => {
    const walk = (id: string, path: string[]) => {
      expect(path, `${[...path, id].join(' → ')}`).not.toContain(id)
      follows(SCENES[id]).forEach((next) => walk(next, [...path, id]))
    }
    TRIGGERS.forEach((id) => walk(id, []))
  })

  it('is spoken by people who exist, in rooms that exist', () => {
    for (const scene of scenes) {
      expect(VENUES[scene.venue], scene.id).toBeDefined()
      expect(scene.lines.length, scene.id).toBeGreaterThan(0)
      for (const line of scene.lines) {
        expect(line.text.trim(), scene.id).not.toBe('')
        if (line.who !== null && line.who !== YOU && line.who !== BIX && !(ANIMALS as readonly string[]).includes(line.who)) expect(CHARACTERS[line.who], `${scene.id}: ${line.who}`).toBeDefined()
      }
    }
  })

  it('lets every animal come along, whichever way the night goes', () => {
    for (const start of ['ride', 'flashback']) {
      const animals = SCENES[start].choices!.flatMap((c) => c.effects ?? []).flatMap((e) => ('bix' in e ? [e.bix] : []))
      expect(animals.sort(), start).toEqual([...ANIMALS].sort())
    }
  })

  it('shows all three animals before asking which way to ride', () => {
    for (const start of ['ride']) expect(SCENES[start].lines.map((l) => l.who).filter((who) => (ANIMALS as readonly (string | null)[]).includes(who)).sort(), start).toEqual([...ANIMALS].sort())
  })

  it('always leaves an answer open at the end, whatever the player has earned', () => {
    for (const scene of scenes) if (scene.choices) expect(scene.choices.some((c) => !c.requires), scene.id).toBe(true)
  })

  it('offers a real choice wherever it asks for one', () => {
    for (const scene of scenes) {
      if (!scene.choices) continue
      expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(2)
      expect(scene.choices.length, scene.id).toBeLessThanOrEqual(3)
      expect(scene.next, `${scene.id} has answers and a fixed next scene`).toBeUndefined()
    }
  })
})
