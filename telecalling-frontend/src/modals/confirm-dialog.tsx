import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onClose,
  loading = false,
}: ConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Deleting…' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};