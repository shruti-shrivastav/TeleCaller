import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import {
  fetchLeads,
  updateLead,
  bulkUpdateLeads,
  bulkAssignLeads,
  updateLeadStatus,
  deleteLead,
  bulkUploadLeads,
  // EXPORT: import the thunk
  exportLeadsFile,
} from '@/features/leads/lead-thunk';
import DataTableClean from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/hooks/use-confirm';
import { ConfirmDialog } from '@/modals/confirm-dialog';
import {
  Pencil,
  CheckCircle,
  Users,
  Trash2,
  PhoneCall,
  Upload,
  Download,
} from 'lucide-react';
import { useSetAtom } from 'jotai';
import {
  bulkUploadResultAtom,
  createLeadAtom,
  editLeadAtom,
} from '@/modals/jotai/leads-modal-atom';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from '@/components/ui/command';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { fetchUsers, searchTelecallers } from '@/features/users/user-thunk';
import { useAuth } from '@/hooks/use-auth';
import { useDebounce } from 'use-debounce';
import LeadCallsSheet from '@/components/lead-call-sheet';
import { fetchCallLogs } from '@/features/calls/call-thunk';
import { Input } from '@/components/ui/input';
// EXPORT: checkbox for status multi-select
import { Checkbox } from '@/components/ui/checkbox';

const statusColors: Record<string, string> = {
  new: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  in_progress:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  callback:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  dead: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

const behaviourColors: Record<string, string> = {
  cold: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  warm: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  hot: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  if (diff < 2419200) return `${Math.floor(diff / 604800)} w ago`;
  return date.toLocaleDateString();
}

// EXPORT: tiny helpers
const iso = (d: Date) => d.toISOString().slice(0, 10);
const todayISO = iso(new Date());

export default function LeadsPage() {
  const dispatch = useAppDispatch();
  const { role } = useAuth();
  const { list, total, loading, /* EXPORT: state from slice */ exporting } =
    useAppSelector((s: any) => s.leads);

  const {
    telecallers,
    telecallerSearch,
    loading: usersLoading,
  } = useAppSelector((s) => s.users);

  const setCreate = useSetAtom(createLeadAtom);
  // const setEdit = useSetAtom(editLeadAtom);
  const setState = useSetAtom(bulkUploadResultAtom);
  const { open, title, message, confirm, close, onConfirm } =
    useConfirmDialog();

  const urlParams = new URLSearchParams(window.location.search);
  const initialPage = parseInt(urlParams.get('page') || '1', 10);
  const initialPageSize = parseInt(urlParams.get('pageSize') || '20', 10);
  const initialQuery = urlParams.get('query') || '';
  const initialStatus = urlParams.get('status') || '';

  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkBehaviour, setBulkBehaviour] = useState<string>('');
  const [assignTo, setAssignTo] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const currentQuery = useRef<Record<string, any>>({
    page: initialPage,
    pageSize: initialPageSize,
    query: initialQuery,
    filters: { status: initialStatus },
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const lastSearched = useRef<string>('');
  const [isCallSheetOpen, setIsCallSheetOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // EXPORT: export panel UI state
  type ExportScope = 'all' | 'today' | 'date' | 'range';
  type ExportFormat = 'xlsx' | 'csv';
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx');
  const [exportDate, setExportDate] = useState<string>(todayISO);
  const [exportStart, setExportStart] = useState<string>(todayISO);
  const [exportEnd, setExportEnd] = useState<string>(todayISO);
  const [exportStatuses, setExportStatuses] = useState<string[]>(
    initialStatus ? [initialStatus] : []
  );

  const syncFromTableFilter = () => {
    const s = currentQuery.current?.filters?.status;
    setExportStatuses(s ? [s] : []);
    toast.success('Synced status from table filter');
  };

  const toggleStatus = (val: string) => {
    setExportStatuses((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const validateExport = (): string | null => {
    if (exportScope === 'date' && !exportDate) return 'Select a date.';
    if (exportScope === 'range') {
      if (!exportStart || !exportEnd)
        return 'Start and end dates are required.';
      if (exportEnd < exportStart)
        return 'End date cannot be before start date.';
    }
    return null;
  };

  const handleExport = async () => {
    const err = validateExport();
    if (err) {
      toast.error(err);
      return;
    }

    // compose query for backend
    const q: Record<string, string> = {
      scope: exportScope,
      format: exportFormat,
    };
    if (exportStatuses.length) q.status = exportStatuses.join(',');

    if (exportScope === 'date') q.date = exportDate;
    if (exportScope === 'range') {
      q.start = exportStart;
      q.end = exportEnd;
    }

    // nice file name
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const scopePart =
      exportScope === 'all'
        ? 'all'
        : exportScope === 'today'
        ? 'today'
        : exportScope === 'date'
        ? exportDate
        : `${exportStart}_${exportEnd}`;
    const statusPart = exportStatuses.length
      ? `_${exportStatuses.join('-')}`
      : '';
    const fileName = `leads_${scopePart}${statusPart}_${stamp}.${exportFormat}`;

    try {
      await dispatch(
        exportLeadsFile({
          ...q,
          fileName,
        }) as any
      ).unwrap();
      setExportOpen(false);
      toast.success('Export started');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };

  useEffect(() => {
    dispatch(fetchUsers({ role: 'telecaller', pageSize: 50 }));
  }, [dispatch]);

  useEffect(() => {
    const term = debouncedSearch.trim();
    if (!isAssignOpen) return;
    if (term.length < 2) return;

    if (term !== lastSearched.current) {
      lastSearched.current = term;
      dispatch(searchTelecallers({ search: term }));
    }
  }, [debouncedSearch, isAssignOpen, dispatch]);

  useEffect(() => {
    dispatch(
      fetchLeads({
        page: initialPage,
        pageSize: initialPageSize,
        search: initialQuery,
        status: initialStatus,
      })
    );
  }, [dispatch, initialPage, initialPageSize, initialQuery, initialStatus]);

  const teleOptions = useMemo(() => {
    const term = debouncedSearch.trim();
    return term.length >= 2 ? telecallerSearch : telecallers;
  }, [debouncedSearch, telecallerSearch, telecallers]);

  const syncUrl = (q: any) => {
    const params = new URLSearchParams();
    if (q.page) params.set('page', String(q.page));
    if (q.pageSize) params.set('pageSize', String(q.pageSize));
    if (q.query) params.set('query', q.query);
    if (q.filters?.status) params.set('status', q.filters.status);
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${params}`
    );
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedRows.length === 0) return;
    confirm({
      title: 'Confirm Bulk Status Update',
      message: `Change ${selectedRows.length} lead(s) to "${bulkStatus}"?`,
      onConfirm: async () => {
        try {
          await dispatch(
            bulkUpdateLeads({ ids: selectedRows, status: bulkStatus })
          ).unwrap();
          toast.success(`Updated ${selectedRows.length} lead(s)`);
          setSelectedRows([]);
          setBulkStatus('');
          close();
          await dispatch(fetchLeads(currentQuery.current));
        } catch {
          toast.error('Failed to update leads');
        }
      },
    });
  };

  const handleBulkBehaviourUpdate = async () => {
    if (!bulkBehaviour || selectedRows.length === 0) return;
    confirm({
      title: 'Confirm Bulk Behaviour Update',
      message: `Change ${selectedRows.length} lead(s) behaviour to "${bulkBehaviour}"?`,
      onConfirm: async () => {
        try {
          await dispatch(
            bulkUpdateLeads({ ids: selectedRows, behaviour: bulkBehaviour })
          ).unwrap();
          toast.success(`Updated ${selectedRows.length} lead(s) behaviour`);
          setSelectedRows([]);
          setBulkBehaviour('');
          close();
          await dispatch(fetchLeads(currentQuery.current));
        } catch {
          toast.error('Failed to update leads behaviour');
        }
      },
    });
  };

  const handleBulkAssign = async () => {
    if (!assignTo || selectedRows.length === 0) return;
    confirm({
      title: 'Confirm Bulk Assignment',
      message: `Assign ${selectedRows.length} lead(s) to selected user?`,
      onConfirm: async () => {
        try {
          await dispatch(
            bulkAssignLeads({ ids: selectedRows, assignedTo: assignTo })
          ).unwrap();
          toast.success(`Assigned ${selectedRows.length} lead(s)`);
          setSelectedRows([]);
          setAssignTo('');
          close();
          await dispatch(fetchLeads(currentQuery.current));
        } catch {
          toast.error('Failed to assign leads');
        }
      },
    });
  };

  const handleStatusChange = async (lead: any, newStatus: string) => {
    try {
      let nextCallDate: string | undefined;

      if (newStatus === 'callback') {
        const dateInput = prompt(
          'Enter next call date/time (YYYY-MM-DD HH:mm):',
          new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16)
            .replace('T', ' ')
        );
        if (!dateInput) {
          toast.error('Next call date is required for callback status.');
          return;
        }
        nextCallDate = dateInput;
      }

      await dispatch(
        updateLeadStatus({
          id: lead.id,
          status: newStatus,
          nextCallDate,
        })
      ).unwrap();

      toast.success(`Status updated to "${newStatus}"`);
      await dispatch(fetchLeads(currentQuery.current));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleBehaviourChange = async (lead: any, newBehaviour: string) => {
    try {
      await dispatch(
        updateLead({
          id: lead.id,
          data: { behaviour: newBehaviour },
        })
      ).unwrap();

      toast.success(`Behaviour updated to "${newBehaviour}"`);
      await dispatch(fetchLeads(currentQuery.current));
    } catch {
      toast.error('Failed to update behaviour');
    }
  };

  const handleDeleteLead = (lead: any) => {
    confirm({
      title: 'Delete Lead',
      message: `Are you sure you want to delete "${lead.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await dispatch(deleteLead(lead.id)).unwrap();
          toast.success('Lead deleted successfully');
          await dispatch(fetchLeads(currentQuery.current));
        } catch {
          toast.error('Failed to delete lead');
        } finally {
          close();
        }
      },
    });
  };

  const columns = [
    { key: 'name', header: 'Name', render: (r: any) => r.name || '—' },
    { key: 'phone', header: 'Phone', render: (r: any) => r.phone || '—' },
    { key: 'source', header: 'Source', render: (r: any) => r.source || '—' },
    {
      key: 'project',
      header: 'Project',
      render: (r: any) => r.project || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: any) => (
        <Select
          value={r.status || ''}
          onValueChange={(v) => handleStatusChange(r, v)}
        >
          <SelectTrigger
            className={`w-[140px] capitalize text-xs font-medium ${
              statusColors[r.status] || 'bg-gray-200 text-gray-800'
            }`}
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new" disabled={r.status !== 'new'}>
              New
            </SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="callback">Callback</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="dead">Dead</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'behaviour',
      header: 'Behaviour',
      render: (r: any) => (
        <Select
          value={r.behaviour || ''}
          onValueChange={(v) => handleBehaviourChange(r, v)}
        >
          <SelectTrigger
            className={`w-[140px] capitalize text-xs font-medium ${
              behaviourColors[r.behaviour] || 'bg-gray-200 text-gray-800'
            }`}
          >
            <SelectValue placeholder="Select behaviour" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (r: any) => r.assignedTo?.email || '—',
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (r: any) =>
        r.createdAt ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  {formatRelativeTime(r.createdAt)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {new Date(r.createdAt).toLocaleString()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          '—'
        ),
    },
    {
      key: 'lastCallAt',
      header: 'Last Call',
      render: (r: any) =>
        r.lastCallAt ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">
                  {formatRelativeTime(r.lastCallAt)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {new Date(r.lastCallAt).toLocaleString()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          'No calls yet'
        ),
    },
  ];

  const handlers = useMemo(
    () => ({
      onQueryChange: (q: any) => {
        currentQuery.current = q;
        syncUrl(q);
        const params: Record<string, any> = {
          page: q.page,
          pageSize: q.pageSize,
        };
        if (q.filters?.status) params.status = q.filters.status;
        if (q.query?.trim()) params.search = q.query.trim();
        dispatch(fetchLeads(params));
      },
      onSelectionChange: (ids: string[]) => setSelectedRows(ids),
    }),
    [dispatch]
  );

  return (
    <div className="container mx-auto space-y-4">
      {selectedRows.length > 0 && (
        <div className="flex flex-col gap-3 bg-muted/50 p-3 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            {selectedRows.length} lead(s) selected
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {/* Status Bulk Update */}
            <div className="flex items-center gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="callback">Callback</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={!bulkStatus}
                onClick={handleBulkStatusUpdate}
                className="flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Update
              </Button>
            </div>

            {/* Behaviour Bulk Update */}
            <div className="flex items-center gap-2">
              <Select value={bulkBehaviour} onValueChange={setBulkBehaviour}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Change behaviour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={!bulkBehaviour}
                onClick={handleBulkBehaviourUpdate}
                className="flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Update
              </Button>
            </div>

            {/* Assign Bulk Update */}
            {(role === 'admin' || role === 'leader') && (
              <div className="flex items-center gap-2">
                <Popover
                  open={isAssignOpen}
                  onOpenChange={(o) => {
                    setIsAssignOpen(o);
                    if (!o) {
                      setSearch('');
                      lastSearched.current = '';
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-56 justify-between">
                      {assignTo
                        ? (
                            telecallers.find((u) => u.id === assignTo) ||
                            telecallerSearch.find((u) => u.id === assignTo)
                          )?.email || 'Assign Lead'
                        : 'Assign Lead'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search telecallers..."
                        value={search}
                        onValueChange={setSearch}
                      />
                      <CommandList>
                        {usersLoading ? (
                          <CommandEmpty>Loading...</CommandEmpty>
                        ) : teleOptions.length === 0 ? (
                          <CommandEmpty>No users found.</CommandEmpty>
                        ) : (
                          <CommandGroup heading="Telecallers">
                            {teleOptions.map((u: any) => (
                              <CommandItem
                                key={u.id}
                                onSelect={() => setAssignTo(u.id)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">
                                    {u.email}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {u.fullName || u.firstName} ({u.role})
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  disabled={!assignTo}
                  onClick={handleBulkAssign}
                  className="flex items-center gap-1"
                >
                  <Users className="w-4 h-4" />
                  Assign
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <DataTableClean
        title="Leads"
        initialPage={initialPage}
        initialPageSize={initialPageSize}
        initialQuery={initialQuery}
        initialFilters={{ status: initialStatus }}
        totalCount={total}

        ui={{ showDensityToggle: true, }}
        toolbarActions={
          <div className="flex gap-2">
            {role === 'admin' && (
              <>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setCreate({ open: true })}
                >
                  + New Lead
                </Button>
                <label className="flex items-center">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (
                        ![
                          'text/csv',
                          'application/vnd.ms-excel',
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        ].includes(file.type)
                      ) {
                        toast.error('Invalid file. Upload CSV or Excel only');
                        return;
                      }

                      setUploading(true);
                      try {
                        const result = await dispatch(
                          bulkUploadLeads(file)
                        ).unwrap();

                        if (result.failed > 0) {
                          setState({ open: true, result });
                          toast.error(`${result.failed} failed`);
                        } else {
                          toast.success(`${result.inserted} uploaded`);
                        }

                        await dispatch(fetchLeads(currentQuery.current));
                      } catch (err) {
                        toast.error('Upload failed');
                      } finally {
                        setUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    disabled={uploading}
                    onClick={() =>
                      (
                        document.querySelector(
                          'input[type="file"]'
                        ) as HTMLElement
                      )?.click()
                    }
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    {uploading ? (
                      'Uploading...'
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1" /> Bulk Upload
                      </>
                    )}
                  </Button>
                </label>
              </>
            )}

            {/* EXPORT: visible for admin & leader */}
            {(role === 'admin' || role === 'leader') && (
              <Popover open={exportOpen} onOpenChange={setExportOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Export Leads</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={syncFromTableFilter}
                    >
                      Use table filter
                    </Button>
                  </div>

                  {/* Scope */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={exportScope === 'all' ? 'default' : 'outline'}
                      onClick={() => setExportScope('all')}
                    >
                      All time
                    </Button>
                    <Button
                      variant={exportScope === 'today' ? 'default' : 'outline'}
                      onClick={() => {
                        setExportScope('today');
                        setExportDate(todayISO);
                        setExportStart(todayISO);
                        setExportEnd(todayISO);
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant={exportScope === 'date' ? 'default' : 'outline'}
                      onClick={() => setExportScope('date')}
                    >
                      Specific Day
                    </Button>
                    <Button
                      variant={exportScope === 'range' ? 'default' : 'outline'}
                      onClick={() => setExportScope('range')}
                    >
                      Date Range
                    </Button>
                  </div>

                  {/* Date pickers */}
                  {exportScope === 'date' && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Date
                      </label>
                      <Input
                        type="date"
                        value={exportDate}
                        onChange={(e) => setExportDate(e.target.value)}
                      />
                    </div>
                  )}
                  {exportScope === 'range' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Start
                        </label>
                        <Input
                          type="date"
                          value={exportStart}
                          onChange={(e) => {
                            const v = e.target.value;
                            setExportStart(v);
                            if (exportEnd && exportEnd < v) setExportEnd(v);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          End
                        </label>
                        <Input
                          type="date"
                          value={exportEnd}
                          min={exportStart || undefined}
                          onChange={(e) => setExportEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status multi-select */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Status (optional)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExportStatuses([
                              'new',
                              'in_progress',
                              'callback',
                              'closed',
                              'dead',
                            ])
                          }
                        >
                          All
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExportStatuses([])}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {['new', 'in_progress', 'callback', 'closed', 'dead'].map(
                        (s) => (
                          <label
                            key={s}
                            className="flex items-center gap-2 rounded border px-2 py-1"
                          >
                            <Checkbox
                              checked={exportStatuses.includes(s)}
                              onCheckedChange={() => toggleStatus(s)}
                            />
                            <span className="capitalize text-sm">
                              {s.replace('_', ' ')}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  {/* Format */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={
                          exportFormat === 'xlsx' ? 'default' : 'outline'
                        }
                        onClick={() => setExportFormat('xlsx')}
                      >
                        XLSX
                      </Button>
                      <Button
                        variant={exportFormat === 'csv' ? 'default' : 'outline'}
                        onClick={() => setExportFormat('csv')}
                      >
                        CSV
                      </Button>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? (
                      'Preparing…'
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </>
                    )}
                  </Button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        }
        selectableRows
        selectedRows={selectedRows}
        columns={columns}
        rows={Array.isArray(list) ? list : []}
        rowKey={(r) => r.id}
        loading={loading}
        handlers={handlers}
        serverSearchMode="manual"
        filters={[
          {
            type: 'select',
            key: 'status',
            label: 'Status',
            options: [
              { label: 'New', value: 'new' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Callback', value: 'callback' },
              { label: 'Closed', value: 'closed' },
              { label: 'Dead', value: 'dead' },
            ],
          },
        ]}
        rightActionsFor={(lead) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSelectedLead(lead);
                setIsCallSheetOpen(true);
                dispatch(fetchCallLogs({ leadId: lead.id }) as any);
              }}
            >
              <PhoneCall className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => handleDeleteLead(lead)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />

      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        onConfirm={onConfirm}
        onClose={close}
      />
      <LeadCallsSheet
        open={isCallSheetOpen}
        onOpenChange={(isOpen) => {
          setIsCallSheetOpen(isOpen);
          if (!isOpen) {
            dispatch(fetchLeads(currentQuery.current));
          }
        }}
        lead={selectedLead}
      />
    </div>
  );
}
