import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../cx'
import s from './common.module.css'

interface Props {
  open: boolean
  onClose?: () => void
  /** centred dialog instead of a sheet rising from the bottom edge */
  dialog?: boolean
  /** keep the table visible and clickable behind the sheet */
  bare?: boolean
  children: ReactNode
}

/**
 * Keyboard manners of a dialog: focus goes into it when it opens and back to
 * where it was when it closes, and Escape dismisses it.
 */
function useDialogFocus(onClose: (() => void) | undefined, bare: boolean | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (bare) return
    const before = document.activeElement as HTMLElement | null
    ref.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      before?.focus?.({ preventScroll: true })
    }
  }, [bare])
  return ref
}

function Panel({ onClose, dialog, bare, children }: Omit<Props, 'open'>) {
  const ref = useDialogFocus(onClose, bare)
  return (
    <motion.div
      ref={ref}
      tabIndex={-1}
      className={cx(s.sheet, dialog && s.sheetDialog)}
      role="dialog"
      aria-modal={!bare}
      initial={dialog ? { opacity: 0, scale: 0.9 } : { y: '105%' }}
      animate={dialog ? { opacity: 1, scale: 1 } : { y: 0 }}
      exit={dialog ? { opacity: 0, scale: 0.95 } : { y: '105%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    >
      {children}
    </motion.div>
  )
}

export function Sheet({ open, onClose, dialog, bare, children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className={cx(s.sheetLayer, dialog && s.sheetLayerDialog, bare && s.sheetLayerBare)}>
          {!bare && (
            <motion.div
              className={s.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}
          <Panel onClose={onClose} dialog={dialog} bare={bare}>
            {children}
          </Panel>
        </div>
      )}
    </AnimatePresence>
  )
}
