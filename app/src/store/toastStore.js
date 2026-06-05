import { create } from 'zustand'

let counter = 0

export const useToastStore = create((set) => ({
  toasts: [],
  push: (message, type = 'success', timeout = 4000) => {
    const id = ++counter
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    if (timeout) setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), timeout)
    return id
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Convenience helpers
export const toast = {
  success: (m) => useToastStore.getState().push(m, 'success'),
  error: (m) => useToastStore.getState().push(m, 'error', 6000),
  info: (m) => useToastStore.getState().push(m, 'info'),
}
