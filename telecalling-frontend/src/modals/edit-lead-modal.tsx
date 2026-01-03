import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { updateLead, fetchLeads } from '@/features/leads/lead-thunk';
import { fetchUsers } from '@/features/users/user-thunk';
import { PhoneInput } from '@/components/phone-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useAtom } from 'jotai';
import { editLeadAtom } from './jotai/leads-modal-atom';
import { useAuth } from '@/hooks/use-auth';
import { PROJECT_OPTIONS } from '@/constants/projects';

export const EditLeadSheet = () => {
  const [edit, setEdit] = useAtom(editLeadAtom);
  const { open, lead } = edit;
  const { role } = useAuth();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    notes: string;
    assignedTo: string | null;
    status: string;
    project: string;
  }>({
    name: '',
    phone: '',
    notes: '',
    assignedTo: null,
    status: '',
    project: '',
  });

  const [unassign, setUnassign] = useState(false);
  const [search, setSearch] = useState('');
  const { telecallers } = useAppSelector((s) => s.users);

  useEffect(() => {
    if (open && lead) {
      setForm({
        name: lead.name || '',
        phone: lead.phone || '',
        notes: lead.notes || '',
        assignedTo: lead.assignedTo?._id ?? null,
        status: lead.status || 'new',
        project: lead.project || '',
      });
      setUnassign(!lead.assignedTo); // ← reflect current state
      dispatch(fetchUsers({ role: 'telecaller', pageSize: 100 }));
    }
  }, [open, lead, dispatch]);

  useEffect(() => {
    if (search.trim() !== '') {
      dispatch(
        fetchUsers({ role: 'telecaller', search: search.trim(), pageSize: 20 })
      );
    }
  }, [search, dispatch]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phone) errs.phone = 'Phone number is required';
    else if (!isValidPhoneNumber(form.phone))
      errs.phone = 'Invalid phone number';
    // ❌ no assignedTo requirement
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        name: form.name,
        phone: form.phone,
        notes: form.notes,
        status: form.status,
      };
      if (role === 'admin') {
        payload.project = form.project || '';
      }

      if (unassign) {
        payload.unassign = true; // ← server clears it
      } else if (form.assignedTo) {
        payload.assignedTo = form.assignedTo;
      }
      // (if neither set, we leave assignment unchanged)

      await dispatch(updateLead({ id: lead.id, data: payload })).unwrap();
      toast.success('Lead updated successfully');
      setEdit({ open: false, lead: null });
      setErrors({});
      dispatch(fetchLeads({ page: 1, pageSize: 20 }));
    } catch {
      toast.error('Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const selectedTelecaller = telecallers?.find((t) => t.id === form.assignedTo);

  return (
    <Sheet open={open} onOpenChange={(v) => setEdit({ open: v, lead })}>
      <SheetContent side="right" className=" overflow-y-auto pt-1 pb-8">
        <SheetHeader>
          <SheetTitle>Edit Lead</SheetTitle>
          <SheetDescription>
            Update lead details and assignment
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-4">
          {/* Name */}
          <div>
            <Label className="my-2">Name</Label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={role === 'telecaller'} // ← Disabled for telecaller
              className={`w-full border rounded-md p-2 ${
                errors.name ? 'border-red-500' : 'border-input'
              } ${
                role === 'telecaller'
                  ? 'bg-muted cursor-not-allowed opacity-60'
                  : ''
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label className="my-2">Phone</Label>
            <PhoneInput
              defaultCountry="IN"
              international
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v || '' })}
              disabled={role === 'telecaller'} // ← Disabled for telecaller
              className={`${errors.phone ? 'border-red-500' : ''} ${
                role === 'telecaller'
                  ? 'bg-muted cursor-not-allowed opacity-60'
                  : ''
              }`}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label className="my-2">Notes</Label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded-md p-2 border-input resize-none"
              placeholder="Add any call notes or updates..."
            />
          </div>

          {/* Project (admin only for edit) */}
          <div>
            <Label className="my-2">Project</Label>
            {role === 'admin' ? (
              <Select
                value={form.project}
                onValueChange={(v) => setForm({ ...form, project: v })}
              >
                <SelectTrigger className="mt-1 w-full border-input">
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
              <input
                type="text"
                value={form.project || '—'}
                disabled
                className="w-full border rounded-md p-2 bg-muted cursor-not-allowed opacity-60"
              />
            )}
          </div>

          {/* Status */}
          <div>
            <Label className="my-2">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger className="mt-1 w-full border-input">
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

          {/* Assigned To */}
          {role !== 'telecaller' && (
            <div>
              <Label className="my-2">Assigned To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between mt-1"
                  >
                    {selectedTelecaller
                      ? selectedTelecaller.fullName || selectedTelecaller.email
                      : 'Unassigned'}{' '}
                    {/* ← label */}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search telecallers..."
                      value={search}
                      onValueChange={setSearch}
                      className="border-b"
                    />
                    <CommandList>
                      <CommandEmpty>No telecallers found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          key="__unassigned__"
                          onSelect={() => {
                            setForm({ ...form, assignedTo: null });
                            setUnassign(true); // ← mark unassign
                            setSearch('');
                          }}
                        >
                          — Unassigned
                        </CommandItem>

                        {telecallers?.map((t) => (
                          <CommandItem
                            key={t.id}
                            onSelect={() => {
                              setForm({ ...form, assignedTo: t.id });
                              setUnassign(false); // ← assigning to someone
                              setSearch('');
                            }}
                          >
                            {t.fullName || t.email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* ❌ remove assignedTo error block */}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 shadow-md"
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
