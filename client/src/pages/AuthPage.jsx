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
      <div className="min-h-screen px-4 py-8 sm:py-10">
        <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center">
          <div className="auth-shell grid w-full overflow-hidden rounded-3xl border border-white/10 shadow-glow backdrop-blur-sm md:grid-cols-[1.15fr_1fr]">
            {/* Left Panel - Branding */}
            <section className="relative flex min-h-[420px] flex-col justify-between bg-gradient-to-br from-accent-purple/30 via-ink-800 to-ink-900 p-8 sm:p-10">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                    <span className="font-display text-lg font-semibold text-white">T</span>
                  </div>
                  <span className="font-display text-lg tracking-wide text-white">Thodemy</span>
                </div>
                <a
                  href="/"
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-widest text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </a>
              </div>

              {/* Hero Visual */}
              <div className="space-y-6">
                {/* Illustration Area */}
                <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-accent-purple/10 to-transparent">
                  {/* Decorative Elements */}
                  <div className="absolute inset-0">
                    <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-accent-purple/20 blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 h-24 w-24 rounded-full bg-accent-indigo/20 blur-2xl" />
                  </div>

                  {/* Icon */}
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple/30 to-accent-violet/20 ring-1 ring-white/10">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <span className="text-2xs font-medium uppercase tracking-widest text-white/50">
                      Learning Platform
                    </span>
                  </div>
                </div>

                {/* Tagline */}
                <div className="space-y-3">
                  <h2 className="font-display text-2xl font-medium leading-tight text-white sm:text-3xl">
                    Track your grind,
                    <br />
                    <span className="text-slate-300">Train your mind</span>
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-400">
                    A focused space to track your training progress, celebrate milestones, and stay aligned with your learning goals.
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-8 rounded-full bg-white" />
                  <span className="h-1.5 w-8 rounded-full bg-white/20" />
                  <span className="h-1.5 w-8 rounded-full bg-white/20" />
                </div>
              </div>
            </section>

            {/* Right Panel - Form */}
            <section className="flex flex-col justify-center gap-8 bg-ink-850/50 p-8 sm:p-10">
              {/* Header */}
              <div className="space-y-2">
                <h1 className="font-display text-2xl font-medium text-white sm:text-3xl">{title}</h1>
                <p className="text-sm text-slate-400">
                  Contact your administrator to request access.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-2xs font-medium uppercase tracking-widest text-slate-400">
                    Email address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 transition-all duration-200 focus:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-2xs font-medium uppercase tracking-widest text-slate-400">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 pr-12 text-sm text-white placeholder:text-slate-500 transition-all duration-200 focus:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors duration-200 hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 3l18 18" strokeLinecap="round" />
                          <path d="M10.5 10.7A3 3 0 0 0 12 15a3 3 0 0 0 1.3-.3" strokeLinecap="round" />
                          <path d="M7.4 7.5A10 10 0 0 0 2 12c1.4 2.5 4.7 6 10 6 1.7 0 3.3-.4 4.7-1" strokeLinecap="round" />
                          <path d="M20.5 15.8A10.4 10.4 0 0 0 22 12c-1.4-2.5-4.7-6-10-6-1.1 0-2.1.1-3 .4" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error/Info Message */}
                {(error || info) && (
                  <div
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                      error
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    {error ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    )}
                    <span>{error || info}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isConfigured}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet py-3.5 text-sm font-semibold text-white shadow-purple-glow transition-all duration-200 hover:shadow-purple-glow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-transform duration-200 group-hover:translate-x-0.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <p className="text-center text-xs text-slate-500">
                Need access?{" "}
                <a href="mailto:admin@thodemy.com" className="text-accent-purple transition-colors hover:text-white">
                  Contact your administrator
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
