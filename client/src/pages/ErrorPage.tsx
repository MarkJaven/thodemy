import { useNavigate } from "react-router-dom";

const ErrorPage = ({
  title = "Something went wrong",
  subtitle = "An unexpected error occurred. Please try again or contact support.",
  code,
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  code?: string;
  onRetry?: () => void;
}) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ink-900">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-indigo/5 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Warning icon */}
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[24px] border border-rose-500/15 bg-rose-500/10">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose-400">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[32px] font-bold tracking-tight text-slate-100">
            {title}
          </h1>
          <p className="max-w-md text-center text-[15px] text-slate-400">
            {subtitle}
          </p>
        </div>

        {/* Error code box */}
        {code && (
          <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-5 py-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="font-mono text-xs text-slate-500">{code}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry ?? (() => window.location.reload())}
            className="flex items-center gap-2 rounded-full bg-gradient-to-b from-accent-purple to-accent-purple/80 px-6 py-3 text-[13px] font-semibold tracking-wide text-white shadow-[0_4px_20px_0_rgba(124,58,237,0.25)] transition hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Try Again
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[13px] font-medium tracking-wide text-slate-300 transition hover:bg-white/10"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Brand */}
      <p className="absolute bottom-8 text-[13px] font-medium uppercase tracking-[2px] text-slate-600">
        Thodemy
      </p>
    </div>
  );
};

export default ErrorPage;
