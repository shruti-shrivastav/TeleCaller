import { atom } from 'jotai'

// For Create modal
export const createLeadAtom = atom<{ open: boolean }>({ open: false })

// For Edit modal
export const editLeadAtom = atom<{
  open: boolean
  lead: any | null
}>({
  open: false,
  lead: null,
})

// for bulk leads
export const bulkUploadResultAtom = atom<{
  open: boolean;
  result: any | null;
}>({
  open: false,
  result: null,
});