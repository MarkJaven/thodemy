type NavbarProps = {
  userEmail?: string | null;
  onSignOut?: () => void | Promise<void>;
  onProfileClick?: () => void;
};

const Navbar = ({ userEmail, onSignOut, onProfileClick }: NavbarProps) => {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-4">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-violet/10 ring-1 ring-white/10">
          <span className="font-display text-lg font-semibold text-white">T</span>
        </div>
        <div>
          <p className="font-display text-lg font-medium tracking-wide text-white">Thodemy</p>
          <p className="text-2xs uppercase tracking-[0.35em] text-slate-500">
            Learning Platform
          </p>
        </div>
      </div>

      {/* User Controls */}
      <div className="flex items-center gap-3">
        {/* User Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-purple/20 text-2xs font-semibold uppercase text-accent-purple">
            {userEmail ? userEmail.charAt(0).toUpperCase() : "G"}
          </div>
          <span className="max-w-[140px] truncate text-xs text-slate-300">
            {userEmail || "Guest"}
          </span>
        </div>

        {/* Profile Button */}
        <button
          type="button"
          onClick={onProfileClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
          title="Profile"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={onSignOut}
          className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-white shadow-purple-glow transition-all duration-200 hover:shadow-purple-glow-lg hover:brightness-110"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
