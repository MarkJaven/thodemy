const DeactivatedPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-red-400"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Deactivated</h1>
            <p className="text-slate-400">
              Your account has been deactivated. Please coordinate with your trainer to reactivate your account.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/auth'}
              className="w-full btn-secondary"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeactivatedPage;