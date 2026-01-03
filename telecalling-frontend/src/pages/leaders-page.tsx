'use client';
import { useState, useMemo, useEffect } from 'react';
import { fetchUsers, deleteUser } from '@/features/users/user-thunk';
import DataTableClean from '@/components/data-table';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { useSetAtom } from 'jotai';
import { createUserAtom, editUserAtom } from '@/modals/jotai/users-modal-atom';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/use-confirm';
import { ConfirmDialog } from '@/modals/confirm-dialog';

export const LeadersPage = () => {
  const dispatch = useAppDispatch();
  const { leaders, loading } = useAppSelector((s) => s.users);
  const setCreate = useSetAtom(createUserAtom);
  const setEdit = useSetAtom(editUserAtom);
  const { open, title, message, confirm, close, onConfirm } =
    useConfirmDialog();
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Fetch leaders on mount
  useEffect(() => {
    dispatch(fetchUsers({ page: 1, pageSize: 50, role: 'leader' }));
  }, [dispatch]);

  const handleDelete = (user: any) => {
    confirm({
      title: 'Delete Team Leader',
      message: `Are you sure you want to delete ${user.firstName}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await dispatch(deleteUser(user.id)).unwrap();
          toast.success(`${user.firstName} deleted successfully`);
        } catch {
          toast.error('Failed to delete leader');
        } finally {
          setConfirmLoading(false);
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
        r.fullName || `${r.firstName ?? ''} ${r.lastName ?? ''}`,
    },
    { key: 'email', header: 'Email', render: (r: any) => r.email || '—' },
    { key: 'phone', header: 'Phone', render: (r: any) => r.phone || '—' },
    {
      key: 'teamSize',
      header: 'Team Size',
      render: (r: any) => r.teamCount ?? '—',
    },
    {
      key: 'active',
      header: 'Status',
      render: (r: any) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            r.active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {r.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const handlers = useMemo(
    () => ({
      onQueryChange: (q: any) => {
        dispatch(
          fetchUsers({
            page: q.page,
            pageSize: q.pageSize,
            role: 'leader',
            search: q.query,
          })
        );
      },
    }),
    [dispatch]
  );

  return (
    <>
      <div className="container mx-auto">
        <DataTableClean
          title="Team Leaders"
          toolbarActions={
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={() => setCreate({ open: true, mode: 'leader' })}
            >
              + New Team Leader
            </Button>
          }
          columns={columns}
          rows={Array.isArray(leaders) ? leaders : []}
          rowKey={(r) => r.id}
          loading={loading}
          handlers={handlers}
          serverSearchMode="manual"
          rightActionsFor={(user) => (
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
          )}
        />
      </div>

      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        onConfirm={onConfirm}
        onClose={close}
        loading={confirmLoading}
      />
    </>
  );
};

export default LeadersPage;
