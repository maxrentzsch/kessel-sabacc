import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useToasts } from '../../store/toasts'
import { Icon } from '../art/Icons'
import { cx } from '../cx'
import s from './common.module.css'
import { tx } from '../../i18n'

const KICKER = { achievement: tx`Erfolg`, rank: tx`Neuer Rang`, item: tx`Sammlung`, note: tx`Hinweis` } as const
const ICON = { achievement: 'trophy', rank: 'trophy', item: 'check', note: 'info' } as const

/** Shows queued notices one after the other at the top of the screen. */
export function Toasts() {
  const toast = useToasts((t) => t.queue[0])
  const dismiss = useToasts((t) => t.dismiss)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dismiss(toast.id), 3200)
    return () => clearTimeout(timer)
  }, [toast, dismiss])

  return (
    <div className={s.toasts} aria-live="polite">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.button
            key={toast.id}
            className={cx(s.toast, toast.kind === 'rank' && s.toastRank)}
            onClick={() => dismiss(toast.id)}
            initial={{ opacity: 0, y: -30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <span className={s.toastIcon}>
              <Icon name={ICON[toast.kind]} size={22} />
            </span>
            <span className={s.toastBody}>
              <em>{KICKER[toast.kind]}</em>
              <b>{toast.title}</b>
              <span>{toast.text}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
