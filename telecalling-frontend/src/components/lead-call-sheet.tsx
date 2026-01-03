import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import {
  updateLead,
  fetchLeads,
  updateLeadStatus,
} from '@/features/leads/lead-thunk';
import { createCallLog, fetchCallLogs } from '@/features/calls/call-thunk';
import { fetchUsers } from '@/features/users/user-thunk';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/phone-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useAuth } from '@/hooks/use-auth';
import { PROJECT_OPTIONS } from '@/constants/projects';

export default function LeadDetailsSheet({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: any;
}) {
  const dispatch = useAppDispatch();
  const { role } = useAuth();
  const { items: callLogs, loading: callsLoading } = useAppSelector(
    (s) => s.calls
  );
  const { telecallers } = useAppSelector((s) => s.users);
  const { page: leadPage, pageSize: leadPageSize } = useAppSelector(
    (s: any) => s.leads
  );

  const [form, setForm] = useState({
    name: '',
    phone: '',
    source: '',
    notes: '',
    status: '',
    assignedTo: '',
    project: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Call log state
  const [duration, setDuration] = useState('');
  const [result, setResult] = useState('');
  const [remarks, setRemarks] = useState('');

  const buildLeadListQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const pageFromUrl = Number(params.get('page'));
    const pageSizeFromUrl = Number(params.get('pageSize'));
    const search = params.get('query') || undefined;
    const status = params.get('status') || undefined;

    const page = Number.isFinite(pageFromUrl) && pageFromUrl > 0
      ? pageFromUrl
      : leadPage || 1;
    const pageSize =
      Number.isFinite(pageSizeFromUrl) && pageSizeFromUrl > 0
        ? pageSizeFromUrl
        : leadPageSize || 20;

    const query: any = { page, pageSize };
    if (search) query.search = search;
    if (status) query.status = status;
    return query;
  };

  useEffect(() => {
    if (open && lead) {
      setForm({
        name: lead.name || '',
        phone: lead.phone || '',
        source: lead.source || '',
        notes: lead.notes || '',
        status: lead.status || 'new',
        assignedTo: lead.assignedTo?._id || '',
        project: lead.project || '',
      });
      dispatch(fetchUsers({ role: 'telecaller', pageSize: 50 }));
      dispatch(fetchCallLogs({ leadId: lead._id }) as any);
    }
  }, [open, lead, dispatch]);

  const logs = useMemo(
    () =>
      callLogs
        .filter((c) => c.leadId === lead?._id || c.leadId?._id === lead?._id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [callLogs, lead]
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phone) errs.phone = 'Phone number is required';
    else if (!isValidPhoneNumber(form.phone))
      errs.phone = 'Invalid phone number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!lead) return;
    if (!validate()) {
      toast.error('Please fix errors before saving');
      return;
    }

    try {
      setSaving(true);

      const statusChanged =
        form.status && form.status !== (lead.status || 'new');

      const payload: any = {
        name: form.name,
        phone: form.phone,
        source: form.source,
        notes: form.notes,
        // status: form.status,
      };
      if (form.assignedTo) payload.assignedTo = form.assignedTo;

      const nonStatusChanged =
        payload.name !== (lead.name || '') ||
        payload.phone !== (lead.phone || '') ||
        payload.source !== (lead.source || '') ||
        payload.notes !== (lead.notes || '') ||
        (form.assignedTo || '') !== (lead.assignedTo?._id || '') ||
        (role === 'admin'
          ? (form.project || '') !== (lead.project || '')
          : false);

      if (statusChanged) {
        await dispatch(
          updateLeadStatus({ id: lead._id, status: form.status })
        ).unwrap();
      }

      if (nonStatusChanged) {
        if (role === 'admin') {
          payload.project = form.project || '';
        }
        await dispatch(updateLead({ id: lead._id, data: payload })).unwrap();
      }

      if (!statusChanged && !nonStatusChanged) {
        toast.message('No changes to save');
      } else {
        toast.success('Lead updated successfully');
      }

      dispatch(fetchLeads(buildLeadListQuery()));
      onOpenChange(false);
    } catch {
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCall = async () => {
    if (!result) {
      toast.error('Please select a call result.');
      return;
    }
    try {
      await dispatch(
        createCallLog({
          leadId: lead._id,
          duration: Number(duration) || 0,
          result,
          remarks,
        }) as any
      ).unwrap();
      toast.success('Call log added.');
      setDuration('');
      setResult('');
      setRemarks('');
      dispatch(fetchCallLogs({ leadId: lead._id }) as any);
    } catch {
      toast.error('Failed to add call');
    }
  };

  const mins = Math.floor(Number(duration) / 60);
  const secs = Number(duration) % 60;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto pt-3 pb-8 w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl"
      >
        {lead && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg font-semibold capitalize mx-1">
                {lead.name || 'Lead Details'}
              </SheetTitle>
              <SheetDescription>
                {lead.phone}
                {lead.source && (
                  <span className="ml-2">• Source: {lead.source}</span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-1 space-y-6 px-3 sm:px-4">
              {/* 🟢 Lead Info / Edit */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="my-2">Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className={errors.name ? 'border-red-500' : ''}
                      disabled={role === 'telecaller'}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label className="my-2">Phone</Label>
                    <PhoneInput
                      defaultCountry="IN"
                      international
                      value={form.phone}
                      onChange={(v) => setForm({ ...form, phone: v || '' })}
                      className={errors.phone ? 'border-red-500' : ''}
                      disabled={role === 'telecaller'}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500">{errors.phone}</p>
                    )}
                  </div>

                  {/* 🆕 Source Input Field - Only enabled for admin */}
                  <div>
                    <Label className="my-2">Source</Label>
                    <Input
                      value={form.source}
                      onChange={(e) =>
                        setForm({ ...form, source: e.target.value })
                      }
                      placeholder="Where did this lead come from?"
                      disabled={role !== 'admin'} // ✅ Only enabled for admin
                    />
                    {role !== 'admin' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Source field can only be modified by administrators
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="my-2">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="callback">Callback</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="dead">Dead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {role !== 'telecaller' && (
                    <div>
                      <Label className="my-2">Assigned To</Label>
                      <Select
                        value={form.assignedTo}
                        onValueChange={(v) =>
                          setForm({ ...form, assignedTo: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Telecaller" />
                        </SelectTrigger>
                        <SelectContent>
                          {telecallers.map((u: any) => (
                            <SelectItem key={u._id} value={u._id}>
                              {u.fullName} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="my-2">Project</Label>
                    {role === 'admin' ? (
                      <Select
                        value={form.project}
                        onValueChange={(v) => setForm({ ...form, project: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          {PROJECT_OPTIONS.map((proj) => (
                            <SelectItem key={proj} value={proj}>
                              {proj}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={form.project || '—'}
                        disabled
                        className="bg-muted cursor-not-allowed opacity-70"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="my-2">Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      placeholder="Add any notes..."
                    />
                  </div>

                  <Button
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full mt-2 font-semibold"
                  >
                    {saving ? 'Saving...' : 'Save Lead'}
                  </Button>
                </CardContent>
              </Card>

              {/* 🟢 Add Call Log */}
              <Card>
                <CardHeader>
                  <CardTitle>Log New Call</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={result} onValueChange={setResult}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Call Result" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="answered">Answered</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                        <SelectItem value="callback">Callback</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    placeholder="Add remarks (optional)"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />

                  <Button onClick={handleAddCall} className="w-full">
                    Add Call Log
                  </Button>
                </CardContent>
              </Card>

              {/* 🟢 Call History */}
              <Card>
                <CardHeader>
                  <CardTitle>Call History</CardTitle>
                </CardHeader>
                <CardContent>
                  {callsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading call logs...
                    </p>
                  ) : logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No calls recorded yet.
                    </p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {logs.map((c, i) => (
                        <li
                          key={i}
                          className="py-2 flex flex-col gap-1 md:flex-row md:items-start md:justify-between"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium capitalize">{c.result}</p>
                            {c.remarks && (
                              <p className="text-xs text-muted-foreground break-words">
                                {c.remarks}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground md:text-right">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
