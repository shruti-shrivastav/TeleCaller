import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, PhoneCall, BarChart3, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/hooks/use-store';
import { loginUser } from '@/features/auth/auth-thunk';

const Login = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { user, loading } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session') === 'expired') {
      toast.error('Your session has expired. Please log in again.');
    }
  }, [location]);

  if (user) return <Navigate to="/dashboard" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      toast.success('Login successful');
    } catch (err: any) {
      toast.error(err || 'Invalid credentials');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_top,_background,_#020617)] text-[var(--primary)]">
      {/* background grid / frame */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
        <div className="h-full w-full bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* animated glows */}
      {/* <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[26rem] w-[26rem] rounded-full bg-cyan-500/25 blur-3xl"
        animate={{ y: [0, 24, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-indigo-600/25 blur-3xl"
        animate={{ y: [0, -24, 0], scale: [1.05, 1, 1.05] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      /> */}

      <div className="relative z-10 flex w-full flex-col lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* LEFT PANEL – BRAND / HERO / METRICS */}
        <motion.section
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="hidden lg:flex flex-col justify-between px-10 xl:px-16 py-8 border-r border-slate-800/70 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950/80"
        >
          {/* brand header */}
          <header className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-slate-900/70 shadow-[0_0_0_1px_rgba(8,47,73,0.6)]">
              <img src="/logo.png" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                Samarth Properties
              </p>
              <p className="text-sm text-slate-300">
                Telecaller Control Console
              </p>
            </div>
          </header>

          {/* hero copy */}
          <div className="mt-10 max-w-xl space-y-5">
            <h1 className="text-4xl xl:text-5xl font-semibold leading-tight text-slate-50">
              High-velocity calling,
              <span className="text-cyan-400"> zero chaos</span>.
            </h1>
            <p className="text-sm xl:text-base text-slate-300/90 max-w-md">
              Centralize leads, track every interaction, and give your
              telecalling team the structure it needs to close more deals for
              Samarth Properties.
            </p>

            {/* highlights */}
          </div>

          {/* footer text */}
          <footer className="mt-10 text-[11px] text-slate-500">
            Logged-in activity is monitored for data security and compliance.
          </footer>
        </motion.section>

        {/* RIGHT PANEL – LOGIN FORM */}
        <motion.section
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10"
        >
          <Card className="w-full max-w-[420px] rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-[0_18px_60px_rgba(15,23,42,0.85)] backdrop-blur-xl">
            <CardContent className="p-7 sm:p-8 space-y-7">
              {/* Mobile brand header */}
              <div className="flex items-center justify-between lg:hidden mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-slate-900/80">
                    <PhoneCall className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-400">
                      Samarth Properties
                    </p>
                    <p className="text-xs text-slate-300">Telecaller Console</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
                  Sign in to your workspace
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                  Use your Samarth Properties telecaller credentials to access
                  leads, follow-ups, and call workflows.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-medium text-slate-200"
                  >
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@samarthproperties.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-0.5 h-11 rounded-lg border-slate-700/80 bg-slate-900/70 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-xs font-medium text-slate-200"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-0.5">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 rounded-lg border-slate-700/80 bg-slate-900/70 pr-10 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff size={18} strokeWidth={1.7} />
                      ) : (
                        <Eye size={18} strokeWidth={1.7} />
                      )}
                    </button>
                  </div>
                </div>

                {/* bottom row under fields */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Secure SSO powered by JWT</span>
                  </div>
                  <span className="hidden sm:inline">
                    Need access? Contact your admin.
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full h-11 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold tracking-wide shadow-[0_12px_30px_rgba(8,145,178,0.45)] hover:bg-cyan-400 hover:shadow-[0_16px_40px_rgba(8,145,178,0.6)] transition-all"
                >
                  {loading ? 'Authenticating…' : 'Sign in'}
                </Button>
              </form>

              {/* small footer info */}
              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Access is restricted to authorized Samarth Properties staff.
                  All activity within this console is logged for audit and
                  compliance.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default Login;
