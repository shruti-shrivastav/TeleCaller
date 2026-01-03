import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAppDispatch } from '@/hooks/use-store';
import { deleteLead, fetchLeads } from '@/features/leads/lead-thunk';
import { Trash2 } from 'lucide-react';

export const DeleteLeadModal = ({ lead }: { lead: any }) => {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await dispatch(deleteLead(lead.id)).unwrap();
      toast.success('Lead deleted successfully');
      setOpen(false);
      dispatch(fetchLeads({ page: 1, pageSize: 20 }));
    } catch {
      toast.error('Failed to delete lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle>Delete Lead</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <strong>{lead.name}</strong>? This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
