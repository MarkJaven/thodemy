import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { sessionService } from "../services/sessionService";
import { superAdminService } from "../services/superAdminService";
import logoThodemy from "../assets/images/logo-thodemy.png";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Render the authentication experience.
 * @returns {JSX.Element}
 */
const AuthPage = () => {
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
      const userId = session?.user?.id;
      if (userId) {
        // Fire-and-forget to avoid blocking login on network delays.
        sessionService.createSession(userId).catch(() => {});
        sessionService.announceSession().catch(() => {});
      }
      const role = await Promise.race([
        superAdminService.getCurrentRole(session?.user?.id),
        new Promise((resolve) => setTimeout(() => resolve(null), 6000)),
      ]);
      if (role === "superadmin") {
        window.location.replace("/super-admin");
      } else if (role === "admin") {
        window.location.replace("/admin");
      } else {
        window.location.replace("/dashboard");
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
      <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[85vh] max-w-6xl items-center">
          <div className="auth-shell grid w-full overflow-hidden rounded-3xl border border-white/10 shadow-glow backdrop-blur-sm lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Panel - Auth Story */}
            <section className="relative flex flex-col justify-between gap-10 bg-gradient-to-br from-ink-900 via-ink-850 to-ink-900 p-7 sm:p-10">
              <header className="flex w-full items-center justify-between">
                {/* Logo */}
                <div className="flex items-center">
                  <img
                    src={logoThodemy}
                    alt="Thodemy"
                    className="h-8 w-auto origin-left scale-[2.5] sm:h-9 sm:scale-[2.8] lg:scale-[3]"
                  />
                </div>

                {/* Back Button */}
                <a
                  href="/"
                  className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent-purple to-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-900 shadow-[0_8px_20px_rgba(124,92,255,0.3)] transition-all duration-200 hover:scale-[1.02] hover:brightness-105 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-xs sm:tracking-[0.15em]"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="transition-transform duration-200 group-hover:-translate-x-0.5"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </a>
              </header>

              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
                  Secure employee access
                </div>

                <div className="space-y-4">
                  <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                    Welcome back to your learning hub
                  </h1>
                  <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                    Sign in to continue tracking training, verification, and regularization status in one secure space.
                  </p>
                </div>

                <div className="space-y-3 text-sm text-slate-300 sm:text-base">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent-purple/40 bg-[#101326] text-sm font-semibold text-accent-purple shadow-[0_0_18px_rgba(124,92,255,0.25)]">
                      01
                    </span>
                    <span>Progress snapshots by topic and milestone.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent-purple/40 bg-[#101326] text-sm font-semibold text-accent-purple shadow-[0_0_18px_rgba(124,92,255,0.25)]">
                      02
                    </span>
                    <span>Verification-ready records for audits.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent-purple/40 bg-[#101326] text-sm font-semibold text-accent-purple shadow-[0_0_18px_rgba(124,92,255,0.25)]">
                      03
                    </span>
                    <span>Manager approvals with clear history.</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Active tracks
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-white">12</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Completion
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-white">86%</p>
                </div>
              </div>
            </section>

            {/* Right Panel - Form */}
            <section className="flex flex-col justify-center gap-6 bg-ink-850/60 p-7 sm:p-10">
              <div className="rounded-3xl border border-white/10 bg-ink-900/60 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-8">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                    {title}
                  </h2>
                  <p className="text-sm text-slate-300 sm:text-base">
                    Use your company email to continue.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Email address
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder:text-slate-500 transition-all duration-200 focus:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 pr-12 text-base text-white placeholder:text-slate-500 transition-all duration-200 focus:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/20"
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

                  {(error || info) && (
                    <div
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm sm:text-base ${
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

                  <button
                    type="submit"
                    disabled={isSubmitting || !isConfigured}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet py-3.5 text-base font-semibold text-white shadow-purple-glow transition-all duration-200 hover:shadow-purple-glow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
              </div>

              <p className="text-center text-xs text-slate-400 sm:text-sm">
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
