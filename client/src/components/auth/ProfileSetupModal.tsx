import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  gender: string;
  birthday: string;
  address: string;
  companyIdNo: string;
}

interface OnboardingInfo {
  onboardingDate: string;
}

const ProfileSetupModal = ({ isOpen, onComplete }: ProfileSetupModalProps) => {
  const [step, setStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    gender: '',
    birthday: '',
    address: '',
    companyIdNo: '',
  });
  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo>({
    onboardingDate: '',
  });
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHolidays();
    }
  }, [isOpen]);

  const fetchHolidays = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('date');
      if (error) throw error;
      setHolidays(data.map(h => new Date(h.date)));
    } catch (err) {
      console.error('Error fetching holidays:', err);
    }
  };

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6; // Sunday = 0, Saturday = 6
  };

  const isHoliday = (date: Date) => {
    return holidays.some(holiday =>
      holiday.toDateString() === date.toDateString()
    );
  };

  const addBusinessDays = (startDate: Date, days: number): Date => {
    let currentDate = new Date(startDate);
    let addedDays = 0;

    while (addedDays < days) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (!isWeekend(currentDate) && !isHoliday(currentDate)) {
        addedDays++;
      }
    }

    return currentDate;
  };

  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.gender || !personalInfo.birthday || !personalInfo.address || !personalInfo.companyIdNo) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingInfo.onboardingDate) {
      setError('Please select onboarding date');
      return;
    }

    setLoading(true);
    setError(null);

    if (!supabase) {
      setError('Supabase not initialized');
      setLoading(false);
      return;
    }

    try {
      const onboardingDate = new Date(onboardingInfo.onboardingDate);
      const targetRegularizationDate = new Date(onboardingDate);
      targetRegularizationDate.setMonth(targetRegularizationDate.getMonth() + 6);

      const trainingStartingDate = addBusinessDays(onboardingDate, 2);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: personalInfo.firstName,
          last_name: personalInfo.lastName,
          gender: personalInfo.gender,
          birthday: personalInfo.birthday,
          address: personalInfo.address,
          company_id_no: personalInfo.companyIdNo,
          onboarding_date: onboardingInfo.onboardingDate,
          target_regularization_date: targetRegularizationDate.toISOString().split('T')[0],
          training_starting_date: trainingStartingDate.toISOString().split('T')[0],
          profile_setup_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
        {step === 1 && (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Welcome Trainee</h2>
              <p className="mt-2 text-slate-300">Let's set up your profile</p>
            </div>
            <form onSubmit={handlePersonalInfoSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300">First Name</label>
                  <input
                    type="text"
                    value={personalInfo.firstName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Last Name</label>
                  <input
                    type="text"
                    value={personalInfo.lastName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Gender</label>
                <select
                  value={personalInfo.gender}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Birthday</label>
                <input
                  type="date"
                  value={personalInfo.birthday}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, birthday: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Address</label>
                <textarea
                  value={personalInfo.address}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Company ID No.</label>
                <input
                  type="text"
                  value={personalInfo.companyIdNo}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, companyIdNo: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                  required
                />
              </div>
              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
              >
                Next
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">Onboarding Details</h2>
              <p className="mt-2 text-slate-300">Enter your onboarding date</p>
            </div>
            <form onSubmit={handleOnboardingSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Onboarding Date</label>
                <input
                  type="date"
                  value={onboardingInfo.onboardingDate}
                  onChange={(e) => setOnboardingInfo({ ...onboardingInfo, onboardingDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white"
                  required
                />
              </div>
              {onboardingInfo.onboardingDate && (
                <div className="space-y-2 text-sm text-slate-300">
                  <p>Target Regularization Date: {(() => {
                    const targetDate = new Date(onboardingInfo.onboardingDate);
                    targetDate.setMonth(targetDate.getMonth() + 6);
                    return targetDate.toLocaleDateString();
                  })()}</p>
                  <p>Training Starting Date: {addBusinessDays(new Date(onboardingInfo.onboardingDate), 2).toLocaleDateString()}</p>
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.25em] text-white"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? 'Saving...' : 'Get Started'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileSetupModal;