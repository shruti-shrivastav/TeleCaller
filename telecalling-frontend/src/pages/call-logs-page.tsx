import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { fetchCallLogs } from '@/features/calls/call-thunk';
import { fetchLeads } from '@/features/leads/lead-thunk';
import {
  fetchUsers,
  fetchUserById,
  fetchTelecallerLeads,
  fetchTelecallerCalls,
  fetchTelecallerDashboard,
} from '@/features/users/user-thunk';
import DataTableClean from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Search,
  Phone,
  PhoneOff,
  Clock,
  Calendar,
  MessageCircle,
  RefreshCw,
  User,
  Shield,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  UsersIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/* ------------------------------ UI helpers ------------------------------ */

const statusColors: Record<string, string> = {
  completed:
    'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  'no-answer':
    'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  busy: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  failed:
    'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  connected:
    'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  'not-connected':
    'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  answered:
    'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  missed:
    'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  callback:
    'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  converted:
    'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  completed: <Phone className="h-3 w-3" />,
  'no-answer': <PhoneOff className="h-3 w-3" />,
  busy: <Clock className="h-3 w-3" />,
  failed: <PhoneOff className="h-3 w-3" />,
  connected: <Phone className="h-3 w-3" />,
  'not-connected': <PhoneOff className="h-3 w-3" />,
  answered: <Phone className="h-3 w-3" />,
  missed: <PhoneOff className="h-3 w-3" />,
  callback: <Clock className="h-3 w-3" />,
  converted: <Phone className="h-3 w-3" />,
};

const pickArray = (payload: any, keys: string[] = []) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const k of keys) {
    const v = payload?.[k];
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const pickValue = <T = any,>(...vals: any[]): T | undefined =>
  vals.find((v: any) => v !== undefined && v !== null);

const isoToLocalDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString() : '';

// Robust positive-int parser for URL params
const toPosInt = (v: string | null, fallback = 1) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/* ------------------------------ Types ------------------------------ */

interface CallLog {
  id?: string;
  _id?: string;
  telecallerId: string | { _id?: string; id?: string };
  leadId: string | { _id?: string; id?: string };
  result: string;
  remarks?: string;
  createdAt: string;
  lead?: {
    id?: string;
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
    status?: string;
  };
}

interface LeadRow {
  id?: string;
  _id?: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  createdAt?: string;
  assignedTo?: { fullName?: string; id?: string };
  project?: string;
}

/* ------------------------------ Unauthorized ------------------------------ */

function UnauthorizedAccess() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto text-center py-16">
        <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-6">
          <Shield className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Unauthorized Access
        </h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to view this page. This section is only
          accessible to administrators and team leaders.
        </p>
        <Button
          onClick={() => window.history.back()}
          className="bg-primary text-white"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Filter Components ------------------------------ */

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function StatusFilter({
  value,
  onChange,
  options,
  placeholder = 'Filter by status',
}: StatusFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          className="h-8 w-8 p-0 hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ Main Page ------------------------------ */

type TabKey = 'dashboard' | 'leads' | 'calls';

export function CallLogsPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const setParamsSafe = useCallback(
    (patch: Record<string, string | undefined | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      const currStr = searchParams.toString();
      const nextStr = next.toString();
      if (nextStr !== currStr) {
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams]
  );

  const { items: callLogs, loading: callsLoading } = useAppSelector(
    (s) => s.calls
  );
  const { list: leads, loading: leadsLoading } = useAppSelector((s) => s.leads);
  const {
    telecallers,
    selectedUser,
    loading: usersLoading,
  } = useAppSelector((s) => s.users as any);
  const { role, user } = useAuth();

  const updateUrl = useCallback(
    (patch: Record<string, string | undefined | null>) => {
      setParamsSafe(patch);
    },
    [setParamsSafe]
  );

  const activeTab: TabKey = useMemo(() => {
    const t = (searchParams.get('tab') || '').toLowerCase();
    return t === 'dashboard' || t === 'leads' || t === 'calls'
      ? (t as TabKey)
      : 'calls';
  }, [searchParams]);

  // Filters state
  type FiltersState = 'open' | 'mini';
  const filtersState = (searchParams.get('fs') || 'open') as FiltersState;
  const filtersOpen = filtersState !== 'mini';
  const setFiltersOpen = useCallback(
    (open: boolean) => updateUrl({ fs: open ? 'open' : 'mini' }),
    [updateUrl]
  );

  // Mobile sheet toggle
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // URL parameters
  const selectedTelecaller = searchParams.get('telecaller') || '';
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';
  const leadStatusFilter = searchParams.get('leadStatus') || '';
  const callResultFilter = searchParams.get('callResult') || '';

  // Server pagination state
  const leadsPage = toPosInt(searchParams.get('lpage'), 1);
  const leadsPageSize = toPosInt(searchParams.get('lps'), 20);
  const callsPage = toPosInt(searchParams.get('cpage'), 1);
  const callsPageSize = toPosInt(searchParams.get('cps'), 20);

  // Telecaller list pager/search
  const telePage = toPosInt(searchParams.get('tpage'), 1);
  const telePageSize = toPosInt(searchParams.get('tps'), 30);
  const teleQuery = (searchParams.get('tq') || '').trim();

  const lastGlobalLeadsKey = useRef('');
  const lastGlobalCallsKey = useRef('');
  const lastDashKey = useRef('');
  const lastTeleLeadsKey = useRef('');
  const lastTeleCallsKey = useRef('');

  // Filter options
  const leadStatusOptions = [
    { value: 'new', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'callback', label: 'Callback' },
    { value: 'closed', label: 'Closed' },
    { value: 'dead', label: 'Dead' },
  ];

  const callResultOptions = [
    { value: '', label: 'All' },
    { value: 'answered', label: 'Answered' },
    { value: 'missed', label: 'Missed' },
    { value: 'callback', label: 'Callback' },
    { value: 'converted', label: 'Converted' },
  ];

  // Active filters count for badge
  const activeFiltersCount =
    (selectedTelecaller ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (leadStatusFilter ? 1 : 0) +
    (callResultFilter ? 1 : 0);

  // Set default URL parameters once
  useEffect(() => {
    const patch: Record<string, string> = {};
    if (!searchParams.get('lpage')) patch['lpage'] = '1';
    if (!searchParams.get('lps')) patch['lps'] = '20';
    if (!searchParams.get('cpage')) patch['cpage'] = '1';
    if (!searchParams.get('cps')) patch['cps'] = '20';
    if (!searchParams.get('tpage')) patch['tpage'] = '1';
    if (!searchParams.get('tps')) patch['tps'] = '30';
    if (!searchParams.get('tab')) patch['tab'] = 'calls';
    if (Object.keys(patch).length) {
      setParamsSafe(patch);
    }
  }, [setParamsSafe, searchParams]);

  // Safety: auto-switch off Dashboard if no telecaller selected
  useEffect(() => {
    if (!selectedTelecaller && activeTab === 'dashboard') {
      updateUrl({ tab: 'calls' });
    }
  }, [selectedTelecaller, activeTab, updateUrl]);

  /* ------------------------------ Data fetching ------------------------------ */

  // Telecaller list for sidebar (paginated search)
  const [teleQueryInput, setTeleQueryInput] = useState(teleQuery);
  useEffect(() => setTeleQueryInput(teleQuery), [teleQuery]);

  useEffect(() => {
    if ((teleQueryInput || '') === (teleQuery || '')) return;
    const id = window.setTimeout(
      () => updateUrl({ tq: teleQueryInput || null, tpage: '1' }),
      300
    );
    return () => window.clearTimeout(id);
  }, [teleQueryInput, teleQuery, updateUrl]);

  useEffect(() => {
    if (!user) return;
    const base: any = {
      page: telePage,
      pageSize: telePageSize,
      role: 'telecaller',
      search: teleQuery || undefined,
    };
    if (role === 'telecaller' && (user as any)?.leaderId) {
      base.leaderId = (user as any).leaderId;
    }
    dispatch(fetchUsers(base));
  }, [dispatch, user, role, telePage, telePageSize, teleQuery]);

  // Global data fetching (no telecaller selected)
  useEffect(() => {
    if (selectedTelecaller || activeTab !== 'leads') return;
    const key = `leads|${leadsPage}|${leadsPageSize}|${leadStatusFilter}`;
    if (key === lastGlobalLeadsKey.current) return;
    lastGlobalLeadsKey.current = key;

    const params: any = { page: leadsPage, pageSize: leadsPageSize };
    if (leadStatusFilter) params.status = leadStatusFilter;
    dispatch(fetchLeads(params));
  }, [
    dispatch,
    selectedTelecaller,
    activeTab,
    leadsPage,
    leadsPageSize,
    leadStatusFilter,
  ]);

  useEffect(() => {
    if (selectedTelecaller || activeTab !== 'calls') return;
    const key = `calls|${callsPage}|${callsPageSize}|${callResultFilter}`;
    if (key === lastGlobalCallsKey.current) return;
    lastGlobalCallsKey.current = key;

    const params: any = { page: callsPage, pageSize: callsPageSize };
    if (callResultFilter) params.result = callResultFilter;
    dispatch(fetchCallLogs(params));
  }, [
    dispatch,
    selectedTelecaller,
    activeTab,
    callsPage,
    callsPageSize,
    callResultFilter,
  ]);

  // Load profile once per telecaller
  useEffect(() => {
    if (!selectedTelecaller) return;
    dispatch(fetchUserById(selectedTelecaller));
  }, [dispatch, selectedTelecaller]);

  // Dashboard per telecaller
  // Dashboard per telecaller (now sends range/start/end to API)
  useEffect(() => {
    if (!selectedTelecaller) return;

    const range = startDate && endDate ? 'custom' : 'day'; // default backend is "day"
    const params: any = { range };
    if (range === 'custom') {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const dashKey = `${selectedTelecaller}|${params.range}|${
      params.startDate || ''
    }|${params.endDate || ''}`;
    if (dashKey === lastDashKey.current) return;
    lastDashKey.current = dashKey;

    // If your thunk supports (userId, params)
    // dispatch(fetchTelecallerDashboard(selectedTelecaller, params));

    // If your thunk supports a single object, use this:
    dispatch(
      fetchTelecallerDashboard({ userId: selectedTelecaller, ...params })
    );
  }, [dispatch, selectedTelecaller, startDate, endDate]);

  // Tab-scoped telecaller lists
  useEffect(() => {
    if (!selectedTelecaller) return;
    const range = startDate && endDate ? 'custom' : 'all';

    if (activeTab === 'leads') {
      const key = `${selectedTelecaller}|L|${range}|${startDate || ''}|${
        endDate || ''
      }|${leadsPage}|${leadsPageSize}|${leadStatusFilter}`;
      if (key !== lastTeleLeadsKey.current) {
        lastTeleLeadsKey.current = key;
        const params: any = {
          userId: selectedTelecaller,
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: leadsPage,
          pageSize: leadsPageSize,
        };
        if (leadStatusFilter) params.status = leadStatusFilter;
        dispatch(fetchTelecallerLeads(params));
      }
    }

    if (activeTab === 'calls') {
      const key = `${selectedTelecaller}|C|${range}|${startDate || ''}|${
        endDate || ''
      }|${callsPage}|${callsPageSize}|${callResultFilter}`;
      if (key !== lastTeleCallsKey.current) {
        lastTeleCallsKey.current = key;
        const params: any = {
          userId: selectedTelecaller,
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: callsPage,
          pageSize: callsPageSize,
        };
        if (callResultFilter) params.result = callResultFilter;
        dispatch(fetchTelecallerCalls(params));
      }
    }
  }, [
    dispatch,
    selectedTelecaller,
    activeTab,
    startDate,
    endDate,
    leadsPage,
    leadsPageSize,
    leadStatusFilter,
    callsPage,
    callsPageSize,
    callResultFilter,
  ]);

  /* ------------------------------ Derived lists & helpers ------------------------------ */

  // Telecaller list (current server page)
  const allTelecallers = useMemo(() => {
    if (!Array.isArray(telecallers)) return [];
    return telecallers.map((m: any) => ({
      id: m.id ?? m._id,
      fullName:
        m.fullName ||
        [m.firstName, m.lastName].filter(Boolean).join(' ') ||
        'Unknown Telecaller',
      email: m.email,
    }));
  }, [telecallers]);

  const telecallerNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of allTelecallers) if (t.id) map[t.id] = t.fullName;
    return map;
  }, [allTelecallers]);

  const selectedTelecallerName =
    selectedTelecaller &&
    (telecallerNameById[selectedTelecaller] || 'Selected');

  const teleLeadsPayload = useAppSelector(
    (s) =>
      (s.users as any)?.telecallerLeads?.[selectedTelecaller] ??
      (selectedUser as any)?.leadsData
  );
  const teleCallsPayload = useAppSelector(
    (s) =>
      (s.users as any)?.telecallerCalls?.[selectedTelecaller] ??
      (selectedUser as any)?.callsData
  );
  const teleDashboard = useAppSelector(
    (s) =>
      (s.users as any)?.telecallerDashboard?.[selectedTelecaller] ??
      (selectedUser as any)?.dashboard
  );

  // Arrays from payloads
  const callsArr = useMemo(() => {
    if (selectedTelecaller) {
      return pickArray(teleCallsPayload, ['logs', 'items']) as CallLog[];
    }
    return Array.isArray(callLogs) ? callLogs : [];
  }, [teleCallsPayload, callLogs, selectedTelecaller]);

  const teleLeadsArr = useMemo(
    () => pickArray(teleLeadsPayload, ['leads', 'items']) as LeadRow[],
    [teleLeadsPayload]
  );

  const globalLeadsArr = useMemo(() => {
    if (Array.isArray(leads)) return leads as LeadRow[];
    if (leads && Array.isArray(leads)) return leads as LeadRow[];
    return [];
  }, [leads]);

  // Range from Dashboard API only (for chip)
  const dashRange = (teleDashboard as any)?.dateRange;
  const rangeStartDisp =
    startDate ||
    (dashRange?.start ? new Date(dashRange.start).toLocaleDateString() : '');
  const rangeEndDisp =
    endDate ||
    (dashRange?.end ? new Date(dashRange.end).toLocaleDateString() : '');

  // KPIs and breakdowns (Dashboard)
  // KPIs and breakdowns (Dashboard ONLY)
  // Total calls: prefer dashboard.performance.totalCalls -> totals.calls -> fallback to recentCalls length
  // Dashboard-dedicated helpers
  const dash: any = teleDashboard || {};
  const totals = dash.totals || {};
  const todayBlock = dash.today || {};
  const periodBlock = dash.period || {};
  const distributions = dash.distributions || {};
  const weeklyGoal: any = dash.performance?.weeklyGoal || null;

  // Breakdown dicts straight from API (range-scoped)
  const callStats = useMemo(() => {
    const by = (distributions.callsByResult || {}) as Record<string, number>;
    const total =
      typeof totals.calls === 'number'
        ? totals.calls
        : Object.values(by).reduce((a, b) => a + Number(b || 0), 0);
    return { total, byStatus: by };
  }, [distributions, totals]);

  const leadStats = useMemo(() => {
    const by = (distributions.leadsByStatus || {}) as Record<string, number>;
    const total =
      typeof totals.leads === 'number'
        ? totals.leads
        : Object.values(by).reduce((a, b) => a + Number(b || 0), 0);
    return { total, byStatus: by };
  }, [distributions, totals]);

  /* ------------------------------ Normalized rows ------------------------------ */

  // Helper to extract id
  const getId = (v: any): string | undefined => {
    if (!v) return undefined;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v._id ?? v.id ?? undefined;
    return undefined;
  };

  type CallRow = {
    id: string;
    telecallerId?: string;
    result: string;
    remarks?: string;
    createdAt: string;
    leadId?: { id?: string; name?: string; phone?: string; email?: string };
  };

  const normalizeCall = (log: any): CallRow => {
    const teleId =
      getId(log.telecallerId) ?? getId(log.telecaller) ?? log.telecaller?.id;

    // Prefer `log.lead` (kept by slice), else use embedded object in `leadId`
    const leadObj =
      (typeof log.lead === 'object' && log.lead) ||
      (typeof log.leadId === 'object' && log.leadId) ||
      undefined;

    const leadId = getId(leadObj) ?? getId(log.leadId);

    return {
      id:
        log.id ??
        log._id ??
        `${leadId || 'lead'}-${log.createdAt ?? ''}-${log.result ?? 'unknown'}`,
      telecallerId: teleId,
      result: (log.result || log.status || 'unknown') as string,
      remarks: log.remarks || log.comment || '',
      createdAt: log.createdAt || log.time || log.date,
      leadId: {
        id: leadId,
        name:
          leadObj?.name ??
          log.leadName ??
          log.customerName ??
          log.leadId?.fullName ??
          '',
        phone: leadObj?.phone ?? log.phone ?? log.leadPhone ?? '',
        email: leadObj?.email ?? log.email ?? '',
      },
    };
  };
  // Choose the right source: telecaller cache vs global slice
  const callsSourceRaw = selectedTelecaller
    ? (callsArr as any[])
    : Array.isArray(callLogs)
    ? (callLogs as any[])
    : [];

  const callsRows = useMemo(
    () =>
      (callsSourceRaw || [])
        .map(normalizeCall)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [callsSourceRaw]
  );

  // Filter by date only (telecaller scope already applied above when selected)
  const filteredCallsRows = useMemo(() => {
    let out = callsRows;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      out = out.filter((r) => {
        const d = new Date(r.createdAt);
        d.setHours(0, 0, 0, 0);
        return d >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      out = out.filter((r) => new Date(r.createdAt) <= end);
    }
    return out;
  }, [callsRows, startDate, endDate]);

  // Leads table rows (telecaller vs global)
  const leadsRowsBase: LeadRow[] = useMemo(
    () => (selectedTelecaller ? teleLeadsArr : globalLeadsArr),
    [selectedTelecaller, teleLeadsArr, globalLeadsArr]
  );

  const filteredLeadsRows: LeadRow[] = useMemo(() => {
    let rows = leadsRowsBase;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      rows = rows.filter((l) => {
        const d = l.createdAt ? new Date(l.createdAt) : null;
        if (!d) return true;
        d.setHours(0, 0, 0, 0);
        return d >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      rows = rows.filter((l) => {
        const d = l.createdAt ? new Date(l.createdAt) : null;
        if (!d) return true;
        return d <= end;
      });
    }

    return rows;
  }, [leadsRowsBase, startDate, endDate]);

  /* ------------------------------ Counts for header & tables ------------------------------ */

  const callsTotalCount = selectedTelecaller
    ? pickValue<number>(
        (teleDashboard as any)?.totals?.calls,
        (teleDashboard as any)?.totalCalls,
        (teleCallsPayload as any)?.total,
        (teleCallsPayload as any)?.totalItems
      ) ?? 0
    : Array.isArray(callLogs)
    ? callLogs.length
    : filteredCallsRows.length;

  const leadsTotalCount = selectedTelecaller
    ? pickValue<number>(
        (teleDashboard as any)?.totals?.leads,
        (teleDashboard as any)?.totalLeads,
        (teleLeadsPayload as any)?.total,
        (teleLeadsPayload as any)?.totalItems
      ) ?? 0
    : Array.isArray(leads)
    ? leads.length
    : filteredLeadsRows.length;

  /* ------------------------------ Tables: columns ------------------------------ */

  const callColumns = [
    {
      key: 'telecaller',
      header: 'Telecaller',
      render: (r: CallRow) => {
        const name =
          telecallerNameById[r.telecallerId || ''] ||
          selectedTelecallerName ||
          'Telecaller';
        const initial = name?.[0]?.toUpperCase() || 'T';
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300">
              {initial}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{name}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r: CallRow) => {
        const customerName = r?.leadId?.name || 'Lead';
        const secondary = r?.leadId?.email || r.leadId?.phone;
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-medium text-green-700 dark:text-green-300">
              {customerName?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{customerName}</span>
              {secondary && (
                <span className="text-xs text-muted-foreground">
                  {secondary}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (r: CallRow) => (
        <span className="font-mono text-sm text-foreground">
          {r.leadId?.phone || '—'}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Status',
      render: (r: CallRow) => {
        const k = (r.result || 'unknown').toLowerCase();
        return (
          <div className="flex items-center gap-1.5">
            {statusIcons[k] || <Phone className="h-3 w-3" />}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                statusColors[k] ||
                'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {k.replace('-', ' ') || 'unknown'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      render: (r: CallRow) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">
            {new Date(r.createdAt).toLocaleDateString()}
          </span>
          <span className="text-muted-foreground">
            {new Date(r.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (r: CallRow) => (
        <div className="flex items-start gap-1.5 max-w-[220px]">
          <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-sm text-muted-foreground line-clamp-2">
            {r.remarks || 'No remarks'}
          </span>
        </div>
      ),
    },
  ];

  const leadColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (r: LeadRow) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-medium text-green-700 dark:text-green-300">
            {(r.name || 'L')[0]}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{r.name || 'Lead'}</span>
            {r.email && (
              <span className="text-xs text-muted-foreground">{r.email}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (r: LeadRow) => (
        <span className="font-mono text-sm">{r.phone || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: LeadRow) => (
        <span className="text-xs capitalize">
          {(r.status || 'unknown').replace('-', ' ')}
        </span>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (r: LeadRow) => (
        <span className="text-xs">{r.project || '—'}</span>
      ),
    },
    {
      key: 'assigned',
      header: 'Assigned To',
      render: (r: LeadRow) => (
        <span className="text-xs">
          {r.assignedTo?.fullName || selectedTelecallerName || '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r: LeadRow) =>
        r.createdAt ? (
          <span className="text-xs">
            {new Date(r.createdAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  /* ------------------------------ Handlers ------------------------------ */

  const handleRefreshAll = () => {
    if (selectedTelecaller) {
      // always refresh dashboard
      lastDashKey.current = '';
      const range = startDate && endDate ? 'custom' : 'day';
      const p: any = { range };
      if (range === 'custom') {
        p.startDate = startDate;
        p.endDate = endDate;
      }

      dispatch(fetchTelecallerDashboard(selectedTelecaller));

      // const range = startDate && endDate ? 'custom' : 'all';
      if (activeTab === 'leads') {
        lastTeleLeadsKey.current = '';
        const p: any = {
          userId: selectedTelecaller,
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: leadsPage,
          pageSize: leadsPageSize,
        };
        if (leadStatusFilter) p.status = leadStatusFilter;
        dispatch(fetchTelecallerLeads(p));
      }
      if (activeTab === 'calls') {
        lastTeleCallsKey.current = '';
        const p: any = {
          userId: selectedTelecaller,
          range,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: callsPage,
          pageSize: callsPageSize,
        };
        if (callResultFilter) p.result = callResultFilter;
        dispatch(fetchTelecallerCalls(p));
      }
    } else {
      if (activeTab === 'leads') {
        lastGlobalLeadsKey.current = '';
        const p: any = { page: leadsPage, pageSize: leadsPageSize };
        if (leadStatusFilter) p.status = leadStatusFilter;
        dispatch(fetchLeads(p));
      }
      if (activeTab === 'calls') {
        lastGlobalCallsKey.current = '';
        const p: any = { page: callsPage, pageSize: callsPageSize };
        if (callResultFilter) p.result = callResultFilter;
        dispatch(fetchCallLogs(p));
      }
      dispatch(
        fetchUsers({
          page: telePage,
          pageSize: telePageSize,
          role: 'telecaller',
          search: teleQuery || undefined,
        })
      );
    }
  };

  const clearFilters = () => {
    updateUrl({
      telecaller: null,
      start: null,
      end: null,
      leadStatus: null,
      callResult: null,
      tab: 'calls',
      lpage: '1',
      cpage: '1',
      tq: null,
      tpage: '1',
    });
  };

  const hasActiveFilters =
    !!selectedTelecaller ||
    !!startDate ||
    !!endDate ||
    !!leadStatusFilter ||
    !!callResultFilter;

  /* ------------------------------ Render ------------------------------ */
  if (!(role === 'admin' || role === 'leader')) return <UnauthorizedAccess />;

  return (
    <div className="mx-auto max-w-screen w-full">
      <div className="flex flex-col md:flex-row gap-4">
        <aside
          className={`hidden md:block shrink-0 md:sticky md:top-4 bg-background/50 border border-muted rounded-lg transition-all duration-200
      ${filtersOpen ? 'md:w-72 lg:w-80 p-4' : 'md:w-14 lg:w-16 p-2'}`}
          aria-label="Filters"
          aria-expanded={filtersOpen}
        >
          {filtersOpen ? (
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">
                  Filters
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Collapse filters"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <FiltersBody
                startDate={startDate}
                endDate={endDate}
                hasActiveFilters={hasActiveFilters}
                clearFilters={clearFilters}
                teleQueryInput={teleQueryInput}
                setTeleQueryInput={setTeleQueryInput}
                allTelecallers={allTelecallers}
                selectedTelecaller={selectedTelecaller}
                usersLoading={usersLoading}
                telePage={telePage}
                telePageSize={telePageSize}
                updateUrl={updateUrl}
              />
            </div>
          ) : (
            // MINI RAIL
            <div className="flex flex-col items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setFiltersOpen(true)}
                aria-label="Expand filters"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="relative">
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 inline-flex items-center justify-center
                              rounded-full text-[10px] font-medium px-1 h-4 min-w-4
                              bg-primary/10 text-primary"
                    >
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                <CalendarIcon className="h-4 w-4" />
                <UsersIcon className="h-4 w-4" />
              </div>
            </div>
          )}
        </aside>
        {/* RIGHT CONTENT */}
        <main className="flex-1 min-w-0">
          <div className="bg-background/50 border border-muted rounded-lg p-4 md:p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <Sheet
                open={mobileFiltersOpen}
                onOpenChange={setMobileFiltersOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden relative"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span
                        className="ml-2 inline-flex items-center justify-center
                              rounded-full text-[10px] font-medium px-1.5 h-4
                              bg-primary/10 text-primary"
                      >
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[320px]">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="p-4 overflow-y-auto">
                    <FiltersBody
                      startDate={startDate}
                      endDate={endDate}
                      hasActiveFilters={hasActiveFilters}
                      clearFilters={clearFilters}
                      teleQueryInput={teleQueryInput}
                      setTeleQueryInput={setTeleQueryInput}
                      allTelecallers={allTelecallers}
                      selectedTelecaller={selectedTelecaller}
                      usersLoading={usersLoading}
                      telePage={telePage}
                      telePageSize={telePageSize}
                      updateUrl={updateUrl}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={callsLoading || usersLoading}
                  className="hover:bg-muted"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-1 ${
                      callsLoading || usersLoading ? 'animate-spin' : ''
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Tabs (URL-controlled) */}
            <Tabs
              value={activeTab}
              onValueChange={(v: any) => updateUrl({ tab: v })}
              className="w-full"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <TabsList>
                  <TabsTrigger value="dashboard" disabled={!selectedTelecaller}>
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                  <TabsTrigger value="calls">Calls</TabsTrigger>
                </TabsList>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-foreground hover:bg-muted"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>

              {/* DASHBOARD TAB */}
              <TabsContent value="dashboard" className="mt-0">
                {!selectedTelecaller ? (
                  <div className="text-sm text-muted-foreground">
                    Select a telecaller to view their dashboard.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {selectedTelecallerName || 'Telecaller'}
                        </h3>
                        {selectedUser?.email && (
                          <p className="text-sm text-muted-foreground">
                            {selectedUser.email}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {rangeStartDisp || rangeEndDisp ? (
                          <>
                            <span>Range:</span>
                            <span className="font-mono">
                              {rangeStartDisp || '…'}
                            </span>
                            <span>→</span>
                            <span className="font-mono">
                              {rangeEndDisp || '…'}
                            </span>
                          </>
                        ) : (
                          <span>Range: All time</span>
                        )}
                      </div>
                    </div>

                    {/* KPI Cards */}
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="border border-muted rounded-lg p-4 bg-background">
                        <div className="text-xs text-muted-foreground">
                          Total Calls
                        </div>
                        <div className="text-2xl font-semibold text-foreground mt-1">
                          {Number.isFinite(totals.calls) ? totals.calls : 0}
                        </div>
                      </div>

                      <div className="border border-muted rounded-lg p-4 bg-background">
                        <div className="text-xs text-muted-foreground">
                          Total Leads
                        </div>
                        <div className="text-2xl font-semibold text-foreground mt-1">
                          {Number.isFinite(totals.leads) ? totals.leads : 0}
                        </div>
                      </div>

                      <div className="border border-muted rounded-lg p-4 bg-background">
                        <div className="text-xs text-muted-foreground">
                          Today’s Calls
                        </div>
                        <div className="text-2xl font-semibold text-foreground mt-1">
                          {Number.isFinite(todayBlock.calls)
                            ? todayBlock.calls
                            : 0}
                        </div>
                      </div>

                      <div className="border border-muted rounded-lg p-4 bg-background">
                        <div className="text-xs text-muted-foreground">
                          Today’s Leads
                        </div>
                        <div className="text-2xl font-semibold text-foreground mt-1">
                          {Number.isFinite(todayBlock.leads)
                            ? todayBlock.leads
                            : 0}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Goal (unchanged UI, just using weeklyGoal) */}
                    <div className="mt-3 border border-muted rounded-lg p-4 bg-background">
                      <div className="text-xs text-muted-foreground">
                        Weekly Goal
                      </div>
                      {weeklyGoal ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                Weekly Progress
                              </div>
                              <div className="text-2xl font-semibold text-foreground">
                                {weeklyGoal.achieved}/{weeklyGoal.target}
                              </div>
                            </div>
                            <div
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                weeklyGoal.achieved >= weeklyGoal.target
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}
                            >
                              {Math.min(
                                100,
                                Math.round(
                                  ((weeklyGoal.achieved ?? 0) /
                                    (weeklyGoal.target || 1)) *
                                    100
                                )
                              )}
                              %
                            </div>
                          </div>

                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full bg-primary transition-all duration-500 ease-out"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    ((weeklyGoal.achieved ?? 0) /
                                      (weeklyGoal.target || 1)) *
                                      100
                                  )
                                )}%`,
                              }}
                            />
                          </div>

                          {(weeklyGoal.startDate || weeklyGoal.endDate) && (
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              <span>
                                {new Date(
                                  weeklyGoal.startDate
                                ).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                              <span className="mx-1">→</span>
                              <span>
                                {new Date(
                                  weeklyGoal.endDate
                                ).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground mt-1">
                          No goal set.
                        </div>
                      )}
                    </div>

                    {/* Breakdown chips */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-muted rounded-lg p-4 bg-background">
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Call Status Breakdown
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(callStats.byStatus).map(
                            ([key, val]) => (
                              <span
                                key={key}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                  statusColors[key] ||
                                  'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {key.replace('-', ' ')}{' '}
                                <span className="font-semibold">{val}</span>
                              </span>
                            )
                          )}
                          {!Object.keys(callStats.byStatus).length && (
                            <div className="text-sm text-muted-foreground">
                              No calls yet.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border border-muted rounded-lg p-4 bg-background">
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Lead Status Breakdown
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(leadStats.byStatus).map(
                            ([key, val]) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {key.replace('-', ' ')}{' '}
                                <span className="font-semibold">{val}</span>
                              </span>
                            )
                          )}
                          {!Object.keys(leadStats.byStatus).length && (
                            <div className="text-sm text-muted-foreground">
                              No leads yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* LEADS TAB */}
              <TabsContent value="leads" className="mt-0">
                <DataTableClean
                  title={
                    selectedTelecallerName
                      ? `Leads • ${selectedTelecallerName}`
                      : 'All Leads'
                  }
                  toolbarActions={
                    <div className="flex gap-2">
                      <StatusFilter
                        value={leadStatusFilter}
                        onChange={(value) =>
                          updateUrl({ leadStatus: value || null, lpage: '1' })
                        }
                        options={leadStatusOptions}
                        placeholder="Filter by status"
                      />
                    </div>
                  }
                  columns={leadColumns}
                  rows={filteredLeadsRows}
                  totalCount={leadsTotalCount}
                  rowKey={(r: LeadRow) =>
                    r?.id ||
                    r?._id ||
                    `${r.name || ''}-${r.phone || ''}-${r.createdAt || ''}`
                  }
                  loading={leadsLoading || usersLoading}
                  initialPage={leadsPage}
                  initialPageSize={leadsPageSize}
                  serverSearchMode="manual"
                  handlers={{
                    onQueryChange: (q: any) => {
                      const nextPage = q.page || 1;
                      const nextSize = q.pageSize || leadsPageSize;
                      if (nextPage === leadsPage && nextSize === leadsPageSize)
                        return;

                      updateUrl({
                        lpage: String(nextPage),
                        lps: String(nextSize),
                      });
                    },
                  }}
                />

                {!leadsLoading &&
                  !usersLoading &&
                  !filteredLeadsRows.length && (
                    <div className="text-center py-12 border border-muted rounded-lg bg-background mt-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <Search className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        No leads found for the selected filters.
                      </p>
                    </div>
                  )}
              </TabsContent>

              {/* CALLS TAB */}
              <TabsContent value="calls" className="mt-0">
                <DataTableClean
                  title={
                    selectedTelecallerName
                      ? `Calls • ${selectedTelecallerName}`
                      : 'All Calls'
                  }
                  toolbarActions={
                    <div className="flex gap-2">
                      <StatusFilter
                        value={callResultFilter}
                        onChange={(value) =>
                          updateUrl({ callResult: value || null, cpage: '1' })
                        }
                        options={callResultOptions}
                        placeholder="Filter by result"
                      />
                    </div>
                  }
                  columns={callColumns}
                  rows={filteredCallsRows}
                  totalCount={callsTotalCount}
                  rowKey={(r: CallRow) =>
                    r?.id ||
                    `${r.leadId?.phone || ''}-${r.createdAt || ''}-${
                      r.result || ''
                    }`
                  }
                  loading={callsLoading || usersLoading}
                  initialPage={callsPage}
                  initialPageSize={callsPageSize}
                  serverSearchMode="manual"
                  handlers={{
                    onQueryChange: (q: any) => {
                      const nextPage = q.page || 1;
                      const nextSize = q.pageSize || callsPageSize;
                      if (nextPage === callsPage && nextSize === callsPageSize)
                        return;

                      updateUrl({
                        cpage: String(nextPage),
                        cps: String(nextSize),
                      });
                    },
                  }}
                />

                {!callsLoading &&
                  !usersLoading &&
                  !filteredCallsRows.length && (
                    <div className="text-center py-12 border border-muted rounded-lg bg-background mt-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <Search className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        No call logs found for the selected filters.
                      </p>
                    </div>
                  )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

function FiltersBody(props: {
  startDate: string;
  endDate: string;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  teleQueryInput: string;
  setTeleQueryInput: (v: string) => void;
  allTelecallers: Array<{ id: string; fullName: string; email?: string }>;
  selectedTelecaller: string;
  usersLoading: boolean;
  telePage: number;
  telePageSize: number;
  updateUrl: (p: Record<string, string | null | undefined>) => void;
}) {
  const {
    startDate,
    endDate,
    hasActiveFilters,
    clearFilters,
    teleQueryInput,
    setTeleQueryInput,
    allTelecallers,
    selectedTelecaller,
    usersLoading,
    telePage,
    telePageSize,
    updateUrl,
  } = props;

  return (
    <>
      {/* Date Range */}
      <div className="mb-4">
        <label className="text-sm font-medium text-foreground">
          Date Range
        </label>
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              const v = e.target.value;
              const nextEnd = endDate && v && endDate < v ? null : endDate;
              updateUrl({
                start: v || null,
                end: nextEnd,
                lpage: '1',
                cpage: '1',
              });
            }}
            className="bg-background border-muted"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            disabled={!startDate}
            value={endDate}
            min={startDate || undefined}
            onChange={(e) =>
              updateUrl({ end: e.target.value || null, lpage: '1', cpage: '1' })
            }
            className="bg-background border-muted disabled:opacity-70"
          />
        </div>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full text-foreground hover:bg-muted mb-4"
        >
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      )}

      {/* Telecallers */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">
            Telecallers
          </label>
          {selectedTelecaller && (
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hover:bg-muted"
              onClick={() =>
                updateUrl({
                  telecaller: null,
                  lpage: '1',
                  cpage: '1',
                  tab: 'calls',
                })
              }
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <Input
          placeholder="Search telecallers..."
          value={teleQueryInput}
          onChange={(e) => setTeleQueryInput(e.target.value)}
          className="mb-2 bg-background border-muted"
        />

        <div className="md:max-h-[calc(100vh-16rem)] max-h-[50vh] overflow-y-auto rounded border border-muted">
          <div
            className={`px-3 py-2 cursor-pointer hover:bg-muted ${
              !selectedTelecaller ? 'bg-muted' : ''
            }`}
            onClick={() =>
              updateUrl({
                telecaller: null,
                lpage: '1',
                cpage: '1',
                tab: 'calls',
              })
            }
          >
            All Telecallers
          </div>
          {allTelecallers.map((t) => (
            <div
              key={t.id}
              className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                t.id === selectedTelecaller ? 'bg-muted' : ''
              }`}
              onClick={() =>
                updateUrl({
                  telecaller: t.id,
                  lpage: '1',
                  cpage: '1',
                  tab: 'dashboard',
                })
              }
            >
              <div className="text-sm text-foreground">{t.fullName}</div>
              {t.email && (
                <div className="text-xs text-muted-foreground">{t.email}</div>
              )}
            </div>
          ))}
          {!allTelecallers.length && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results
            </div>
          )}
        </div>

        {/* Simple pager */}
        <div className="mt-2 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={telePage <= 1 || usersLoading}
            onClick={() => updateUrl({ tpage: String(telePage - 1) })}
          >
            Prev
          </Button>
          <div className="text-xs text-muted-foreground">Page {telePage}</div>
          <Button
            variant="outline"
            size="sm"
            disabled={usersLoading || allTelecallers.length < telePageSize}
            onClick={() => updateUrl({ tpage: String(telePage + 1) })}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

export default CallLogsPage;
