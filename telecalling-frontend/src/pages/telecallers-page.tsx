'use client'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchUsers, deleteUser } from '@/features/users/user-thunk'
import { createGoal } from '@/features/goals/goal-thunk'
import DataTableClean from '@/components/data-table'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { useSetAtom } from 'jotai'
import { createUserAtom, editUserAtom } from '@/modals/jotai/users-modal-atom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/hooks/use-confirm'
import { ConfirmDialog } from '@/modals/confirm-dialog'

export const TelecallersPage = () => {
  const dispatch = useAppDispatch()
  const { telecallers, loading } = useAppSelector((s) => s.users)
  const setCreate = useSetAtom(createUserAtom)
  const setEdit = useSetAtom(editUserAtom)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [goalValue, setGoalValue] = useState('')
  const { open, title, message, confirm, close, onConfirm } = useConfirmDialog()
  const [confirmLoading, setConfirmLoading] = useState(false)


  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = (() => {
    const v = parseInt(searchParams.get('page') || '', 10);
    return Number.isFinite(v) && v > 0 ? v : 1;
  })();

  const initialPageSize = (() => {
    const v = parseInt(searchParams.get('pageSize') || '', 10);
    return Number.isFinite(v) && v > 0 ? v : 50;
  })();

  const initialQuery = searchParams.get('q') || '';

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    sp.set('page', String(page));
    sp.set('pageSize', String(pageSize));
    if (query && query.trim().length) sp.set('q', query.trim());
    else sp.delete('q');
    setSearchParams(sp, { replace: true });
  }, [page, pageSize, query, searchParams, setSearchParams]);

  useEffect(() => {
    dispatch(
      fetchUsers({
        page,
        pageSize,
        role: 'telecaller',
        search: query || undefined,
      })
    );
  }, [dispatch, page, pageSize, query]);

  const handleGoalSubmit = async (user: any) => {
    if (!goalValue) return;
    try {
      await dispatch(
        createGoal({
          userId: user.id,
          type: 'weekly_calls',
          target: Number(goalValue),
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        })
      ).unwrap();
      toast.success(`Goal updated for ${user.firstName}`);
      setEditingGoal(null);
      // Re-fetch with current page/pageSize/query persisted in URL
      dispatch(
        fetchUsers({
          page,
          pageSize,
          role: 'telecaller',
          search: query || undefined,
        })
      );
    } catch {
      toast.error('Failed to set goal');
    }
  };

  const handleDelete = (user: any) => {
    confirm({
      title: 'Delete Telecaller',
      message: `Are you sure you want to delete ${user.firstName}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await dispatch(deleteUser(user.id)).unwrap();
          toast.success(`${user.firstName} deleted successfully`);
          // Re-fetch with current page/pageSize/query persisted in URL
          dispatch(
            fetchUsers({
              page,
              pageSize,
              role: 'telecaller',
              search: query || undefined,
            })
          );
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
      render: (r: any) => r.fullName || `${r.firstName ?? ''} ${r.lastName ?? ''}`,
    },
    { key: 'email', header: 'Email', render: (r: any) => r.email || '—' },
    { key: 'phone', header: 'Phone', render: (r: any) => r.phone || '—' },
    {
      key: 'goal',
      header: 'Weekly Goal',
      render: (user: any) => {
        const currentGoal = user.weeklyGoal?.target ?? null
        const isEditing = editingGoal === user.id
        return (
          <div className="flex items-center">
            {isEditing ? (
              <Input
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                autoFocus
                className="w-20 h-8 text-center"
                onBlur={() => handleGoalSubmit(user)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoalSubmit(user)}
              />
            ) : (
              <button
                onClick={() => {
                  setEditingGoal(user.id)
                  setGoalValue(String(currentGoal || ''))
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                {currentGoal ? currentGoal : 'Set goal'}
              </button>
            )}
          </div>
        )
      },
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
  ]

  const handlers = useMemo(
    () => ({
      onQueryChange: (q: any) => {
        if (q?.page) setPage(q.page);
        if (q?.pageSize) setPageSize(q.pageSize);
        if (typeof q?.query === 'string') setQuery(q.query);
      },
    }),
    []
  );

  return (
    <>
      <div className="container mx-auto">
        <DataTableClean
          title="Telecallers"
          toolbarActions={
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              onClick={() => setCreate({ open: true, mode: 'telecaller' })}
            >
              + New Telecaller
            </Button>
          }
          columns={columns}
          rows={Array.isArray(telecallers) ? telecallers : []}
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
  )
}

export default TelecallersPage