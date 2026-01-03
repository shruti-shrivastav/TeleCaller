import { useState, useCallback } from 'react';

export const useConfirmDialog = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Confirm Action');
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  const confirm = useCallback(
    (opts: { title?: string; message: string; onConfirm: () => void }) => {
      setTitle(opts.title || 'Confirm Action');
      setMessage(opts.message);
      setOnConfirm(() => opts.onConfirm);
      setOpen(true);
    },
    []
  );

  const close = useCallback(() => setOpen(false), []);

  return {
    open,
    title,
    message,
    confirm,
    close,
    onConfirm,
  };
};