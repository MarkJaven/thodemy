type NavbarProps = {
  userEmail?: string | null;
  onSignOut?: () => void | Promise<void>;
};

const Navbar = ({ userEmail, onSignOut }: NavbarProps) => {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-3 font-display text-lg tracking-wide">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm">
          T
        </span>
        <div>
          <p className="text-white">Thodemy</p>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
            Training Hub
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {userEmail || "Guest"}
        </span>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
