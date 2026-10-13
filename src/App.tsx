import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { installAudioUnlock, setAmbience } from './audio/sfx'
import { CHIPS } from './career/cosmetics'
import { useCareer } from './store/career'
import { useNav } from './store/nav'
import type { Screen } from './store/nav'
import { Toasts } from './ui/common/Toasts'
import { AchievementsScreen } from './ui/screens/Achievements'
import { CareerScreen } from './ui/screens/Career'
import { CollectionScreen } from './ui/screens/Collection'
import { FreePlayScreen } from './ui/screens/FreePlay'
import { HangarScreen } from './ui/screens/Hangar'
import { HomeScreen } from './ui/screens/Home'
import { LoadoutScreen } from './ui/screens/Loadout'
import { ProfileScreen } from './ui/screens/Profile'
import { ResultScreen } from './ui/screens/Result'
import { RulesScreen } from './ui/screens/Rules'
import { DailyScreen, TourScreen } from './ui/screens/Tour'
import { TableScreen } from './ui/table/Table'

const SCREENS: Record<Screen, () => ReactNode> = {
  home: HomeScreen,
  career: CareerScreen,
  free: FreePlayScreen,
  loadout: LoadoutScreen,
  table: TableScreen,
  result: ResultScreen,
  rules: RulesScreen,
  profile: ProfileScreen,
  ship: HangarScreen,
  collection: CollectionScreen,
  achievements: AchievementsScreen,
  tour: TourScreen,
  daily: DailyScreen,
}

export function App() {
  const screen = useNav((n) => n.screen)
  const Current = SCREENS[screen]

  useEffect(() => installAudioUnlock(), [])

  // Chips are drawn in many places; the design in use reaches them all through these properties.
  const chips = useCareer((c) => c.look.chip)
  useEffect(() => {
    const [body, ring, edge] = CHIPS[chips] ?? CHIPS['chip-standard']
    const root = document.documentElement.style
    root.setProperty('--chip-a', body)
    root.setProperty('--chip-b', ring)
    root.setProperty('--chip-c', edge)
  }, [chips])

  // The cantina is loudest at the table and a murmur behind the menus.
  useEffect(() => setAmbience(screen === 'table' ? 0.4 : 0.15), [screen])

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={screen}
          style={{ position: 'absolute', inset: 0 }}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <Current />
        </motion.main>
      </AnimatePresence>
      <Toasts />
    </MotionConfig>
  )
}
