import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { createUser, fetchUsers } from '@/features/users/user-thunk';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createUserAtom } from './jotai/users-modal-atom';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebounce } from 'use-debounce';
import { PhoneInput } from '@/components/phone-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';

export const CreateUserModal = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useAtom(createUserAtom);
  const { open, mode } = modal;
  const { user, role } = useAuth();
  const dispatch = useAppDispatch();
  const { leaders } = useAppSelector((s) => s.users);
  console.log(mode);
  const isTelecallerMode = mode === 'telecaller';
  const isLeaderMode = mode === 'leader';

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [debouncedLeaderSearch] = useDebounce(leaderSearch, 900);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: isLeaderMode ? 'leader' : 'telecaller',
    leaderId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (debouncedLeaderSearch.trim().length >= 1 || !leaders.length) {
      dispatch(
        fetchUsers({
          role: 'leader',
          search: debouncedLeaderSearch,
          pageSize: 20,
        })
      );
    }
  }, [debouncedLeaderSearch, dispatch]);

  useEffect(() => {
    if (form.role !== 'telecaller' && form.leaderId) {
      setForm((f) => ({ ...f, leaderId: '' }));
    }
  }, [form.role]);

  const roleTitle = isLeaderMode
    ? 'Create Team Leader'
    : isTelecallerMode
    ? 'Create Telecaller'
    : form.role === 'leader'
    ? 'Create Team Leader'
    : form.role === 'telecaller'
    ? 'Create Telecaller'
    : 'Create User';

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.password.trim()) errs.password = 'Password is required';
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
        role: isLeaderMode
          ? 'leader'
          : isTelecallerMode
          ? 'telecaller'
          : form.role,
        // ✅ Auto-assign telecaller’s leaderId if current user is leader
        leaderId: isTelecallerMode ? undefined : form.leaderId,
      };

      // If the logged-in user is a leader, force assignment to self
      const { user } = JSON.parse(localStorage.getItem('auth') || '{}');
      if (user?.role === 'leader') {
        payload.role = 'telecaller';
        payload.leaderId = user.id;
      }

      await dispatch(createUser(payload)).unwrap();
      toast.success(`${roleTitle} created successfully ✨`);

      setModal({ open: false });
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: isLeaderMode ? 'leader' : 'telecaller',
        leaderId: '',
      });
      setLeaderSearch('');
      setLeaderOpen(false);

      //   if (payload.role === 'telecaller') {
      //     dispatch(fetchUsers({ page: 1, pageSize: 25, role: 'telecaller' }));
      //   } else if (payload.role === 'leader') {
      //     dispatch(fetchUsers({ page: 1, pageSize: 25, role: 'leader' }));
      //   } else {
      //     dispatch(fetchUsers({ page: 1, pageSize: 25 }));
      //   }
      await dispatch(fetchUsers({ page: 1, pageSize: 25 }));
    } catch (err: any) {
      toast.error(err || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => setModal({ open: v })}>
      <DialogContent className="sm:max-w-lg rounded-2xl border border-border/70 bg-card backdrop-blur-xl p-8 space-y-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {roleTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className='my-2'>First Name</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                required
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="flex-1">
              <Label className='my-2'>Last Name</Label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className='my-2'>Email</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

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
              <p className="text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          <div>
            <Label className='my-2'>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Role Selection */}
          {!isTelecallerMode && !isLeaderMode && (
            <div>
              <Label className='my-2'>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger className="mt-1 bg-background border-border w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telecaller">Telecaller</SelectItem>
                  <SelectItem value="leader">Team Leader</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assign Team Leader */}
          {!isLeaderMode && form.role === 'telecaller' && role !== 'leader' && (
            <div>
              <Label className='my-2'>Assign Team Leader</Label>
              <Popover open={leaderOpen} onOpenChange={setLeaderOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {form.leaderId
                      ? leaders.find((l) => l.id === form.leaderId)?.fullName ||
                        leaders.find((l) => l.id === form.leaderId)?.email
                      : 'Select a leader'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[320px]">
                  <Command>
                    <CommandInput
                      placeholder="Search leaders..."
                      value={leaderSearch}
                      onValueChange={setLeaderSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No leaders found.</CommandEmpty>
                      <CommandGroup>
                        {leaders.map((leader) => (
                          <CommandItem
                            key={leader.id}
                            onSelect={() => {
                              setForm({ ...form, leaderId: leader.id });
                              setLeaderOpen(false);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {leader.fullName || 'Unnamed'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {leader.email}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg py-5 shadow-md"
          >
            {loading ? 'Creating…' : roleTitle}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
