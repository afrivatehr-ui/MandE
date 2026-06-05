import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// App-level preferences persisted in the browser. Survey token expiry is used
// as the default when generating tokens / sending invitations.
export const useSettingsStore = create(
  persist(
    (set) => ({
      surveyTokenExpiryDays: 14,
      setSurveyTokenExpiryDays: (days) =>
        set({ surveyTokenExpiryDays: Math.max(1, Math.min(365, Number(days) || 14)) }),
    }),
    { name: 'afrivate-me-settings' },
  ),
)
