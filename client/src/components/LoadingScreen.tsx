const LoadingScreen = ({ message = "Loading your workspace", subtitle = "Preparing your learning experience..." }: { message?: string; subtitle?: string }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ink-900">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/10 blur-[100px] animate-loading-glow" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-indigo/5 blur-[120px] animate-loading-glow-delayed" />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo icon */}
        <div className="flex h-[120px] w-[120px] items-center justify-center rounded-[28px] border border-accent-purple/20 bg-gradient-to-b from-accent-purple/20 to-accent-indigo/10 animate-loading-float">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent-purple">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-100 animate-loading-fade-in">
            {message}
          </h1>
          <p className="text-[15px] text-slate-400 animate-loading-fade-in-delayed">
            {subtitle}
          </p>
        </div>

        {/* Spinner */}
        <div className="relative h-10 w-10 animate-loading-fade-in-delayed">
          <div className="absolute inset-0 rounded-full border-[3px] border-accent-purple/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-accent-purple/70 animate-spin" />
        </div>

        {/* Progress bar */}
        <div className="h-1 w-60 overflow-hidden rounded-full bg-accent-purple/10 animate-loading-fade-in-delayed">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-accent-purple to-accent-purple/60 animate-loading-progress" />
        </div>
      </div>

      {/* Brand */}
      <p className="absolute bottom-8 text-[13px] font-medium uppercase tracking-[2px] text-slate-600 animate-loading-fade-in-delayed">
        Thodemy
      </p>
    </div>
  );
};

export default LoadingScreen;
