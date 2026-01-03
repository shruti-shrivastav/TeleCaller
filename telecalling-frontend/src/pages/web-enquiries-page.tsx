import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import {
  fetchEnquiries,
  updateEnquiryStatus,
} from '@/features/enquiries/enquiry-thunk';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DataTableClean from '@/components/data-table';

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'done', label: 'Done' },
];

export default function WebEnquiriesPage() {
  const dispatch = useAppDispatch();
  const { role } = useAuth();
  const { list, total, page, pageSize, loading } = useAppSelector(
    (s: any) => s.enquiries
  );

  const urlParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const initialPage = parseInt(urlParams.get('page') || '1', 10);
  const initialPageSize = parseInt(urlParams.get('pageSize') || '20', 10);
  const initialQuery = urlParams.get('q') || '';
  const initialStatus = urlParams.get('status') || 'all';

  const [search, setSearch] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [pageSizeState, setPageSizeState] = useState(
    Number.isFinite(initialPageSize) && initialPageSize > 0
      ? initialPageSize
      : 20
  );

  const syncUrl = useCallback(
    (p: number, ps: number, q: string, st: string) => {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(ps));
      if (q) params.set('q', q);
      if (st && st !== 'all') params.set('status', st);
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${params}`
      );
    },
    []
  );

  const load = useCallback(
    (opts?: {
      page?: number;
      pageSize?: number;
      q?: string;
      status?: string;
    }) => {
      const statusFilter = opts?.status ?? status;
      const statusForApi = statusFilter === 'all' ? undefined : statusFilter;
      const payload = {
        page: opts?.page ?? page ?? initialPage ?? 1,
        pageSize:
          opts?.pageSize ?? pageSize ?? pageSizeState ?? initialPageSize ?? 20,
        q: opts?.q ?? search,
        status: statusForApi,
      };
      syncUrl(
        payload.page,
        payload.pageSize,
        payload.q || '',
        statusFilter || 'all'
      );
      dispatch(fetchEnquiries(payload) as any);
    },
    [
      dispatch,
      initialPage,
      initialPageSize,
      page,
      pageSize,
      pageSizeState,
      search,
      status,
      syncUrl,
    ]
  );

  useEffect(() => {
    load({
      page: initialPage,
      pageSize: initialPageSize,
      q: initialQuery,
      status: initialStatus,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = useCallback(
    async (id: string, next: 'new' | 'done') => {
      try {
        await dispatch(
          updateEnquiryStatus({ id, status: next }) as any
        ).unwrap();
        toast.success('Status updated');
        load();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update status');
      }
    },
    [dispatch, load]
  );

  const handlers = useMemo(
    () => ({
      onQueryChange: ({ page: p, pageSize: ps, query, filters } : any) => {
        setPageSizeState(ps);
        const statusFilter = filters.status ?? status ?? 'all';
        setStatus(statusFilter);
        if (query !== undefined) setSearch(query);
        load({
          page: p,
          pageSize: ps,
          q: query,
          status: statusFilter,
        });
      },
    }),
    [load, status]
  );

  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 20)));

  if (role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            You must be an admin to view website enquiries.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Website Enquiries</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search name, email, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => load({ page: 1 })} disabled={loading}>
            {loading ? 'Loading...' : 'Apply'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Enquiries ({total}) · Page {page || 1} / {totalPages}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableClean
            columns={[
              {
                key: 'name',
                header: 'Name',
                render: (r: any) => r.name || '—',
              },
              {
                key: 'email',
                header: 'Email',
                render: (r: any) => r.email || '—',
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (r: any) => r.phone || '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: any) => (
                  <Badge
                    variant={r.status === 'done' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {r.status}
                  </Badge>
                ),
              },
              {
                key: 'createdAt',
                header: 'Created At',
                render: (r: any) =>
                  r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r: any) => (
                  <Select
                    value={r.status}
                    onValueChange={(v) =>
                      handleStatusChange(r.id, v as 'new' | 'done')
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                ),
              },
            ]}
            rows={list}
            rowKey={(r: any) => r.id || r._id}
            totalCount={total}
            initialQuery={initialQuery}
            initialFilters={{ status }}
            initialPage={page || initialPage || 1}
            initialPageSize={pageSize || pageSizeState || initialPageSize || 20}
            loading={loading}
            handlers={handlers}
            filters={[
              {
                type: 'select',
                key: 'status',
                label: 'Status',
                options: statusOptions.map((s) => ({
                  label: s.label,
                  value: s.value,
                })),
              },
            ]}
            ui={{ showDensityToggle: true }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
