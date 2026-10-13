import { create } from 'zustand'

/** A short notice that slides in over whatever screen is open. */
export interface Toast {
  id: number
  kind: 'achievement' | 'rank' | 'item'
  title: string
  text: string
}

interface ToastState {
  queue: Toast[]
  push(toast: Omit<Toast, 'id'>): void
  dismiss(id: number): void
}

let nextId = 1

export const useToasts = create<ToastState>((set) => ({
  queue: [],
  push: (toast) => set((s) => ({ queue: [...s.queue, { ...toast, id: nextId++ }] })),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((t) => t.id !== id) })),
}))
