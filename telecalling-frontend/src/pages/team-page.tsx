'use client';
import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { fetchTeamMembers } from '@/features/team/team-thunk';
import DataTableClean from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useConfirmDialog } from '@/hooks/use-confirm';
import { ConfirmDialog } from '@/modals/confirm-dialog';
import { useSetAtom } from 'jotai';
import { createUserAtom, editUserAtom } from '@/modals/jotai/users-modal-atom';

const roleColors: Record<string, string> = {
  leader: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  telecaller:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
};

const TeamPage = () => {
  const dispatch = useAppDispatch();
  const { leader, members, loading } = useAppSelector((s) => s.team);
  const { role, user } = useAuth();
  const setCreate = useSetAtom(createUserAtom);
  const setEdit = useSetAtom(editUserAtom);
  const { open, title, message, confirm, close, onConfirm } =
    useConfirmDialog();

  useEffect(() => {
    console.log(user, role, 'check');
    if (!user) return; // safety for initial render

    if (role === 'telecaller' && user.leaderId) {
      dispatch(fetchTeamMembers({ leaderId: user.leaderId }));
    } else {
      dispatch(fetchTeamMembers()); // for leader/admin
    }
  }, [dispatch, role, user]);

  const handleDelete = (user: any) => {
    confirm({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${user.fullName}?`,
      onConfirm: async () => {
        try {
          toast.success(`${user.fullName} removed successfully`);
        } catch {
          toast.error('Failed to remove member');
        } finally {
          close();
        }
      },
    });
  };

  const columns = [
    {
      key: 'fullName',
      header: 'Name',
      render: (r: any) =>
        r.fullName ||
        [r.firstName, r.lastName].filter(Boolean).join(' ') ||
        '—',
    },
    { key: 'email', header: 'Email', render: (r: any) => r.email || '—' },
    { key: 'phone', header: 'Phone', render: (r: any) => r.phone || '—' },
    {
      key: 'role',
      header: 'Role',
      render: (r: any) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
            roleColors[r.role] || 'bg-gray-200 text-gray-800'
          }`}
        >
          {r.role}
        </span>
      ),
    },
  ];

  const handlers = useMemo(
    () => ({
      onQueryChange: () => {}, // static list, no filtering
    }),
    []
  );

  return (
    <div className="container mx-auto space-y-6">
      {leader && (
        <div className="flex items-center justify-between bg-muted/40 border rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 flex items-center justify-center font-semibold">
              {leader.fullName?.[0] || 'L'}
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">
                {leader.fullName}
              </p>
              <p className="text-xs text-muted-foreground">{leader.email}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleColors['leader']}`}
          >
            Team Leader
          </span>
        </div>
      )}

      <DataTableClean
        title="Team Members"
        toolbarActions={
          role === 'leader' && (
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={() => setCreate({ open: true, mode: 'telecaller' })}
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Add Telecaller
            </Button>
          )
        }
        columns={columns}
        rows={Array.isArray(members) ? members : []}
        rowKey={(r) => r.id}
        loading={loading}
        rightActionsFor={(user) =>
          role === 'leader' && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEdit({ open: true, user })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDelete(user)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        serverSearchMode="manual"
      />

      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        onConfirm={onConfirm}
        onClose={close}
      />
    </div>
  );
};

export default TeamPage;
