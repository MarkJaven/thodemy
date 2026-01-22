import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const pendingEmail = location.state?.pendingEmail;

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-6">
          <p className="text-sm text-slate-400">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <div className="w-full rounded-2xl border border-white/10 bg-ink-800/60 p-8">
          <h1 className="font-display text-2xl">Dashboard</h1>
          {pendingEmail && (
            <p className="mt-3 text-sm text-amber-200">
              Check your email to confirm your account, then refresh this page.
            </p>
          )}
          {user ? (
            <>
              <p className="mt-4 text-sm text-slate-300">Signed in as {user.email}</p>
              <button
                type="button"
                onClick={signOut}
                className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-300">
                You are not signed in. Please return to the login page.
              </p>
              <Link
                to="/auth/login"
                className="mt-6 inline-flex rounded-xl bg-indigo-500 px-4 py-2 text-sm text-white"
              >
                Go to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
