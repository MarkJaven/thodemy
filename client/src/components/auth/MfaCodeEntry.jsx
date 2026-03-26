import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Mask an email address for display (e.g., j***@company.com).
 * @param {string} email
 * @returns {string}
 */
const maskEmail = (email) => {
  if (!email) return "your email";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length <= 2 ? local : local.slice(0, 2);
  return `${visible}***@${domain}`;
};

/**
 * MFA 6-digit code entry component.
 * Renders inside the AuthPage right panel when MFA verification is required.
 *
 * @param {{
 *   onSubmit: (code: string) => void,
 *   onResend: () => void,
 *   onCancel: () => void,
 *   error: string|null,
 *   isLoading: boolean,
 *   resendCooldown: number,
 *   expiresAt: number|null,
 *   userEmail: string
 * }} props
 */
const MfaCodeEntry = ({
  onSubmit,
  onResend,
  onCancel,
  error,
  isLoading,
  resendCooldown,
  expiresAt,
  userEmail,
  lockedUntil,
}) => {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) { setLockCountdown(0); return; }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockCountdown > 0;

  // Countdown timer for code expiry
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Clear digits when error changes (new attempt)
  useEffect(() => {
    if (error) {
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }, [error]);

  const handleChange = useCallback(
    (index, value) => {
      // Only allow single digit
      const digit = value.replace(/\D/g, "").slice(-1);
      setDigits((prev) => {
        const next = [...prev];
        next[index] = digit;

        // Auto-submit when all 6 filled
        if (digit && index === 5 && next.every((d) => d !== "")) {
          setTimeout(() => onSubmit(next.join("")), 50);
        }
        return next;
      });

      // Auto-focus next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [onSubmit]
  );

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;
      const newDigits = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      if (pasted.length === 6) {
        setTimeout(() => onSubmit(newDigits.join("")), 50);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    },
    [onSubmit]
  );

  const formatTime = (seconds) => {
    if (seconds === null) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length === 6) {
      onSubmit(code);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-ink-900/60 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:p-8">
      {/* Shield Icon */}
      <div className="flex justify-center mb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-purple/20">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-accent-purple"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-2 text-center">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          Verification required
        </h2>
        <p className="text-sm text-slate-300 sm:text-base">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-accent-purple">{maskEmail(userEmail)}</span>
        </p>
      </div>

      {/* Code Input */}
      <form onSubmit={handleFormSubmit} className="mt-7">
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={isLoading || isLocked}
              className="h-14 w-11 rounded-xl border border-white/10 bg-white/5 text-center text-2xl font-display font-semibold text-white transition-all duration-200 focus:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/20 disabled:opacity-50 sm:h-16 sm:w-12"
              autoComplete="one-time-code"
            />
          ))}
        </div>

        {/* Timer */}
        {timeLeft !== null && (
          <div className="mt-4 text-center">
            {timeLeft > 0 ? (
              <p className="text-xs text-slate-400">
                Code expires in{" "}
                <span className="font-medium text-slate-300">{formatTime(timeLeft)}</span>
              </p>
            ) : (
              <p className="text-xs text-amber-300">
                Code has expired.{" "}
                <button
                  type="button"
                  onClick={onResend}
                  className="underline transition-colors hover:text-white"
                >
                  Request a new one
                </button>
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert" aria-live="assertive">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mt-0.5 flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Verify Button */}
        <button
          type="submit"
          disabled={isLoading || isLocked || digits.some((d) => d === "")}
          className="mt-5 group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet py-3.5 text-base font-semibold text-white shadow-purple-glow transition-all duration-200 hover:shadow-purple-glow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <span>Verify code</span>
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

      {/* Resend & Cancel */}
      <div className="mt-5 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || isLoading || isLocked}
          className="text-sm text-accent-purple transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-slate-500"
        >
          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="text-xs text-slate-400 transition-colors hover:text-white"
        >
          Use a different account
        </button>
      </div>

      {/* Lockout Modal */}
      {isLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] sm:p-8">
            {/* Lock icon */}
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose-400">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
              </div>
            </div>

            <h3 className="text-center font-display text-xl font-semibold text-white">
              Too many attempts
            </h3>
            <p className="mt-2 text-center text-sm text-slate-400">
              You've used all 5 attempts. Please try again after the countdown.
            </p>

            {/* Countdown */}
            <div className="mt-5 flex justify-center">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-purple">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="font-display text-2xl font-semibold text-white">
                  {Math.floor(lockCountdown / 60)}:{(lockCountdown % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              A new code will be sent once the timer ends.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MfaCodeEntry;
