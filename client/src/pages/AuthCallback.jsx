import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const finishAuth = async () => {
      if (!supabase) {
        setError("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      navigate("/dashboard", { replace: true });
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
          {error && (
            <p className="mt-4 text-xs text-rose-300">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
