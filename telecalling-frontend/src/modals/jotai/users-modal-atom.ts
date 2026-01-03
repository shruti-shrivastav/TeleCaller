import { atom } from 'jotai';

export const createUserAtom = atom<{
  open: boolean;
  mode?: 'telecaller' | 'leader' | 'default';
}>({
  open: false,
  mode: 'default',
});

// src/modals/jotai/users-modal-atom.ts
export const editUserAtom = atom<{
  open: boolean;
  user: any | null;
  mode?: 'default' | 'inline'; // default = full admin edit
}>({
  open: false,
  user: null,
  mode: 'inline',
});