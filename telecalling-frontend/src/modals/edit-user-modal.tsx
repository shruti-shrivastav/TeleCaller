import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { Eye, EyeOff } from 'lucide-react';
import { editUserAtom } from './jotai/users-modal-atom';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import {
  fetchUsers,
  fetchUserById,
  updateUser,
} from '@/features/users/user-thunk';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { PhoneInput } from '@/components/phone-input';
import { isValidPhoneNumber } from 'react-phone-number-input';

export const EditUserModal = () => {
  const [editState, setEditState] = useAtom(editUserAtom);
  const { open, user, mode } = editState;
  const isAdminMode = mode === 'default';

  const dispatch = useAppDispatch();
  const { leaders } = useAppSelector((s) => s.users);

  const [loading, setLoading] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [debouncedLeaderSearch] = useDebounce(leaderSearch, 900);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: '',
    active: true,
    leaderId: '',
    password: '',
    confirmPassword: '',
  });

  /* Fetch leaders */
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

  /* Load user */
  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      try {
        const fullUser = await dispatch(fetchUserById(user.id)).unwrap();
        setForm({
          firstName: fullUser.firstName ?? '',
          lastName: fullUser.lastName ?? '',
          phone: fullUser.phone ?? '',
          role: fullUser.role ?? 'telecaller',
          active: fullUser.active ?? true,
          leaderId: fullUser.leaderId?._id || fullUser.leaderId || '',
          password: '',
          confirmPassword: '',
        });
      } catch {
        toast.error('Failed to load user details');
      }
    })();
  }, [open, user?.id, dispatch]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.phone) errs.phone = 'Phone number is required';
    else if (!isValidPhoneNumber(form.phone))
      errs.phone = 'Invalid phone number';

    if (form.password || form.confirmPassword) {
      if (form.password.length < 6)
        errs.password = 'Password must be at least 6 characters';
      if (form.password !== form.confirmPassword)
        errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return toast.error('Please fix errors before saving');

    try {
      setLoading(true);
      const { confirmPassword, ...rest } = form;
      const payload = rest.password ? rest : { ...rest, password: undefined };

      await dispatch(updateUser({ id: user.id, updates: payload })).unwrap();
      toast.success(`${form.role} updated successfully ✅`);
      setEditState({ open: false, user: null, mode: 'inline' });
      dispatch(fetchUsers({ page: 1, pageSize: 25 }));
    } catch {
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => setEditState({ open: v, user, mode: 'inline' })}
    >
      <DialogContent className="sm:max-w-lg rounded-2xl border border-border/70 bg-card backdrop-blur-xl p-8 space-y-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isAdminMode ? 'Admin: Edit User / Reset Password' : 'Edit User'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>First Name</Label>
              <input
                className="w-full border rounded-md p-2 border-input"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div className="flex-1">
              <Label>Last Name</Label>
              <input
                className="w-full border rounded-md p-2 border-input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <Label>Phone Number</Label>
            <PhoneInput
              defaultCountry="IN"
              international
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v || '' })}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <Label>Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="leader">Team Leader</SelectItem>
                <SelectItem value="telecaller">Telecaller</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Leader */}
          {form.role === 'telecaller' && (
            <div>
              <Label>Assign Team Leader</Label>
              <Popover open={leaderOpen} onOpenChange={setLeaderOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
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

          {/* Passwords */}
          {isAdminMode && (
            <div className="space-y-4">
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className={`w-full border rounded-md p-2 pr-10 ${
                      errors.password ? 'border-red-500' : 'border-input'
                    }`}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2.5 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label>Confirm Password</Label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className={`w-full border rounded-md p-2 pr-10 ${
                      errors.confirmPassword
                        ? 'border-red-500'
                        : 'border-input'
                    }`}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2.5 text-muted-foreground"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select
              value={form.active ? 'true' : 'false'}
              onValueChange={(v) => setForm({ ...form, active: v === 'true' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg py-5 shadow-md"
          >
            {loading ? 'Saving…' : `Save ${form.role || 'User'}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};