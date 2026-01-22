import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthPage = () => {
  const { mode } = useParams();
  const navigate = useNavigate();
  const resolvedMode = mode === "login" ? "login" : "register";
  const isRegister = resolvedMode === "register";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    setError(null);
    setInfo(null);
  }, [resolvedMode]);

  const title = useMemo(
    () => (isRegister ? "Create an account" : "Welcome back"),
    [isRegister]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!EMAIL_REGEX.test(form.email)) {
      return "Enter a valid email address.";
    }
    if (form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (isRegister) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        return "First and last name are required.";
      }
      if (!acceptTerms) {
        return "You must accept the terms to continue.";
      }
      if (!acceptPrivacy) {
        return "You must accept the data privacy notice to continue.";
      }
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!supabase) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoadingTarget("form");
    if (isRegister) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoadingTarget(null);
        return;
      }

      if (!data.session) {
        setInfo("Check your email to confirm your account.");
      }

      navigate("/dashboard", {
        replace: true,
        state: { pendingEmail: !data.session },
      });
      setLoadingTarget(null);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoadingTarget(null);
      return;
    }

    navigate("/dashboard", { replace: true });
    setLoadingTarget(null);
  };

  const handleOAuth = async (provider) => {
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    setLoadingTarget(provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoadingTarget(null);
    }
  };

  const isSubmitting = loadingTarget === "form";
  const isConfigured = Boolean(supabase);

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
                  {isRegister ? (
                    <>
                      Already have an account?{" "}
                      <Link className="text-indigo-300 hover:text-indigo-200" to="/auth/login">
                        Log in
                      </Link>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{" "}
                      <Link className="text-indigo-300 hover:text-indigo-200" to="/auth/register">
                        Create account
                      </Link>
                    </>
                  )}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      autoComplete="given-name"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      autoComplete="family-name"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                )}
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
                    autoComplete={isRegister ? "new-password" : "current-password"}
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

                {isRegister && (
                  <label className="flex items-start gap-3 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(event) => setAcceptTerms(event.target.checked)}
                      className="mt-0.5 rounded border-white/20 bg-white/10 text-indigo-400 focus:ring-indigo-400"
                    />
                    <span>
                      I agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowTerms(true)}
                        className="text-indigo-300 underline-offset-4 hover:underline"
                      >
                        Terms &amp; Conditions
                      </button>
                    </span>
                  </label>
                )}

                {isRegister && (
                  <label className="flex items-start gap-3 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={acceptPrivacy}
                      onChange={(event) => setAcceptPrivacy(event.target.checked)}
                      className="mt-0.5 rounded border-white/20 bg-white/10 text-indigo-400 focus:ring-indigo-400"
                    />
                    <span>
                      I acknowledge the{" "}
                      <button
                        type="button"
                        onClick={() => setShowPrivacy(true)}
                        className="text-indigo-300 underline-offset-4 hover:underline"
                      >
                        Data Privacy Act of 2012
                      </button>
                    </span>
                  </label>
                )}

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
                  {isSubmitting
                    ? "Working..."
                    : isRegister
                    ? "Create account"
                    : "Log in"}
                </button>
              </form>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="h-px flex-1 bg-white/10" />
                <span>Or continue with</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={loadingTarget === "google" || !isConfigured}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">
                    G
                  </span>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("azure")}
                  disabled={loadingTarget === "azure" || !isConfigured}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="grid h-5 w-5 grid-cols-2 gap-0.5">
                    <span className="block h-2.5 w-2.5 bg-[#f25022]" />
                    <span className="block h-2.5 w-2.5 bg-[#7fba00]" />
                    <span className="block h-2.5 w-2.5 bg-[#00a4ef]" />
                    <span className="block h-2.5 w-2.5 bg-[#ffb900]" />
                  </span>
                  Microsoft
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Terms &amp; Conditions</h3>
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <p className="mt-4 text-justify text-sm text-slate-300">
              By using Thodemy, you agree to use the platform responsibly and only for its intended
              purpose of tracking training and achievements. You are responsible for your account
              and the information you provide, and your data will be handled securely and used only
              to operate and improve the service. You agree not to misuse, abuse, or attempt to
              disrupt the platform, and you understand that features may change or be unavailable
              at times as Thodemy continues to improve.
            </p>
          </div>
        </div>
      )}

      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Data Privacy Act Notice</h3>
              <button
                type="button"
                onClick={() => setShowPrivacy(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <p className="mt-4 text-justify text-sm text-slate-300">
              Thodemy is committed to protecting the privacy and security of personal data in
              compliance with the Data Privacy Act of 2012 (Republic Act No. 10173). All personal
              information collected, processed, and stored by the platform shall be handled with
              confidentiality and used solely for legitimate purposes related to providing training
              and progress-tracking services. Appropriate organizational, physical, and technical
              security measures are implemented to safeguard personal data against unauthorized
              access, alteration, disclosure, or destruction. Users have the right to access,
              correct, and request the deletion of their personal information in accordance with
              the provisions of the Act and its implementing rules and regulations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
