import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { createLead, fetchLeads } from '@/features/leads/lead-thunk';
import { fetchUsers } from '@/features/users/user-thunk';
import { PhoneInput } from '@/components/phone-input'; // ✅ using your component
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useAtom } from 'jotai';
import { createLeadAtom } from './jotai/leads-modal-atom';
import { useAuth } from '@/hooks/use-auth';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PROJECT_OPTIONS } from '@/constants/projects';

export const CreateLeadModal = () => {
  const { user, role } = useAuth();
  const [modal, setModal] = useAtom(createLeadAtom);
  const { open } = modal;
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    source: string; // 🆕 Added source field
    notes: string;
    assignedTo: string | null; // ← allow null
    project: string;
  }>({
    name: '',
    phone: '',
    source: '', // 🆕 Initialize source
    notes: '',
    assignedTo: null,
    project: '',
  });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { telecallers } = useAppSelector((s) => s.users);

  // Fetch telecallers when modal opens
  useEffect(() => {
    if (open) dispatch(fetchUsers({ role: 'telecaller', pageSize: 100 }));
  }, [open, dispatch]);

  // Fetch telecallers on search change
  useEffect(() => {
    if (popoverOpen) {
      dispatch(fetchUsers({ role: 'telecaller', pageSize: 100, search }));
    }
  }, [search, dispatch, popoverOpen]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.phone) errs.phone = 'Phone number is required';
    else if (!isValidPhoneNumber(form.phone))
      errs.phone = 'Invalid phone number';
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
      const payload = {
        ...form,
        project: role === 'admin' ? form.project || undefined : undefined,
        assignedTo: form.assignedTo
          ? form.assignedTo
          : role === 'telecaller'
          ? user.id
          : null,
      };
      await dispatch(createLead(payload)).unwrap();
      toast.success('Lead created successfully');
      setModal({ open: false });
      setForm({
        name: '',
        phone: '',
        source: '',
        notes: '',
        assignedTo: '',
        project: '',
      }); // 🆕 Reset source
      setErrors({});
      dispatch(fetchLeads({ page: 1, pageSize: 20 }));
    } catch {
      toast.error('Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const selectedTelecaller = telecallers?.find((t) => t.id === form.assignedTo);

  return (
    <Dialog open={open} onOpenChange={(v) => setModal({ open: v })}>
      <DialogContent className="sm:max-w-lg rounded-2xl border border-border/70 bg-card backdrop-blur-xl shadow-md p-8 space-y-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Create New Lead
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <Label className='my-2'>Name</Label>
            <Input
              type="text"
              placeholder="Enter lead name"
              className={`w-full ${errors.name ? 'border-red-500' : ''}`}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Phone (react-phone-number-input) */}
          <div>
            <Label className='my-2'>Phone Number</Label>
            <PhoneInput
              defaultCountry="IN"
              international
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value || '' })}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* 🆕 Source Input Field */}
          <div>
            <Label className='my-2'>Source</Label>
            <Input
              type="text"
              placeholder="Where did this lead come from?"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          </div>

          {/* Project - admin only */}
          {role === 'admin' && (
            <div>
              <Label className="my-2">Project</Label>
              <Select
                value={form.project}
                onValueChange={(v) => setForm({ ...form, project: v })}
              >
                <SelectTrigger className="w-full">
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
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className='my-2'>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              className="w-full"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {/* Assigned To */}
          {role !== 'telecaller' && (
            <div>
              <Label className='my-2'>Assign To (Telecaller)</Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={popoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedTelecaller
                      ? selectedTelecaller.fullName || selectedTelecaller.email
                      : 'Unassigned'}
                    <svg
                      className="ml-2 h-4 w-4 shrink-0 opacity-50"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.08 1.04l-4.25 4.65a.75.75 0 01-1.08 0l-4.25-4.65a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-full max-w-[300px]">
                  <Command>
                    <CommandInput
                      placeholder="Search telecallers..."
                      value={search}
                      onValueChange={setSearch}
                      autoFocus
                    />
                    <CommandEmpty>No telecallers found.</CommandEmpty>
                    <CommandGroup>
                      {/* ⬇️ First item: Unassigned */}
                      <CommandItem
                        key="__unassigned__"
                        onSelect={() => {
                          setForm({ ...form, assignedTo: null });
                          setPopoverOpen(false);
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
                            setPopoverOpen(false);
                            setSearch('');
                          }}
                        >
                          {t.fullName || t.email}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg py-5 shadow-md"
          >
            {loading ? 'Creating…' : 'Create Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
