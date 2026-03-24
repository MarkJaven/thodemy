import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ink-900">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-indigo/5 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Large 404 */}
        <span className="select-none bg-gradient-to-b from-accent-purple/30 to-accent-purple/5 bg-clip-text text-[140px] font-extrabold leading-none tracking-[-6px] text-transparent">
          404
        </span>

        {/* Icon */}
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] border border-accent-purple/15 bg-accent-purple/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-purple/80">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
            <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[32px] font-bold tracking-tight text-slate-100">
            Page not found
          </h1>
          <p className="text-[15px] text-slate-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-b from-accent-purple to-accent-purple/80 px-6 py-3 text-[13px] font-semibold tracking-wide text-white shadow-[0_4px_20px_0_rgba(124,58,237,0.25)] transition hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Go Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[13px] font-medium tracking-wide text-slate-300 transition hover:bg-white/10"
          >
            Go Home
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

export default NotFoundPage;
