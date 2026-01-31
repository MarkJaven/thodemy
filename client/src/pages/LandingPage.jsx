import { useState } from "react";
import logoThodemy from "../assets/images/logo-thodemy.png";
import progressImg from "../assets/images/Progress-that.png";
import trainersImg from "../assets/images/Trainers-verif.png";
import auditImg from "../assets/images/Audit-histo.png";
import faceOne from "../assets/images/orbit1.jpg";
import faceTwo from "../assets/images/orbit2.jpg";
import faceThree from "../assets/images/orbit3.jpg";
import faceFour from "../assets/images/orbit4.jpg";
import faceFive from "../assets/images/orbit5.jpg";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Core Features", href: "#core-features" },
  { label: "Governance", href: "#governance" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

const orbitAvatars = [
  { src: faceOne, alt: "AM", size: "440px", delay: "0s" },
  { src: faceTwo, alt: "TR", size: "390px", delay: "-5.2s" },
  { src: faceThree, alt: "ST", size: "340px", delay: "-10.4s" },
  { src: faceFour, alt: "PR", size: "290px", delay: "-15.6s" },
  { src: faceFive, alt: "LG", size: "240px", delay: "-20.8s" },
];

const steps = [
  {
    number: "01",
    title: "Define the Learning Path",
    description:
      "Create courses, topics, and evaluation checkpoints for each role.",
  },
  {
    number: "02",
    title: "Bootcampers Complete Activities",
    description:
      "Learners submit tasks and progress is captured automatically.",
  },
  {
    number: "03",
    title: "Trainers Verify and Log",
    description: "Approvals are role-based and written to the audit log.",
  },
];

const featureRows = [
  {
    title: "Progress you can trust",
    description:
      "Structured milestones make completion visible across learning paths, courses, and topics.",
    image: progressImg,
    imageAlt: "Progress overview",
    reverse: false,
  },
  {
    title: "Verification workflows for trainers",
    description:
      "Role-based approvals ensure consistent evaluations across cohorts and trainers.",
    image: trainersImg,
    imageAlt: "Trainer verification",
    reverse: true,
  },
  {
    title: "Audit-ready reporting for HR",
    description:
      "Logs, soft delete, and history make regularization decisions defensible.",
    image: auditImg,
    imageAlt: "Audit history",
    reverse: false,
  },
];

const capabilityCards = [
  {
    title: "Role-based access control",
    description:
      "Bootcamper, Trainer, Admin, Super Admin permissions are enforced system-wide.",
  },
  {
    title: "Soft deletion by default",
    description:
      "No hard deletes. Historical records remain available for audit review.",
  },
  {
    title: "Cohort management",
    description:
      "Track multiple bootcamp batches with consistent evaluation checkpoints.",
  },
  {
    title: "Evaluation rubrics",
    description:
      "Standardize scoring so trainer assessments are fair and comparable.",
  },
  {
    title: "Activity tracking",
    description:
      "Capture submissions, evaluations, and completions in one timeline.",
  },
  {
    title: "Reports and exports",
    description: "Generate audit-ready summaries for HR and leadership.",
  },
];

const testimonials = [
  {
    role: "Bootcamper",
    quote:
      "Thodemy made it very clear what I needed to complete for my regularization. I could track my progress per topic and course, and there was no confusion about what was still pending. It removed a lot of anxiety during training.",
    attribution: "Bootcamp Participant",
  },
  {
    role: "Trainer / Admin",
    quote:
      "Before Thodemy, we tracked everything in spreadsheets. Now, verifying topic completion and monitoring learner progress is centralized and consistent. It saves us hours every week.",
    attribution: "Technical Trainer",
  },
  {
    role: "HR / Management",
    quote:
      "Thodemy gave us a single source of truth for training completion. When it is time for regularization, the data is clear, auditable, and fair across all trainees.",
    attribution: "HR Manager",
  },
  {
    role: "Admin (Verification Workflow)",
    quote:
      "The topic status workflow is very well thought out. We can review submissions, mark them as completed, and immediately see how it affects the learner's overall progress.",
    attribution: "Training Administrator",
  },
  {
    role: "Organization-Level Impact",
    quote:
      "Thodemy helped standardize our bootcamp process. Everyone, trainees, trainers, and HR work from the same system, reducing miscommunication and improving accountability.",
    attribution: "Operations Lead",
  },
];

const faqItems = [
  {
    number: "01",
    question: "Does Thodemy support role-based access control?",
    answer:
      "Yes. User, Admin, and Super Admin roles are enforced across actions and views.",
  },
  {
    number: "02",
    question: "How are evaluations verified?",
    answer:
      "Trainer approvals are captured per activity and written to the log.",
  },
  {
    number: "03",
    question: "Can we recover deleted records?",
    answer:
      "Soft delete is standard; data is retained and can be restored for audits.",
  },
  {
    number: "04",
    question: "What does HR see during regularization review?",
    answer:
      "Completion status, evaluation history, and trails tied to the learning path.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative overflow-hidden bg-[#0B0D14]">
      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[300px] w-[300px] rounded-full bg-accent-purple/8 blur-[120px] sm:h-[500px] sm:w-[500px]" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-[250px] w-[250px] rounded-full bg-accent-purple/5 blur-[100px] sm:h-[400px] sm:w-[400px]" />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-24">
        {/* Header */}
        <div className="mb-8 text-center sm:mb-16">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:mb-6 sm:text-xs sm:tracking-[0.2em]">
            FAQ
          </p>
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl md:text-4xl lg:text-5xl">
            Questions trainers and HR ask
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
              before adopting.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:mt-6 sm:text-lg">
            Clear answers to common governance and workflow concerns.
          </p>
        </div>

        {/* FAQ Cards Grid */}
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;
              const icons = [
                // Shield icon for role-based access
                <svg
                  key="shield"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>,
                // Clipboard check icon for evaluations
                <svg
                  key="clipboard"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>,
                // Archive icon for deleted records
                <svg
                  key="archive"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>,
                // Eye icon for HR view
                <svg
                  key="eye"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>,
              ];

              return (
                <div
                  key={item.number}
                  onClick={() => toggleFaq(index)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-500 sm:rounded-3xl sm:p-6 ${
                    isOpen
                      ? "border-accent-purple/60 bg-gradient-to-br from-[#1E1750] via-[#15183A] to-[#0F1328] shadow-[0_0_60px_rgba(124,92,255,0.15)]"
                      : "border-white/10 bg-[#0F1120]/80 hover:border-accent-purple/30 hover:shadow-[0_0_40px_rgba(124,92,255,0.08)]"
                  }`}
                >
                  {/* Animated corner accent */}
                  <div
                    className={`absolute -right-8 -top-8 h-24 w-24 rounded-full transition-all duration-500 ${
                      isOpen
                        ? "bg-accent-purple/30 blur-2xl"
                        : "bg-accent-purple/0 group-hover:bg-accent-purple/10 blur-2xl"
                    }`}
                  />
                  <div
                    className={`absolute -left-4 -bottom-4 h-16 w-16 rounded-full transition-all duration-500 ${
                      isOpen ? "bg-accent-purple/20 blur-xl" : "bg-transparent"
                    }`}
                  />

                  {/* Top row with number and icon */}
                  <div className="relative mb-3 flex items-center justify-between sm:mb-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 sm:h-12 sm:w-12 sm:rounded-2xl ${
                        isOpen
                          ? "bg-gradient-to-br from-accent-purple to-purple-400 text-white shadow-[0_8px_24px_rgba(124,92,255,0.5)]"
                          : "bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-400"
                      }`}
                    >
                      <span className="text-base font-bold sm:text-lg">
                        {item.number}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg p-2 transition-all duration-500 sm:rounded-xl sm:p-2.5 ${
                        isOpen
                          ? "bg-accent-purple/20 text-accent-purple"
                          : "bg-white/5 text-slate-500 group-hover:text-slate-400"
                      }`}
                    >
                      {icons[index]}
                    </div>
                  </div>

                  {/* Question */}
                  <h3
                    className={`relative mb-2 text-base font-semibold leading-tight transition-colors duration-300 sm:mb-3 sm:text-xl ${
                      isOpen ? "text-white" : "text-slate-200"
                    }`}
                  >
                    {item.question}
                  </h3>

                  {/* Answer with animated reveal */}
                  <div
                    className={`relative overflow-hidden transition-all duration-500 ease-out ${
                      isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-base leading-relaxed text-slate-400">
                        {item.answer}
                      </p>
                    </div>
                  </div>

                  {/* Expand indicator */}
                  <div
                    className={`mt-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider transition-all duration-300 ${
                      isOpen
                        ? "text-accent-purple"
                        : "text-slate-500 group-hover:text-slate-400"
                    }`}
                  >
                    <span>{isOpen ? "Less" : "More"}</span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>

                  {/* Subtle grid pattern overlay */}
                  <div
                    className={`pointer-events-none absolute inset-0 opacity-[0.03] transition-opacity duration-500 ${
                      isOpen ? "opacity-[0.05]" : ""
                    }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Demo CTA */}
        <div
          id="faq-demo"
          className="mx-auto mt-8 max-w-2xl rounded-2xl border border-accent-purple/30 bg-gradient-to-br from-[#151B37] via-[#12162C] to-[#0F1328] p-5 text-center shadow-[0_20px_60px_rgba(124,92,255,0.15)] sm:mt-16 sm:rounded-3xl sm:p-8"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 sm:mb-4 sm:px-4 sm:py-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-300 sm:text-xs sm:tracking-[0.2em]">
              Live Demo Available
            </span>
          </div>
          <h3 className="text-xl font-semibold text-white sm:text-2xl md:text-3xl">
            Need a walkthrough?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400 sm:mt-3 sm:text-base">
            See Thodemy in action with a focused demo tailored to your training
            workflow.
          </p>
          <a
            href="https://youtu.be/Aq5WXmQQooo?si=sCEVz5fvDMDnu6zj"
            target="_blank"
            rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple to-white px-5 py-3 text-sm font-bold uppercase tracking-[0.15em] text-ink-900 shadow-[0_12px_30px_rgba(124,92,255,0.35)] transition-all duration-200 hover:scale-[1.02] hover:brightness-105 sm:mt-6 sm:w-auto sm:px-6 sm:py-3.5"
            >
              <span>Watch the Demo</span>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div id="home" className="min-h-screen bg-[#0B0D14] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B0D14]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:max-w-7xl lg:px-16 xl:px-24">
          <div className="flex shrink-0 items-center">
            <img
              src={logoThodemy}
              alt="Thodemy"
              className="h-8 w-auto origin-left scale-[2.3] sm:h-9 sm:scale-[2.4] md:h-9 md:scale-[2.0] lg:h-10 lg:scale-[2.1] xl:h-11 xl:scale-[2.4]"
            />
          </div>

          {/* Desktop & Tablet Landscape Navigation */}
          <nav className="hidden flex-1 items-center justify-start gap-4 pl-10 md:flex md:pl-12 lg:justify-center lg:gap-6 lg:pl-0 xl:gap-7">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.1em] text-slate-400 transition-all duration-200 hover:text-white lg:text-xs lg:tracking-[0.15em]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="/auth/login"
              className="hidden rounded-lg bg-gradient-to-r from-accent-purple to-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-900 shadow-[0_8px_20px_rgba(124,92,255,0.3)] transition-all duration-200 hover:scale-[1.02] hover:brightness-105 md:inline-flex lg:rounded-xl lg:px-5 lg:py-2.5 lg:text-xs lg:tracking-[0.15em] lg:shadow-[0_12px_30px_rgba(124,92,255,0.35)]"
            >
              Log In
            </a>

            {/* Mobile Menu Button - Hidden on md and above */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg bg-white/5 transition-colors hover:bg-white/10 md:hidden"
              aria-label="Toggle menu"
            >
              <span
                className={`h-0.5 w-5 rounded-full bg-white transition-all duration-300 ${
                  mobileMenuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-white transition-all duration-300 ${
                  mobileMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-white transition-all duration-300 ${
                  mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown - Only visible on mobile (below md breakpoint) */}
        <div
          className={`absolute left-0 right-0 top-full overflow-hidden border-b border-white/5 bg-gradient-to-br from-[#14182C] via-[#0B0D14] to-[#0B0D14] backdrop-blur-xl transition-all duration-300 md:hidden ${
            mobileMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-accent-purple/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-10 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <nav className="relative flex flex-col px-4 py-4 sm:px-6">
            {navItems.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="border-b border-white/5 py-3 text-sm font-medium uppercase tracking-[0.15em] text-slate-300 transition-colors duration-200 hover:text-white"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {item.label}
              </a>
            ))}
            <a
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-4 inline-flex justify-center rounded-xl bg-gradient-to-r from-accent-purple to-white px-5 py-3 text-sm font-bold uppercase tracking-[0.15em] text-ink-900 shadow-[0_12px_30px_rgba(124,92,255,0.35)] transition-all duration-200 hover:brightness-105"
            >
              Log In
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#1A1431] via-[#0B0D14] to-[#0B0D14]">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-accent-purple/10 blur-[100px]" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[300px] w-[300px] rounded-full bg-accent-purple/5 blur-[80px]" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:gap-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:flex-row lg:items-center lg:px-24">
          <div className="flex-1 space-y-6 text-center sm:space-y-8 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-purple/30 bg-accent-purple/10 px-3 py-1.5 sm:px-4 sm:py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent-purple" />
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-accent-purple sm:text-xs sm:tracking-[0.2em]">
                Internal LMS for Regularization
              </span>
            </div>

            <h1 className="font-display text-3xl font-semibold leading-[1.15] text-white sm:text-4xl md:text-5xl lg:text-6xl">
              Track Your
              <br />
              Training Journey
              <br />
              <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
                With Confidence
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg lg:mx-0">
              Thodemy tracks bootcamps, verifies milestones, and centralizes
              evaluations so onboarding decisions are clear, consistent, and
              defensible.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4 lg:justify-start">
              <a
                href="https://youtu.be/Aq5WXmQQooo?si=sCEVz5fvDMDnu6zj"
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-xl bg-gradient-to-r from-accent-purple to-white px-6 py-3 text-sm font-bold uppercase tracking-[0.15em] text-ink-900 shadow-[0_12px_30px_rgba(124,92,255,0.35)] transition-all duration-200 hover:scale-[1.02] hover:brightness-105 sm:w-auto sm:py-3.5"
              >
                Watch a Demo
              </a>
              <a
                href="#core-features"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-[0.15em] text-slate-200 transition-all duration-200 hover:bg-white/10 sm:w-auto sm:py-3.5"
              >
                View Core Features
              </a>
            </div>

            <p className="text-sm text-slate-400 sm:text-base">
              Built for trainers, admins, HR, and management teams that need
              clean, auditable progress data.
            </p>
          </div>

          {/* Orbit Section - Hidden on small mobile, scaled on tablet */}
          <div className="mt-8 flex flex-1 items-center justify-center lg:mt-0">
            <div className="relative h-[280px] w-[280px] sm:h-[360px] sm:w-[360px] lg:h-[460px] lg:w-[460px]">
              <div className="absolute inset-0 rounded-full border border-white/12" />
              <div className="absolute inset-[10px] rounded-full border border-white/20 sm:inset-4 lg:inset-6" />
              <div className="absolute inset-[30px] rounded-full border border-white/20 sm:inset-[40px] lg:inset-[52px]" />
              <div className="absolute inset-[55px] rounded-full border border-white/20 sm:inset-[70px] lg:inset-[92px]" />
              <div className="absolute inset-[80px] rounded-full border border-white/25 bg-white/[0.04] sm:inset-[100px] lg:inset-[132px]" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
                    30+
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
                    Trainees
                  </p>
                </div>
              </div>

              {orbitAvatars.map((avatar) => {
                // Scale orbit sizes for mobile
                const baseSize = parseInt(avatar.size);
                const mobileSize = Math.round(baseSize * 0.61);
                const tabletSize = Math.round(baseSize * 0.78);
                return (
                  <div
                    key={avatar.alt}
                    className="orbit"
                    style={{
                      "--orbit-size": avatar.size,
                      "--orbit-size-mobile": `${mobileSize}px`,
                      "--orbit-size-tablet": `${tabletSize}px`,
                      "--orbit-duration": "26s",
                      "--orbit-delay": avatar.delay,
                      "--orbit-direction": "normal",
                      "--orbit-counter": "reverse",
                      "--orbit-item-size": "40px",
                      "--orbit-item-size-sm": "52px",
                      "--orbit-item-size-lg": "64px",
                      "--orbit-inset": "14px",
                    }}
                  >
                    <div className="orbit-item">
                      <img
                        src={avatar.src}
                        alt={avatar.alt}
                        className="orbit-avatar h-full w-full object-cover object-center shadow-[0_10px_24px_rgba(0,0,0,0.45)] ring-2 ring-white/40"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:gap-4 sm:px-6 sm:py-8 lg:max-w-7xl lg:px-24">
            <p className="text-center text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500 sm:text-xs sm:tracking-[0.2em]">
              Top Projects & Recent Activity
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-300 sm:gap-x-10 sm:gap-y-4 sm:text-base sm:tracking-[0.12em]">
              {[
                "UDEMY",
                "PORTFOLIO",
                "KAPE KALAKAL",
                "POKEMON",
                "AUXILIUM",
              ].map((name) => (
                <span
                  key={name}
                  className="select-none"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative overflow-hidden bg-[#0F1120]"
      >
        {/* Decorative element */}
        <div className="pointer-events-none absolute right-0 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-accent-purple/5 blur-[100px]" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:gap-8 sm:px-6 sm:py-20 lg:max-w-7xl lg:px-24">
          <div className="space-y-3 text-center sm:space-y-4 sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">
              Why Thodemy
            </p>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
              Standardize training decisions{" "}
              <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
                without spreadsheets.
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-300 sm:mx-0 sm:text-lg">
              Replace manual tracking with a structured path, verified
              activities, and consistent evaluations for fair regularization.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="group rounded-2xl border border-white/10 bg-[#121528] p-4 transition-all duration-300 hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] sm:p-6">
              <div className="mb-2 flex items-center gap-2 sm:mb-0 sm:block">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 sm:hidden">
                  <svg
                    className="h-4 w-4 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white sm:text-base">
                  The problem
                </p>
              </div>
              <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-300 sm:mt-3 sm:text-lg">
                {
                  "Progress lives in spreadsheets.\nEvaluations vary by trainer.\nNo audit trail for regularization."
                }
              </p>
            </div>
            <div className="group rounded-2xl border border-white/10 bg-[#121528] p-4 transition-all duration-300 hover:border-accent-purple/30 hover:shadow-[0_0_30px_rgba(124,92,255,0.1)] sm:p-6">
              <div className="mb-2 flex items-center gap-2 sm:mb-0 sm:block">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/10 sm:hidden">
                  <svg
                    className="h-4 w-4 text-accent-purple"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white sm:text-base">
                  The Thodemy approach
                </p>
              </div>
              <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-300 sm:mt-3 sm:text-lg">
                <strong>Learning Path → Course → Topic structure.</strong>
                {
                  "\nTrainer verification at every milestone.\nAudit-ready records with soft delete."
                }
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:text-left sm:text-xs sm:tracking-[0.2em]">
              How It Works
            </p>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="group relative rounded-2xl border border-white/10 bg-[#101326] p-4 transition-all duration-300 hover:border-accent-purple/30 hover:shadow-[0_0_30px_rgba(124,92,255,0.1)] sm:p-5"
                >
                  <div className="mb-2 inline-block rounded-lg bg-gradient-to-r from-accent-purple/20 to-accent-purple/10 px-2.5 py-1 sm:mb-3 sm:px-3 sm:py-1.5">
                    <span className="text-lg font-bold text-accent-purple sm:text-xl">
                      {step.number}
                    </span>
                  </div>
                  <p className="text-sm font-bold uppercase tracking-wide text-white sm:text-base">
                    {step.title}
                  </p>
                  <p className="mt-1.5 text-base leading-relaxed text-slate-300 sm:mt-2 sm:text-lg">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="core-features"
        className="relative overflow-hidden bg-[#0B0D14]"
      >
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -left-40 top-1/4 h-[400px] w-[400px] rounded-full bg-accent-purple/5 blur-[120px]" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-14 sm:gap-14 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-24">
          <div className="space-y-4 text-center sm:space-y-5 sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-purple sm:text-sm">
              Core Features
            </p>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl">
              Everything needed to verify readiness,{" "}
              <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
                end to end.
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-300 sm:mx-0 sm:text-lg lg:text-xl">
              Thodemy combines structured learning paths with verification
              workflows so regularization decisions are based on evidence, not
              guesswork.
            </p>
          </div>

          <div className="space-y-12 sm:space-y-20">
            {featureRows.map((feature, index) => (
              <div
                key={feature.title}
                className={`group flex flex-col gap-6 sm:gap-10 ${feature.reverse ? "lg:flex-row-reverse" : "lg:flex-row"} lg:items-center`}
              >
                <div className="flex-1 space-y-4 text-center sm:space-y-5 sm:text-left">
                  {/* Large number badge */}
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-accent-purple/30 bg-gradient-to-br from-accent-purple/20 to-accent-purple/5 shadow-[0_0_20px_rgba(124,92,255,0.2)] sm:h-16 sm:w-16">
                    <span className="text-2xl font-bold text-accent-purple sm:text-3xl">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white sm:text-2xl lg:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
                    {feature.description}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="overflow-hidden rounded-2xl border-2 border-white/20 bg-[#0B0D14] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500 group-hover:border-accent-purple/40 group-hover:shadow-[0_12px_48px_rgba(124,92,255,0.2)] sm:rounded-3xl sm:p-2">
                    <img
                      src={feature.image}
                      alt={feature.imageAlt}
                      className="h-auto w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.01] sm:rounded-2xl"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0F1120]">
        <div className="pointer-events-none absolute -right-20 bottom-0 h-[300px] w-[300px] rounded-full bg-accent-purple/5 blur-[100px]" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:gap-10 sm:px-6 sm:py-20 lg:max-w-7xl lg:px-24">
          <div className="space-y-3 text-center sm:space-y-4 sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">
              More Capabilities
            </p>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
              Operational details that keep{" "}
              <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
                training compliant.
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-300 sm:mx-0 sm:text-lg">
              Everything required for data privacy, audit readiness, and clear
              access boundaries across roles.
            </p>
          </div>

          <div className="grid gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {capabilityCards.map((card, index) => {
              const icons = [
                <svg
                  key="shield"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>,
                <svg
                  key="archive"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                  />
                </svg>,
                <svg
                  key="users"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>,
                <svg
                  key="clipboard"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                  />
                </svg>,
                <svg
                  key="chart"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>,
                <svg
                  key="document"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>,
              ];
              return (
                <div
                  key={card.title}
                  className="group rounded-2xl border border-white/10 bg-[#121528] p-4 transition-all duration-300 hover:border-accent-purple/30 hover:shadow-[0_0_30px_rgba(124,92,255,0.1)] sm:p-5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10 text-accent-purple transition-all duration-300 group-hover:bg-accent-purple/20">
                    {icons[index]}
                  </div>
                  <h3 className="text-sm font-semibold text-white sm:text-base">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-base leading-relaxed text-slate-300 sm:mt-2 sm:text-lg">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="governance"
        className="relative overflow-hidden bg-[#0B0D14]"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-accent-purple/5 blur-[120px]" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:gap-10 sm:px-6 sm:py-20 lg:max-w-7xl lg:px-24">
          <div className="space-y-3 text-center sm:space-y-4 sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">
              Governance & Trust
            </p>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
              Governance that stands up{" "}
              <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
                to audits.
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-300 sm:mx-0 sm:text-lg">
              Privacy-aware controls, traceable actions, and clear permissions
              are built into every workflow.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="group rounded-2xl border border-white/10 bg-[#12162A] p-4 transition-all duration-300 hover:border-accent-purple/30 sm:p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Built-in compliance
              </h3>
              <p className="mt-1.5 text-sm text-slate-300 sm:mt-2 sm:text-base">
                Designed for internal policy and HR oversight.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300 sm:mt-4 sm:text-base">
                {[
                  "Role-based access control",
                  "Soft deletion with recovery",
                  "Audit logs for critical actions",
                  "Data retained for review",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="group flex flex-col justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#151B37] to-[#111423] p-4 transition-all duration-300 hover:border-accent-purple/30 sm:p-6">
              <svg
                className="mb-3 h-8 w-8 text-accent-purple/60"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-xl font-semibold leading-snug text-slate-100 sm:text-2xl">
                A single source of truth for training readiness.
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-400 sm:mt-4 sm:text-base">
                — Training Lead
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="testimonials"
        className="relative overflow-hidden bg-[#0F1120]"
      >
        <div className="pointer-events-none absolute -right-40 top-1/4 h-[400px] w-[400px] rounded-full bg-accent-purple/5 blur-[100px]" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:gap-10 sm:px-6 sm:py-20 lg:max-w-7xl lg:px-24">
          <div className="space-y-3 text-center sm:space-y-4 sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">
              Testimonials
            </p>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
              What trainees, trainers, and HR say{" "}
              <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
                about Thodemy.
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-300 sm:mx-0 sm:text-lg">
              Five perspectives across onboarding, verification, and
              regularization.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {testimonials.map((item, index) => (
              <div
                key={item.role}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#121528] p-4 transition-all duration-300 hover:border-accent-purple/30 hover:shadow-[0_0_30px_rgba(124,92,255,0.1)] sm:p-6 ${
                  index === testimonials.length - 1 ? "lg:col-span-2" : ""
                }`}
              >
                <div className="relative">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-purple/20 bg-accent-purple/5 px-3 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent-purple sm:text-xs sm:tracking-[0.2em]">
                      {item.role}
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-slate-200 sm:text-lg">
                    "{item.quote}"
                  </p>
                  <p className="mt-3 text-sm font-semibold text-slate-400 sm:mt-4">
                    — {item.attribution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection />

      <section className="relative overflow-hidden bg-[#0B0D18]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,92,255,0.18),_transparent_55%)]" />
        <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-accent-purple/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-[140px]" />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20 lg:max-w-7xl lg:px-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151A36] via-[#0F1326] to-[#0B0E1A] px-6 py-10 sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-accent-purple/25 blur-[110px]" />
            <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-white/5 blur-[120px]" />

            <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div className="space-y-5 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
                  Launch in days, not months
                </div>
                <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
                  Try Thodemy now before the next{" "}
                  <span className="bg-gradient-to-r from-accent-purple to-white bg-clip-text text-transparent">
                    regularization cycle.
                  </span>
                </h2>
                <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-300 sm:mx-0 sm:text-lg">
                  Align training, verification, and audit records early so
                  decisions stay clear and defensible.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                  <a
                    href="/auth/login"
                    className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-accent-purple to-white px-6 py-3 text-sm font-bold uppercase tracking-[0.15em] text-ink-900 shadow-[0_12px_30px_rgba(124,92,255,0.35)] transition-all duration-200 hover:scale-[1.02] hover:brightness-105 sm:w-fit sm:px-8 sm:py-4"
                  >
                    Try It Now
                  </a>
                  <a
                    href="#how-it-works"
                    className="inline-flex w-full justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition-colors duration-200 hover:border-white/30 hover:text-white sm:w-fit sm:px-8 sm:py-4"
                  >
                    See the Flow
                  </a>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:justify-start sm:text-xs">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Privacy-first
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Audit-ready
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Trainer verified
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0B0E1D]/80 p-5 backdrop-blur sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Launch checklist
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    Week 1
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    "Import training matrix",
                    "Assign learning paths",
                    "Verify milestone completion",
                    "Ready for evaluation",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <p className="text-sm text-slate-200">{item}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-accent-purple/20 bg-gradient-to-r from-accent-purple/15 to-transparent px-4 py-3">
                  <p className="text-sm text-slate-200">
                    <span className="font-semibold text-white">
                      Audit-ready
                    </span>{" "}
                    records auto-logged with soft delete.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-xs uppercase tracking-[0.2em] text-slate-500 sm:text-sm">
            Quick setup for internal teams. Privacy-first and audit-ready.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#0B0D14]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center sm:gap-6 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-24">
          <img
            src={logoThodemy}
            alt="Thodemy"
            className="h-6 w-auto origin-center scale-[3] opacity-80 sm:h-7 sm:scale-[3.2] md:h-7 md:scale-[3.5] lg:h-8 lg:scale-[3.8] xl:scale-[4.2]"
          />
          <p className="max-w-md text-base text-slate-300 sm:text-lg">
            Internal LMS for onboarding and employee regularization.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-300 sm:gap-6 sm:text-base">
            <a href="#home" className="transition-colors hover:text-white">
              Home
            </a>
            <a
              href="#core-features"
              className="transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="transition-colors hover:text-white"
            >
              Testimonials
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              FAQ
            </a>
          </div>
          <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <p className="text-xs text-slate-400 sm:text-sm">
            © 2026 Thodemy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
