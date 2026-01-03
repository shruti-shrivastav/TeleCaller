'use client';

import * as React from 'react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Search, RefreshCw, X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Skeleton } from './ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

/* ----------------------------- Public types ------------------------------ */
const CONTROL_H = 'h-9';
const CONTROL_RADIUS = 'rounded-md';
const CONTROL_PX = 'px-3';
const CONTROL_TEXT = 'text-sm';
const CONTROL_BG = 'bg-background';
const CONTROL_INPUT = `${CONTROL_H} ${CONTROL_RADIUS} ${CONTROL_BG} ${CONTROL_PX} ${CONTROL_TEXT}`;
const CONTROL_SELECT = `${CONTROL_H} ${CONTROL_RADIUS} ${CONTROL_BG} ${CONTROL_PX} ${CONTROL_TEXT}`;
const CONTROL_BUTTON_OUTLINE = `${CONTROL_RADIUS}`;

export type SortDir = 'asc' | 'desc';
export type Density = 'comfortable' | 'compact';

export type Column<T> = {
  key: string;
  header: string | React.ReactNode;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | null | undefined;
  render: (row: T) => React.ReactNode;
};

export type FilterDef =
  | {
      type: 'select';
      key: string;
      label: string;
      options: Array<{ label: string; value: string }>;
    }
  | { type: 'text'; key: string; label: string; placeholder?: string };

type ServerHandlers = {
  onQueryChange?: (q: {
    page: number;
    pageSize: number;
    query: string;
    sort?: { key: string; dir: SortDir } | null;
    filters: Record<string, string>;
  }) => void;
  onSelectionChange?: (ids: string[]) => void;
};

export type CleanTableUI = {
  zebra?: boolean;
  stickyHeader?: boolean;
  rounded?: 'md' | 'lg' | 'xl' | 'none';
  headerUppercase?: boolean;
  compactHeader?: boolean;
  showDensityToggle?: boolean;
  border?: boolean;
  showSearchButton?: boolean;
  searchPlaceholder?: string;
  hideSearch?: boolean;
};

export type CleanDataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (r: T) => string;

  title?: string;
  toolbarActions?: React.ReactNode;
  filters?: FilterDef[];

  density?: Density;
  initialQuery?: string;
  initialSort?: { key: string; dir: SortDir } | null;
  initialFilters?: Record<string, string>;
  initialPage?: number;
  initialPageSize?: number;

  totalCount?: number;
  handlers?: ServerHandlers;
  serverSearchMode?: 'auto' | 'manual';

  loading?: boolean;
  errorText?: string;
  empty?: React.ReactNode;
  rightActionsFor?: (r: T) => React.ReactNode;
  className?: string;
  onRefresh?: () => void;

  ui?: CleanTableUI;

  activeRowId?: string;
  onRowClick?: (row: T) => void;
  selectableRows?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
};

/* ------------------------------ Utilities -------------------------------- */

function defaultSort<T>(
  arr: T[],
  accessor: (x: T) => string | number | null | undefined,
  dir: SortDir
) {
  const s = [...arr].sort((a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
    return String(va).localeCompare(String(vb));
  });
  return dir === 'asc' ? s : s.reverse();
}

/* ------------------------------ Component --------------------------------- */

export default function DataTableClean<T>({
  columns,
  rows,
  rowKey,

  title,
  toolbarActions,
  filters = [],

  density: densityProp = 'comfortable',
  initialQuery = '',
  initialSort = null,
  initialFilters = {},
  initialPage = 1,
  initialPageSize = 25,

  totalCount,
  handlers,
  serverSearchMode = 'manual',

  loading,
  errorText,
  empty,
  rightActionsFor,
  className,
  onRefresh,

  ui,

  activeRowId,
  onRowClick,
  selectableRows,
  selectedRows,
  onSelectionChange,
}: CleanDataTableProps<T>) {
  const {
    zebra = true,
    stickyHeader = true,
    rounded = 'xl',
    headerUppercase = true,
    compactHeader = true,
    showDensityToggle = false,
    border = true,
    showSearchButton = true,
    searchPlaceholder = 'Search…',
  } = ui ?? {};

  const prefersReduced = useReducedMotion();
  const serverMode = Boolean(handlers?.onQueryChange);

  // Selection logic
  const handleSelectionChange = (ids: string[]) => {
    onSelectionChange?.(ids);
    handlers?.onSelectionChange?.(ids);
  };

  const [query, setQuery] = useState(initialQuery);
  const submittedQueryRef = useRef(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  const [sort, setSort] = useState<typeof initialSort>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filterState, setFilterState] =
    useState<Record<string, string>>(initialFilters);

  const [density, setDensity] = useState<Density>(densityProp);
  useEffect(() => setDensity(densityProp), [densityProp]);

  const [refreshing, setRefreshing] = useState(false);

  /* ---------- server announcements ---------- */
  useEffect(() => {
    if (!serverMode) return;
    const currentQuery =
      serverSearchMode === 'manual' ? submittedQueryRef.current : query;

    handlers!.onQueryChange?.({
      page,
      pageSize,
      query: currentQuery,
      sort: sort ?? null,
      filters: filterState,
    });
  }, [
    serverMode,
    handlers,
    page,
    pageSize,
    sort,
    filterState,
    serverSearchMode === 'auto' ? query : undefined,
  ]);

  function triggerSearch() {
    setIsSearching(true);
    submittedQueryRef.current = query.trim();
    if (serverMode) {
      handlers?.onQueryChange?.({
        page,
        pageSize,
        query: submittedQueryRef.current,
        sort: sort ?? null,
        filters: filterState,
      });
    }
    setTimeout(() => setIsSearching(false), 600);
  }

  function handleRefresh() {
    setRefreshing(true);
    onRefresh?.();
    setTimeout(() => setRefreshing(false), 600);
  }

  /* ---------- client-mode processing ---------- */
  const processed = useMemo(() => {
    if (serverMode) return rows;
    let output = [...rows];

    for (const f of filters) {
      const val = filterState[f.key];
      if (!val) continue;
      output = output.filter((r: any) =>
        JSON.stringify(r).toLowerCase().includes(val.toLowerCase())
      );
    }

    const q = query.trim().toLowerCase();
    if (q) {
      output = output.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(q)
      );
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortable) {
        const accessor =
          col.sortAccessor ??
          ((row: any) => {
            const rendered = col.render(row);
            if (typeof rendered === 'string' || typeof rendered === 'number')
              return rendered;
            return (row as any)[col.key] ?? null;
          });
        output = defaultSort(output, accessor, sort.dir);
      }
    }
    return output;
  }, [rows, serverMode, filters, filterState, query, sort, columns]);

  const clientTotal = processed.length;
  const effectiveTotal = serverMode ? totalCount ?? rows.length : clientTotal;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));

  const paged = useMemo(() => {
    if (serverMode) return rows;
    const start = (page - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, page, pageSize, serverMode, rows]);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null;
    });
  }

  const densityRowClass =
    density === 'compact' ? 'h-10 text-[13px]' : 'h-12 text-sm';
  const hasActiveFilters = Object.values(filterState).some((v) => v);

  return (
    <div
      className={cn(
        'w-full bg-popover text-popover-foreground shadow-sm overflow-hidden',
        rounded !== 'none' && 'rounded-xl',
        border && 'border border-border/40',
        className
      )}
    >
      {/* toolbar */}
      <div
        className={cn(
          'flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between',
          'border-b border-border/30 backdrop-blur-sm',
          'bg-popover/95 bg-gradient-to-r from-primary/10 via-popover to-accent/10'
        )}
      >
        <div className="flex items-center gap-2">
          {title ? (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[15px] font-semibold tracking-tight"
            >
              {title}
            </motion.div>
          ) : null}
          {errorText ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Badge variant="destructive" className="ml-2">
                {errorText}
              </Badge>
            </motion.div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* animated filters */}
          <AnimatePresence mode="popLayout">
            {filters.map((f) =>
              f.type === 'select' ? (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className={`inline-flex items-center gap-1 ${CONTROL_H} ${CONTROL_RADIUS} border border-border/50 ${CONTROL_BG} ${CONTROL_PX} ${CONTROL_TEXT} shadow-sm hover:shadow-md transition-shadow`}
                >
                  <span className="px-2 text-muted-foreground text-xs font-medium">
                    {f.label}
                  </span>
                  <select
                    className={`${CONTROL_H} ${CONTROL_RADIUS} bg-transparent px-2 outline-none cursor-pointer text-foreground`}
                    value={filterState[f.key] ?? ''}
                    onChange={(e) =>
                      setFilterState((s) => ({ ...s, [f.key]: e.target.value }))
                    }
                  >
                    <option value="">All</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </motion.div>
              ) : (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="inline-flex items-center h-9 rounded-full border border-border/50 bg-background/70 px-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="px-1 text-muted-foreground text-xs font-medium whitespace-nowrap">
                    {f.label}
                  </span>
                  <Input
                    placeholder={f.placeholder ?? 'Type…'}
                    className={`h-8 w-[150px] rounded-full border-0 bg-transparent focus-visible:ring-0 placeholder:text-xs`}
                    value={filterState[f.key] ?? ''}
                    onChange={(e) =>
                      setFilterState((s) => ({ ...s, [f.key]: e.target.value }))
                    }
                  />
                </motion.div>
              )
            )}
          </AnimatePresence>

          {/* search input - FIXED CSS */}
          {!ui?.hideSearch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex items-center gap-2"
            >
              <div className="relative">
                <Input
                  className={cn(
                    CONTROL_INPUT, // has px-3
                    'pl-9', // override LEFT padding (must come after)
                    'pr-3 w-full border border-border/50 shadow-sm',
                    'focus-visible:shadow-md focus-visible:ring-1 focus-visible:ring-blue-500 transition-all'
                  )}
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      triggerSearch();
                    }
                  }}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>

              {showSearchButton ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={triggerSearch}
                  disabled={isSearching}
                  className={cn(
                    'h-9 px-3 rounded-md border border-border/50 bg-background/70 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer',
                    isSearching && 'opacity-70'
                  )}
                >
                  <motion.div
                    animate={isSearching ? { rotate: 360 } : { rotate: 0 }}
                    transition={{
                      duration: 0.6,
                      repeat: isSearching ? Infinity : 0,
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </motion.div>
                  <span className="hidden sm:inline">Search</span>
                </motion.button>
              ) : null}
            </motion.div>
          )}

          {/* refresh button */}
          {onRefresh ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn(
                'h-9 px-3 rounded-md border border-border/50 bg-background/70 text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer',
                refreshing && 'opacity-70'
              )}
            >
              <motion.div
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{
                  duration: 0.6,
                  repeat: refreshing ? Infinity : 0,
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </motion.div>
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
          ) : null}

          {/* active filters badge */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="secondary" className="text-xs">
                  {Object.values(filterState).filter((v) => v).length} active
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {toolbarActions}
        </div>
      </div>

      {/* table */}
      <div className="relative w-full overflow-x-auto">
        <Table>
          <TableHeader
            className={cn(
              stickyHeader && 'sticky top-0 z-[1]',
              'bg-gradient-to-r from-muted/40 to-muted/20',
              'border-y border-border/30',
              compactHeader ? 'text-[11px]' : 'text-xs',
              headerUppercase &&
                'uppercase tracking-[0.08em] text-muted-foreground'
            )}
          >
            <TableRow className="hover:bg-transparent">
              {selectableRows && (
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      !!selectedRows?.length &&
                      selectedRows.length === rows.length
                    }
                    onChange={(e) => {
                      if (e.target.checked)
                        handleSelectionChange(rows.map((r) => rowKey(r)));
                      else handleSelectionChange([]);
                    }}
                    className="cursor-pointer accent-blue-500"
                  />
                </TableHead>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const icon = active ? (
                  sort?.dir === 'asc' ? (
                    <motion.div
                      key="up"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="down"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  )
                ) : null;
                return (
                  <TableHead
                    key={c.key}
                    style={{
                      width: c.width,
                      textAlign: c.align,
                      cursor: c.sortable ? 'pointer' : 'default',
                    }}
                    onClick={() => toggleSort(c)}
                    className={cn(
                      'select-none px-3 py-2',
                      c.sortable &&
                        'hover:bg-primary/10 transition-colors duration-200',
                      active && 'text-foreground font-semibold'
                    )}
                  >
                    <motion.div className="flex items-center gap-1" layout>
                      <span className="whitespace-nowrap">{c.header}</span>
                      <AnimatePresence mode="wait">{icon}</AnimatePresence>
                    </motion.div>
                  </TableHead>
                );
              })}
              {rightActionsFor ? (
                <TableHead className="px-3 py-2 text-right">Actions</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(10, pageSize) }).map((_, i) => (
                <motion.tr
                  key={`sk-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    'border-t border-border/20',
                    zebra && i % 2 === 1 && 'bg-primary/[0.02]'
                  )}
                >
                  {Array.from({
                    length:
                      columns.length +
                      (rightActionsFor ? 1 : 0) +
                      (selectableRows ? 1 : 0),
                  }).map((__, j) => (
                    <TableCell key={`sk-${i}-${j}`} className="p-3">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            ) : (serverMode ? rows.length === 0 : paged.length === 0) ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length +
                    (rightActionsFor ? 1 : 0) +
                    (selectableRows ? 1 : 0)
                  }
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {empty ?? 'No data.'}
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {(serverMode ? rows : paged).map((r, i) => {
                  const id = rowKey(r);
                  const active = activeRowId && id === activeRowId;
                  return (
                    <motion.tr
                      key={id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                      className={cn(
                        'border-t border-border/20',
                        zebra && i % 2 === 1 && 'bg-primary/[0.02]',
                        'transition-colors',
                        active && 'bg-blue-50',
                        onRowClick && 'cursor-pointer hover:bg-primary/5',
                        densityRowClass
                      )}
                    >
                      {selectableRows && (
                        <TableCell className="w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows?.includes(id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked)
                                handleSelectionChange([
                                  ...(selectedRows ?? []),
                                  id,
                                ]);
                              else
                                handleSelectionChange(
                                  (selectedRows ?? []).filter((x) => x !== id)
                                );
                            }}
                            className="cursor-pointer accent-blue-500"
                          />
                        </TableCell>
                      )}
                      {columns.map((c) => (
                        <TableCell
                          key={`${id}-${c.key}`}
                          style={{ textAlign: c.align }}
                          className="align-middle px-3 py-2"
                        >
                          {c.render(r)}
                        </TableCell>
                      ))}
                      {rightActionsFor ? (
                        <TableCell className="px-3 py-2 text-right align-middle">
                          {rightActionsFor(r)}
                        </TableCell>
                      ) : null}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* footer */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-t border-border/30 p-4 bg-gradient-to-r from-muted/20 via-background to-muted/20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground font-medium"
        >
          {loading
            ? 'Loading…'
            : `Showing ${
                serverMode ? rows.length : paged.length
              } of ${effectiveTotal} item(s)`}
        </motion.div>

        <div className="flex items-center gap-3">
          {/* Advanced numeric pager */}
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(parseInt(v, 10));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rows / page" />
              </SelectTrigger>

              {/* Use a high z-index so it appears above the table/header */}
              <SelectContent className="z-50" align="end">
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <motion.button
              className="h-9 px-3 rounded-md text-sm font-medium border border-border/50 bg-background/70 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              whileHover={page > 1 && !loading ? { scale: 1.05 } : {}}
              whileTap={page > 1 && !loading ? { scale: 0.95 } : {}}
            >
              Prev
            </motion.button>

            {/* Numbered buttons with ellipsis */}
            <div className="flex gap-1 select-none">
              {Array.from({ length: totalPages })
                .map((_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === totalPages) return true;
                  if (p >= page - 2 && p <= page + 2) return true;
                  return false;
                })
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-xs text-muted-foreground">
                        …
                      </span>
                    )}
                    <motion.button
                      onClick={() => !loading && setPage(p)}
                      whileHover={p !== page && !loading ? { scale: 1.05 } : {}}
                      whileTap={p !== page && !loading ? { scale: 0.95 } : {}}
                      className={cn(
                        'h-9 w-9 rounded-md text-sm font-medium flex items-center justify-center border',
                        p === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border-border/50 hover:bg-primary/10'
                      )}
                      disabled={loading}
                    >
                      {p}
                    </motion.button>
                  </React.Fragment>
                ))}
            </div>

            {/* Next */}
            <motion.button
              className="h-9 px-3 rounded-md text-sm font-medium border border-border/50 bg-background/70 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
              whileHover={page < totalPages && !loading ? { scale: 1.05 } : {}}
              whileTap={page < totalPages && !loading ? { scale: 0.95 } : {}}
            >
              Next
            </motion.button>
          </div>

          {/* <motion.div
            className="inline-flex overflow-hidden rounded-full border border-border/50 bg-background/70 shadow-sm"
            layout
          >
            <motion.button
              className="rounded-none h-9 px-3 text-sm font-medium"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              whileHover={page > 1 && !loading ? { scale: 1.05 } : {}}
              whileTap={page > 1 && !loading ? { scale: 0.95 } : {}}
            >
              Prev
            </motion.button>
            <motion.div
              className="px-3 text-sm font-semibold tabular-nums self-center text-foreground"
              key={page}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {page}
            </motion.div>
            <motion.button
              className="rounded-none h-9 px-3 text-sm font-medium border-l border-border/30"
              onClick={() => setPage((p) => p + 1)}
              disabled={
                loading ||
                (serverMode
                  ? rows.length < pageSize
                  : page * pageSize >= processed.length)
              }
              whileHover={
                !(
                  loading ||
                  (serverMode
                    ? rows.length < pageSize
                    : page * pageSize >= processed.length)
                )
                  ? { scale: 1.05 }
                  : {}
              }
              whileTap={
                !(
                  loading ||
                  (serverMode
                    ? rows.length < pageSize
                    : page * pageSize >= processed.length)
                )
                  ? { scale: 0.95 }
                  : {}
              }
            >
              Next
            </motion.button>
          </motion.div> */}
        </div>
      </div>
    </div>
  );
}
