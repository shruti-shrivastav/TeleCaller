import { atom } from 'jotai'

export const setGoalAtom = atom<{ open: boolean; user?: any }>({
  open: false,
  user: null,
})