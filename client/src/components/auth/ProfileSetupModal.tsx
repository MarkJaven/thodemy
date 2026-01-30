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
  const [step, setStep] = useState(0);
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

  const steps = [
    { title: 'Welcome', subtitle: 'Let\'s get you set up' },
    { title: 'Personal Details', subtitle: 'Tell us about yourself' },
    { title: 'Professional Info', subtitle: 'Your work details' },
    { title: 'Onboarding', subtitle: 'Your start date' },
    { title: 'All Set!', subtitle: 'You\'re ready to begin' }
  ];

  const handleWelcomeNext = () => {
    setStep(1);
  };

  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.gender || !personalInfo.birthday) {
      setError('Please fill in all required fields');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleProfessionalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalInfo.address || !personalInfo.companyIdNo) {
      setError('Please fill in all required fields');
      return;
    }
    setError(null);
    setStep(3);
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

      setStep(4);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%239C92AC' fill-opacity='0.1'%3e%3ccircle cx='30' cy='30' r='2'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`
        }} />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((stepInfo, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  index <= step
                    ? 'bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet text-white shadow-purple-glow'
                    : 'bg-white/10 text-slate-400 border border-white/20'
                }`}>
                  {index === 4 ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 transition-all duration-300 ${
                    index < step ? 'bg-gradient-to-r from-accent-purple to-accent-violet' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-1">{steps[step].title}</h1>
            <p className="text-slate-300">{steps[step].subtitle}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-glow overflow-hidden">
          <div className="p-8">

            {/* Welcome Step */}
            {step === 0 && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet rounded-full flex items-center justify-center shadow-purple-glow mb-4">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">Welcome to Thodemy</h2>
                  <p className="text-lg text-slate-300 leading-relaxed">
                    Let's personalize your learning experience. We'll need some information to get you started on your training journey.
                  </p>
                </div>
                <button
                  onClick={handleWelcomeNext}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet text-white font-semibold rounded-full shadow-purple-glow hover:shadow-purple-glow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Get Started
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            )}

            {/* Personal Details Step */}
            {step === 1 && (
              <form onSubmit={handlePersonalInfoSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">First Name *</label>
                    <input
                      type="text"
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200"
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Last Name *</label>
                    <input
                      type="text"
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200"
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Gender *</label>
                    <select
                      value={personalInfo.gender}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200"
                      required
                    >
                      <option value="" className="bg-slate-800">Select Gender</option>
                      <option value="male" className="bg-slate-800">Male</option>
                      <option value="female" className="bg-slate-800">Female</option>
                      <option value="other" className="bg-slate-800">Other</option>
                      <option value="prefer-not-to-say" className="bg-slate-800">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-white">Birthday *</label>
                    <input
                      type="date"
                      value={personalInfo.birthday}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, birthday: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet text-white font-semibold rounded-xl shadow-purple-glow hover:shadow-purple-glow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}

            {/* Professional Info Step */}
            {step === 2 && (
              <form onSubmit={handleProfessionalInfoSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">Address *</label>
                  <textarea
                    value={personalInfo.address}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200 resize-none"
                    rows={3}
                    placeholder="Enter your full address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">Company ID Number *</label>
                  <input
                    type="text"
                    value={personalInfo.companyIdNo}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, companyIdNo: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200"
                    placeholder="Enter your company ID"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet text-white font-semibold rounded-xl shadow-purple-glow hover:shadow-purple-glow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}

            {/* Onboarding Step */}
            {step === 3 && (
              <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet rounded-full flex items-center justify-center shadow-purple-glow mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">When do you start?</h3>
                  <p className="text-slate-300">Select your onboarding date to calculate your training schedule</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white">Onboarding Date *</label>
                  <input
                    type="date"
                    value={onboardingInfo.onboardingDate}
                    onChange={(e) => setOnboardingInfo({ ...onboardingInfo, onboardingDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>

                {onboardingInfo.onboardingDate && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-3">
                    <h4 className="text-white font-semibold">Your Training Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Training Starts:</span>
                        <span className="text-white font-medium">
                          {addBusinessDays(new Date(onboardingInfo.onboardingDate), 2).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Target Regularization:</span>
                        <span className="text-white font-medium">
                          {(() => {
                            const targetDate = new Date(onboardingInfo.onboardingDate);
                            targetDate.setMonth(targetDate.getMonth() + 6);
                            return targetDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet text-white font-semibold rounded-xl shadow-purple-glow hover:shadow-purple-glow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Setting up...
                      </div>
                    ) : (
                      'Complete Setup'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Completion Step */}
            {step === 4 && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-status-success to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/25">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3">You're All Set!</h2>
                  <p className="text-lg text-slate-300 leading-relaxed">
                    Welcome to Thodemy! Your profile has been successfully set up. Get ready to start your learning journey.
                  </p>
                </div>
                <div className="animate-pulse">
                  <p className="text-purple-300 font-medium">Redirecting to your dashboard...</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupModal;