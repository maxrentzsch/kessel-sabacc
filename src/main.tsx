import '@fontsource-variable/manrope'
import '@fontsource-variable/montserrat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { LANG, missing } from './i18n'
import './ui/theme/tokens.css'

document.documentElement.lang = LANG

// Offline support; new versions are picked up on the next launch.
registerSW({ immediate: true })

/**
 * Installed on an iPhone home screen the page reaches under the status bar,
 * but is laid out as if it began below it – which leaves a strip at the bottom
 * unused. There the real height is that of the screen.
 */
function fitInstalledApp(): void {
  if ((navigator as { standalone?: boolean }).standalone !== true) return
  const fit = () => {
    const portrait = window.matchMedia('(orientation: portrait)').matches
    const full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height)
    const missing = full - window.innerHeight
    // Only make up for a strip of that kind; a window that is simply smaller than the screen is left alone.
    if (missing > 0 && missing <= 80) document.documentElement.style.setProperty('--app-height', `${full}px`)
    else document.documentElement.style.removeProperty('--app-height')
  }
  fit()
  window.addEventListener('resize', fit)
  window.addEventListener('orientationchange', () => setTimeout(fit, 300))
}
fitInstalledApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Handy for poking at a running game from the browser console.
if (import.meta.env.DEV) {
  void Promise.all([import('./store/game'), import('./store/nav'), import('./ai/personalities'), import('./audio/sfx'), import('./store/career'), import('./store/spike'), import('./store/shift')]).then(
    ([{ useGame }, { useNav }, { CHARACTERS }, audio, { useCareer }, { useSpike }, { useShift }]) =>
      Object.assign(window, { __game: useGame, __nav: useNav, __chars: CHARACTERS, __audio: audio, __career: useCareer, __spike: useSpike, __shift: useShift, __missing: missing }),
  )
}
