import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { superAdminService } from "../services/superAdminService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Render the authentication experience.
 * @returns {JSX.Element}
 */
const AuthPage = () => {
  const navigate = useNavigate();
  const resolvedMode = "login";
  const isRegister = false;

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  /**
   * Reset view state when the auth mode changes.
   * @returns {void}
   */
  const resetModeState = () => {
    setError(null);
    setInfo(null);

    if (!authService.isConfigured) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
  };

  useEffect(resetModeState, [resolvedMode]);

  const title = useMemo(
    () => (isRegister ? "Create an account" : "Welcome back"),
    [isRegister]
  );

  /**
   * Track changes to form fields.
   * @param {React.ChangeEvent<HTMLInputElement>} event
   * @returns {void}
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Validate the current form state.
   * @returns {string|null}
   */
  const validate = () => {
    if (!EMAIL_REGEX.test(form.email)) {
      return "Enter a valid email address.";
    }
    if (form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    return null;
  };

  /**
   * Submit the auth form.
   * @param {React.FormEvent<HTMLFormElement>} event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!authService.isConfigured) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoadingTarget("form");
    try {
      await authService.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      const session = await authService.getSession();
      const role = await superAdminService.getCurrentRole(session?.user?.id);
      if (role === "superadmin") {
        navigate("/super-admin", { replace: true });
      } else if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (signInError) {
      setError(signInError.message);
    } finally {
      setLoadingTarget(null);
    }
  };

  const isSubmitting = loadingTarget === "form";
  const isConfigured = authService.isConfigured;

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen px-4 py-10">
        <div className="mx-auto flex min-h-[85vh] max-w-6xl items-center">
          <div className="auth-shell grid w-full gap-6 overflow-hidden rounded-[32px] border border-glass shadow-glow backdrop-blur md:grid-cols-[1.1fr_1fr]">
            <section className="relative flex min-h-[420px] flex-col justify-between gap-12 bg-gradient-to-br from-indigo-600/40 via-ink-800 to-ink-900 px-8 py-10">
              <div className="flex items-center justify-between text-sm">
                <div className="font-display text-lg tracking-[0.35em]">THODEMY</div>
                <a
                  href="/"
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white transition hover:bg-white/20"
                >
                  Back to website
                </a>
              </div>
              <div className="space-y-4">
                <div className="hero-image flex h-64 items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-slate-200/10 via-indigo-500/15 to-transparent">
                  <span className="text-xs uppercase tracking-[0.4em] text-white/60">
                    Hero placeholder
                  </span>
                </div>
                <div className="space-y-3">
                  <h2 className="font-display text-3xl leading-tight">
                    Track your grind,<br />Train your mind
                  </h2>
                  <p className="text-sm text-white/70">
                    A simple space to track your training and achievements.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="h-1.5 w-6 rounded-full bg-white/60" />
                  <span className="h-1.5 w-6 rounded-full bg-white/20" />
                  <span className="h-1.5 w-6 rounded-full bg-white/20" />
                </div>
              </div>
            </section>
            <section className="flex flex-col justify-center gap-6 px-6 py-10 sm:px-10">
              <div className="space-y-2">
                <h1 className="font-display text-3xl">{title}</h1>
                <p className="text-sm text-slate-400">
                  Contact your superadmin to request access.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 3l18 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.5 10.7A3 3 0 0 0 12 15a3 3 0 0 0 1.3-.3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M7.4 7.5A10 10 0 0 0 2 12c1.4 2.5 4.7 6 10 6 1.7 0 3.3-.4 4.7-1"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M20.5 15.8A10.4 10.4 0 0 0 22 12c-1.4-2.5-4.7-6-10-6-1.1 0-2.1.1-3 .4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </div>

                {(error || info) && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs ${
                      error
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    {error || info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !isConfigured}
                  className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Working..." : "Log in"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;





