/**
 * Render the marketing landing page.
 * @returns {JSX.Element}
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen bg-gradient-to-br from-accent-purple/20 via-accent-violet/15 to-ink-900 px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col justify-between gap-10">
          {/* Navigation */}
          <nav className="flex flex-wrap items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-violet/10 ring-1 ring-white/10">
                <span className="font-display text-lg font-semibold text-white">T</span>
              </div>
              <div>
                <p className="font-display text-lg font-medium tracking-wide text-white">Thodemy</p>
                <p className="text-2xs uppercase tracking-widest text-slate-500">Learning Platform</p>
              </div>
            </div>

            {/* Nav Links - Hidden on mobile */}
            <div className="hidden items-center gap-8 md:flex">
              {["Home", "Features", "FAQ", "Contact"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-xs font-medium uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-white"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Auth Actions */}
            <div className="flex items-center gap-3">
              <a
                href="/auth/login"
                className="rounded-xl px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-slate-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
              >
                Log in
              </a>
              <a
                href="/auth/login"
                className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-purple-glow transition-all duration-200 hover:shadow-purple-glow-lg hover:brightness-110"
              >
                <span>Get Started</span>
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
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </nav>

          {/* Hero Section */}
          <div className="grid items-center gap-12 py-12 lg:grid-cols-[1.2fr_1fr] lg:py-16">
            {/* Hero Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-accent-purple/30 bg-accent-purple/10 px-4 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent-purple" />
                <span className="text-2xs font-medium uppercase tracking-widest text-accent-purple">
                  Learning Management System
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-4xl font-medium leading-[1.15] sm:text-5xl lg:text-6xl">
                <span className="text-slate-200">Track Your</span>
                <br />
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Training Journey
                </span>
                <br />
                <span className="text-white">With Confidence</span>
              </h1>

              {/* Description */}
              <p className="max-w-lg text-base leading-relaxed text-slate-400">
                Thodemy keeps your training milestones visible, measurable, and celebrated.
                A calm, confident dashboard built for modern learners and organizations.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="/auth/login"
                  className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-semibold uppercase tracking-widest text-ink-900 shadow-[0_8px_30px_rgba(255,255,255,0.15)] transition-all duration-200 hover:shadow-[0_12px_40px_rgba(255,255,255,0.2)]"
                >
                  <span>Start Tracking</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
                <a
                  href="#features"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-xs font-medium uppercase tracking-widest text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Learn More
                </a>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-8 pt-4">
                {[
                  { value: "30+", label: "Trainees" },
                  { value: "50+", label: "Topics" },
                  { value: "15+", label: "Courses" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="font-display text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="text-2xs uppercase tracking-widest text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative flex items-center justify-center">
              {/* Background Glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-purple/20 to-transparent blur-3xl" />

              {/* Concentric Circles */}
              <div className="relative flex h-72 w-72 items-center justify-center">
                <div className="absolute inset-0 animate-pulse-soft rounded-full border border-white/5" />
                <div className="absolute inset-6 rounded-full border border-white/10" />
                <div className="absolute inset-14 rounded-full border border-white/10" />
                <div className="absolute inset-24 rounded-full border border-white/15 bg-white/[0.02]" />

                {/* Center Content */}
                <div className="relative z-10 text-center">
                  <p className="font-display text-4xl font-semibold text-white">30+</p>
                  <p className="mt-1 text-2xs uppercase tracking-widest text-slate-400">Active Trainees</p>
                </div>

                {/* Floating Avatars */}
                {[
                  { className: "top-4 left-8", label: "AM", color: "from-indigo-500/30 to-purple-600/20" },
                  { className: "top-0 right-12", label: "TR", color: "from-emerald-500/30 to-teal-600/20" },
                  { className: "bottom-6 right-4", label: "PR", color: "from-amber-500/30 to-orange-600/20" },
                  { className: "bottom-2 left-14", label: "LG", color: "from-rose-500/30 to-pink-600/20" },
                  { className: "top-20 right-0", label: "ST", color: "from-cyan-500/30 to-blue-600/20" },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`absolute ${item.className} flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-[10px] font-semibold text-white ring-1 ring-white/10 transition-transform duration-300 hover:scale-110`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Partners/Trusted By */}
          <div className="border-t border-white/5 pt-6">
            <p className="mb-4 text-center text-2xs uppercase tracking-widest text-slate-600">
              Trusted by teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs uppercase tracking-widest text-slate-500">
              {["Udemy", "Portfolio", "Kape Kalakal", "Pokemon", "Auxilium"].map((partner) => (
                <span
                  key={partner}
                  className="transition-colors duration-200 hover:text-slate-300"
                >
                  {partner}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
