/**
 * Render the marketing landing page.
 * @returns {JSX.Element}
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen bg-gradient-to-br from-[#bda6ff]/30 via-[#5f3dc4]/30 to-[#140c2c] px-6 py-6">
        <div className="mx-auto flex min-h-[90vh] max-w-6xl flex-col justify-between rounded-[36px] border border-white/10 bg-gradient-to-br from-[#1c1436]/95 via-[#17122b]/95 to-[#0c0b14]/95 p-8 shadow-glow backdrop-blur">
          <nav className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 font-display text-lg tracking-wide">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                T
              </span>
              Thodemy
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs uppercase tracking-widest text-slate-300">
              <span className="cursor-pointer transition hover:text-white">Home</span>
              <span className="cursor-pointer transition hover:text-white">Features</span>
              <span className="cursor-pointer transition hover:text-white">FAQ</span>
              <span className="cursor-pointer transition hover:text-white">Contact Us</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/auth/login"
                className="text-xs uppercase tracking-widest text-slate-300 hover:text-white"
              >
                Log in
              </a>
              <a
                href="/auth/register"
                className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
              >
                Start Tracking
              </a>
            </div>
          </nav>

          <div className="grid items-center gap-12 py-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-8">
              <h1 className="font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
                <span className="text-[#d2c8ff]">Unlock Your Training Wins</span>
                <br />
                <span className="text-[#d2c8ff]">You Thought Were Out of Reach?</span>
                <br />
                <span className="text-white">Now Just One Track Away!</span>
              </h1>
              <p className="max-w-xl text-sm text-slate-300">
                Thodemy keeps your training milestones visible, measurable, and celebrated with a
                calm, confident dashboard built for modern learners.
              </p>
              <button className="rounded-full border border-white/10 bg-white/10 px-6 py-3 text-xs uppercase tracking-widest text-white shadow-[0_12px_30px_rgba(35,18,86,0.5)] transition hover:bg-white/20">
                Start Tracking
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-white/10 blur-sm" />
              <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-white/10">
                <div className="absolute inset-6 rounded-full border border-white/10" />
                <div className="absolute inset-14 rounded-full border border-white/10" />
                <div className="absolute inset-24 rounded-full border border-white/10" />
                <div className="relative text-center">
                  <p className="text-3xl font-semibold text-white">30+</p>
                  <p className="text-xs uppercase tracking-widest text-slate-300">Trainees</p>
                </div>
              </div>

              {[
                { className: "top-6 left-10", label: "AM" },
                { className: "top-0 right-14", label: "TR" },
                { className: "bottom-8 right-6", label: "PR" },
                { className: "bottom-4 left-16", label: "LG" },
                { className: "top-24 right-2", label: "ST" },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`absolute ${item.className} flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-semibold text-white`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs uppercase tracking-[0.3em] text-slate-500">
            <span>UDEMY</span>
            <span>PORTFOLIO</span>
            <span>KAPE KALAKAL</span>
            <span>POKEMON</span>
            <span>AUXILIUM HELPDESK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

