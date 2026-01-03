import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { useAuth } from '@/hooks/use-auth';
import { fetchDashboardSummary } from '@/features/dashboard/dashboard-thunk';
import { Card } from '@/components/ui/card';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Progress } from '@/components/ui/progress';
import {
  PhoneCall,
  Users,
  Target,
  Activity,
  BarChart3,
  CalendarRange,
  Award,
  Clock,
  CheckCircle2,
  PhoneForwarded,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RangeOption = 'day' | 'week' | 'month' | 'custom';

export const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { summary, loading } = useAppSelector((s) => s.dashboard);
  const [range, setRange] = useState<RangeOption>('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (range === 'custom' && startDate && endDate) {
      dispatch(fetchDashboardSummary({ range, startDate, endDate }));
    } else {
      dispatch(fetchDashboardSummary({ range }));
    }
  }, [dispatch, range, startDate, endDate]);

  if (loading || !summary)
    return (
      <div className="flex items-center justify-center h-[70vh] text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );

  const {
    leadStats,
    callStats,
    teamStats,
    goalStats,
    role: apiRole,
    period,
  } = summary;

  const totalLeads = leadStats.totalLeads || 0;
  const totalCalls = callStats.totalCalls || 0;
  const conversionRate =
    totalCalls > 0
      ? ((callStats.byResult.converted / totalCalls) * 100).toFixed(1)
      : '0';
  // const answerRate =
  //   totalCalls > 0
  //     ? ((callStats.byResult.answered / totalCalls) * 100).toFixed(1)
  //     : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      <div className="space-y-6 px-4 md:px-6 lg:px-8 container mx-auto py-6">
        {/* Header Section with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-900 p-6 md:p-8 shadow-xl">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                <Zap className="w-3 h-3" />
                <span>Live Dashboard</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {apiRole === 'admin'
                  ? 'System Overview'
                  : apiRole === 'leader'
                  ? 'Team Dashboard'
                  : 'My Performance'}
              </h1>
              <p className="text-blue-100 max-w-2xl">
                {apiRole === 'admin'
                  ? 'Complete visibility into system-wide performance, team metrics, and conversion analytics.'
                  : apiRole === 'leader'
                  ? "Monitor your team's performance, track goals, and identify top performers."
                  : 'Track your calls, leads, and progress towards your weekly targets.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-blue-100">
                <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span className="font-medium">
                    {range === 'custom' && startDate && endDate ? (
                      <>
                        {new Date(startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        –{' '}
                        {new Date(endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </>
                    ) : (
                      <>
                        {new Date(period.start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        –{' '}
                        {new Date(period.end).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </>
                    )}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-medium">
                    {user?.fullName || user?.firstName || user?.email}
                  </span>
                </span>
              </div>
            </div>

            {/* Range selector with glass effect */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-blue-100 font-medium">
                Time Period
              </span>
              <RangePills value={range} onChange={setRange} />
              {/* Custom date range input */}
              {range === 'custom' && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded px-2 py-1 text-xs text-white"
                  />
                  <Input
                    type="date"
                    disabled = {!startDate }
                    value={endDate}
                    min = {startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded px-2 py-1 text-xs text-white"
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      dispatch(
                        fetchDashboardSummary({ range, startDate, endDate })
                      )
                    }
                    className="px-3 py-1 rounded bg-white/20 text-white text-xs"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top KPIs with gradient cards */}
        <div className="grid grid-cols-1  md:grid-cols-3 gap-4">
          <MetricCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="Total Leads"
            value={totalLeads}
            gradient="from-emerald-500 to-teal-600"
          />
          <MetricCard
            icon={<PhoneCall className="w-5 h-5" />}
            label="Total Calls"
            value={totalCalls}
            gradient="from-blue-500 to-cyan-600"
          />
          <MetricCard
            icon={<Target className="w-5 h-5" />}
            label="Conversion Rate"
            value={`${conversionRate}%`}
            gradient="from-violet-500 to-purple-600"
          />
          {/* <MetricCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Answer Rate"
            value={`${answerRate}%`}
            gradient="from-orange-500 to-red-600"
          /> */}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniCard
            icon={
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            }
            label="Leads Started"
            value={leadStats.startedInPeriod || 0}
            bgColor="bg-blue-50 dark:bg-blue-950/30"
          />
          <MiniCard
            icon={
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            }
            label="Leads Created"
            value={leadStats.createdInPeriod || 0}
            bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <MiniCard
            icon={
              <PhoneForwarded className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            }
            label="Callbacks Scheduled"
            value={callStats.byResult.callback || 0}
            bgColor="bg-orange-50 dark:bg-orange-950/30"
          />
          <MiniCard
            icon={
              <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            }
            label="Converted"
            value={callStats.byResult.converted || 0}
            bgColor="bg-violet-50 dark:bg-violet-950/30"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Lead & Call breakdown */}
          <div className="space-y-6 lg:col-span-2">
            <EnhancedSectionCard
              title="Lead Status Distribution"
              description="Current distribution across all lead statuses"
              icon={<BarChart3 className="w-4 h-4" />}
            >
              <EnhancedBreakdownList
                data={leadStats.statusBreakdown}
                total={totalLeads}
                labels={{
                  new: { label: 'New', color: 'bg-blue-500' },
                  in_progress: { label: 'In Progress', color: 'bg-yellow-500' },
                  callback: { label: 'Callback', color: 'bg-orange-500' },
                  closed: { label: 'Closed', color: 'bg-green-500' },
                  dead: { label: 'Dead', color: 'bg-red-500' },
                }}
              />
            </EnhancedSectionCard>

            <EnhancedSectionCard
              title="Call Result Analysis"
              description="Breakdown of call outcomes in the selected period"
              icon={<PhoneCall className="w-4 h-4" />}
            >
              <EnhancedBreakdownList
                data={callStats.byResult}
                total={totalCalls}
                labels={{
                  answered: { label: 'Answered', color: 'bg-green-500' },
                  missed: { label: 'Missed', color: 'bg-gray-500' },
                  callback: { label: 'Callback', color: 'bg-orange-500' },
                  converted: { label: 'Converted', color: 'bg-violet-500' },
                }}
              />
            </EnhancedSectionCard>
          </div>

          {/* Right sidebar: Goals + Team */}
          <div className="space-y-6">
            {goalStats && (
              <EnhancedSectionCard
                title="Weekly Goal Progress"
                description="Track your progress against targets"
                icon={<Target className="w-4 h-4" />}
                gradient={true}
              >
                <EnhancedGoalBlock goalStats={goalStats} />
              </EnhancedSectionCard>
            )}

            {apiRole !== 'telecaller' && teamStats && (
              <EnhancedSectionCard
                title="Top Performers"
                description="Highest call volume this period"
                icon={<Award className="w-4 h-4" />}
              >
                {teamStats.topTelecallers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No call activity yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamStats.topTelecallers.map((t, idx) => (
                      <div
                        key={t.userId}
                        className="group relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/50 hover:from-slate-100 dark:hover:from-slate-800/50 transition-all border border-slate-200/50 dark:border-slate-700/50"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg text-sm">
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {t.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {t.email}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                            {t.totalCalls}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.converted} converted
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {typeof teamStats.totalTelecallers === 'number' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        Total team members:{' '}
                        <strong>{teamStats.totalTelecallers}</strong>
                      </span>
                    </p>
                  </div>
                )}
              </EnhancedSectionCard>
            )}

            {/* Quick Stats Card */}
            <Card className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/50 dark:to-blue-950/20 border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Quick Insights
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Avg. calls per lead
                  </span>
                  <span className="font-semibold">
                    {(totalCalls / Math.max(totalLeads, 1)).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Success rate</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {conversionRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active leads</span>
                  <span className="font-semibold">
                    {leadStats.statusBreakdown.in_progress}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

/* === Enhanced Components === */

const RangePills = ({
  value,
  onChange,
}: {
  value: RangeOption;
  onChange: (v: RangeOption) => void;
}) => {
  const options: { label: string; value: RangeOption }[] = [
    { label: 'Today', value: 'day' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="inline-flex rounded-xl bg-white/20 backdrop-blur-md p-1 text-xs shadow-lg border border-white/20">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'px-4 py-2 rounded-lg font-medium transition-all ' +
              (active
                ? 'bg-white text-blue-700 shadow-md'
                : 'text-white/80 hover:text-white hover:bg-white/10')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  gradient: string;
}) => (
  <Card
    className={`relative overflow-hidden p-5 border-0 bg-gradient-to-br ${gradient} text-white shadow-lg hover:shadow-xl transition-all hover:scale-105`}
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/80 font-medium">{label}</div>
    </div>
  </Card>
);

const MiniCard = ({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
}) => (
  <Card
    className={`p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all ${bgColor}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  </Card>
);

const EnhancedSectionCard = ({
  title,
  description,
  icon,
  children,
  gradient = false,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  gradient?: boolean;
}) => (
  <Card
    className={`p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all ${
      gradient
        ? 'bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20'
        : ''
    }`}
  >
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
    {children}
  </Card>
);

const EnhancedBreakdownList = ({
  data,
  total,
  labels,
}: {
  data: Record<string, number>;
  total: number;
  labels: Record<string, { label: string; color: string }>;
}) => {
  const entries = Object.entries(labels).map(([key, config]) => {
    const value = data?.[key] ?? 0;
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return { key, ...config, value, pct };
  });

  return (
    <div className="space-y-3">
      {entries.map((row) => (
        <div key={row.key} className="group">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${row.color}`} />
              <span className="text-sm font-medium text-foreground">
                {row.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{row.value}</span>
              <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                {row.pct}%
              </span>
            </div>
          </div>
          <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 ${row.color} rounded-full transition-all duration-500 group-hover:opacity-90`}
              style={{ width: `${row.pct}%` }}
            />
          </div>
        </div>
      ))}
      {total === 0 && (
        <p className="text-sm text-muted-foreground mt-4 text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg">
          No data available for the selected period
        </p>
      )}
    </div>
  );
};

const EnhancedGoalBlock = ({ goalStats }: { goalStats: any }) => {
  const target = goalStats.weeklyTarget || 0;
  const achieved = goalStats.achieved || 0;
  const remaining = goalStats.remaining ?? Math.max(0, target - achieved);
  const pct =
    target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const isComplete = pct >= 100;

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{pct}%</div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Goal Completion</div>
      </div>

      <div className="relative h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            isComplete
              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
              : 'bg-gradient-to-r from-blue-500 to-violet-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {achieved}
          </div>
          <div className="text-xs text-muted-foreground">Achieved</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
            {target}
          </div>
          <div className="text-xs text-muted-foreground">Target</div>
        </div>
      </div>

      <div
        className={`text-center text-sm font-medium p-3 rounded-lg ${
          isComplete
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
        }`}
      >
        {isComplete ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Target Achieved
          </span>
        ) : (
          `${remaining} calls remaining to reach goal`
        )}
      </div>
    </div>
  );
};
