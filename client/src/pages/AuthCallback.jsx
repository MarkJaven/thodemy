import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { superAdminService } from "../services/superAdminService";

/**
 * Finalize OAuth flows and redirect to the dashboard.
 * @returns {JSX.Element}
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    /**
     * Exchange the redirect code for a session and navigate away.
     * @returns {Promise<void>}
     */
    const finishAuth = async () => {
      try {
        await authService.exchangeCodeForSession(window.location.href);
        const session = await authService.getSession();
        const role = await superAdminService.getCurrentRole(session?.user?.id);
        if (role === "superadmin") {
          navigate("/super-admin", { replace: true });
        } else if (role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (exchangeError) {
        setError(exchangeError.message);
      }
    };

    finishAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-6">
        <div className="w-full rounded-2xl border border-white/10 bg-ink-800/60 p-8 text-center">
          <h1 className="font-display text-2xl">Finishing sign-in</h1>
          <p className="mt-2 text-sm text-slate-400">
            {error
              ? "We could not complete the sign-in. Please try again."
              : "Hang tight while we secure your session."}
          </p>
          {error && <p className="mt-4 text-xs text-rose-300">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
