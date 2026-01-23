import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileService } from "../services/profileService";

/**
 * Display the authenticated dashboard.
 * @returns {JSX.Element}
 */
const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const pendingEmail = location.state?.pendingEmail;
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    /**
     * Fetch the latest profile details for the current user.
     * @returns {Promise<void>}
     */
    const loadProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }
      setProfileLoading(true);
      setProfileError(null);
      try {
        const data = await profileService.getMe();
        setProfile(data?.profile ?? null);
      } catch (error) {
        setProfileError(error.message);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user]);

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
              {profileLoading && (
                <p className="mt-2 text-xs text-slate-400">Loading your profile...</p>
              )}
              {profileError && (
                <p className="mt-2 text-xs text-rose-300">{profileError}</p>
              )}
              {profile && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                  <p className="font-semibold text-white">Profile</p>
                  <p className="mt-2">Name: {profile.first_name} {profile.last_name}</p>
                  <p>Email: {profile.email}</p>
                </div>
              )}
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
