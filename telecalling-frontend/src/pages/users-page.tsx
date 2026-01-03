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

const roleColors: Record<string, string> = {
  admin:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
  leader: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  telecaller:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
};

const UsersPage = () => {
  const dispatch = useAppDispatch();
  const { all, leaders, telecallers, loading } = useAppSelector((s) => s.users);
  const [filterRole, setFilterRole] = useState('');

  const rows = useMemo(() => {
    console.log(filterRole, 'check');
    if (filterRole === 'leader') return leaders;
    if (filterRole === 'telecaller') return telecallers;
    return all;
  }, [filterRole, all, leaders, telecallers]);
  const setCreate = useSetAtom(createUserAtom);
  const setEdit = useSetAtom(editUserAtom);
  const { open, title, message, confirm, close, onConfirm } =
    useConfirmDialog();
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Fetch all users on mount
  useEffect(() => {
    dispatch(fetchUsers({ page: 1, pageSize: 50 }));
  }, [dispatch]);

  const handleDelete = (user: any) => {
    confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.firstName}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await dispatch(deleteUser(user.id)).unwrap();
          toast.success(`${user.firstName} deleted successfully`);
        } catch {
          toast.error('Failed to delete user');
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
        setFilterRole(q?.filters?.role || '');
        console.log(q.filter, q);
        dispatch(
          fetchUsers({
            page: q.page,
            pageSize: q.pageSize,
            role: q.filters.role,
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
          title="Users"
          toolbarActions={
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={() => setCreate({ open: true })}
            >
              + New User
            </Button>
          }
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          handlers={handlers}
          serverSearchMode="manual"
          filters={[
            {
              type: 'select',
              key: 'role',
              label: 'Role',
              options: [
                // { label: 'All', value: '' },
                // { label: 'Admin', value: 'admin' },
                { label: 'Leader', value: 'leader' },
                { label: 'Telecaller', value: 'telecaller' },
              ],
            },
          ]}
          rightActionsFor={(user) => (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEdit({ open: true, user, mode: 'default' })}
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

export default UsersPage;
