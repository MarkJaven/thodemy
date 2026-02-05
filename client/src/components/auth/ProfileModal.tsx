import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  gender: string;
  birthday: string;
  address: string;
  company_id_no: string;
  email: string;
  onboarding_date: string;
  target_regularization_date: string;
  training_starting_date: string;
  profile_setup_completed: boolean;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    gender: '',
    birthday: '',
    address: '',
    company_id_no: '',
    email: '',
    onboarding_date: '',
    target_regularization_date: '',
    training_starting_date: '',
    profile_setup_completed: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchProfile = async () => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        gender: data.gender || '',
        birthday: data.birthday || '',
        address: data.address || '',
        company_id_no: data.company_id_no || '',
        email: data.email || '',
        onboarding_date: data.onboarding_date || '',
        target_regularization_date: data.target_regularization_date || '',
        training_starting_date: data.training_starting_date || '',
        profile_setup_completed: data.profile_setup_completed || false,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          gender: profile.gender,
          birthday: profile.birthday,
          address: profile.address,
          company_id_no: profile.company_id_no,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      setIsEditMode(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const displayName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(' ') || 'Learner';
  const initials = displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const inputClass =
    'w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-purple focus:border-transparent transition-all duration-200';
  const readOnlyClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white';
  const mutedReadOnlyClass =
    'w-full rounded-xl border border-slate-600/30 bg-slate-700/30 px-4 py-3 text-slate-400 cursor-not-allowed';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl my-8 max-h-[90vh]">
        <div className="rounded-3xl border border-white/10 bg-ink-800/95 shadow-glow overflow-hidden">
          <div className="px-8 pb-8 pt-6 overflow-y-auto max-h-[calc(90vh-4rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-slate-300">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading profile...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-purple/20 text-sm font-semibold uppercase text-accent-purple">
                      {initials}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">{displayName}</h2>
                      <p className="text-sm text-slate-400">
                        {isEditMode ? 'Update your details' : 'Profile overview'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isEditMode ? (
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet text-white font-semibold rounded-xl shadow-purple-glow hover:shadow-purple-glow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Saving...
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditMode) {
                          setIsEditMode(false);
                        } else {
                          onClose();
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 border border-white/20 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 transition-all duration-200"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      {isEditMode ? 'Cancel' : 'Close'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">First Name</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={profile.first_name}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <div className={readOnlyClass}>{profile.first_name || 'Not set'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Last Name</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={profile.last_name}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <div className={readOnlyClass}>{profile.last_name || 'Not set'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Gender</label>
                      {isEditMode ? (
                        <select
                          value={profile.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className={inputClass}
                        >
                          <option value="" className="bg-ink-700">Select Gender</option>
                          <option value="male" className="bg-ink-700">Male</option>
                          <option value="female" className="bg-ink-700">Female</option>
                          <option value="other" className="bg-ink-700">Other</option>
                          <option value="prefer-not-to-say" className="bg-ink-700">Prefer not to say</option>
                        </select>
                      ) : (
                        <div className={`${readOnlyClass} capitalize`}>{profile.gender || 'Not set'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Birthday</label>
                      {isEditMode ? (
                        <input
                          type="date"
                          value={profile.birthday}
                          onChange={(e) => handleInputChange('birthday', e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <div className={readOnlyClass}>
                          {profile.birthday ? formatDate(profile.birthday) : 'Not set'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Email</label>
                      <div className={`${mutedReadOnlyClass} text-sm`}>{profile.email || 'Not set'}</div>
                      <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Company ID</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={profile.company_id_no}
                          onChange={(e) => handleInputChange('company_id_no', e.target.value)}
                          className={inputClass}
                        />
                      ) : (
                        <div className={readOnlyClass}>{profile.company_id_no || 'Not set'}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Address</label>
                    {isEditMode ? (
                      <textarea
                        value={profile.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                    ) : (
                      <div className={`${readOnlyClass} whitespace-pre-wrap`}>
                        {profile.address || 'Not set'}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Training</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">Onboarding</p>
                        <div className={`${mutedReadOnlyClass} mt-2`}>
                          {profile.onboarding_date ? formatDate(profile.onboarding_date) : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Training Start</p>
                        <div className={`${mutedReadOnlyClass} mt-2`}>
                          {profile.training_starting_date ? formatDate(profile.training_starting_date) : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Regularization</p>
                        <div className={`${mutedReadOnlyClass} mt-2`}>
                          {profile.target_regularization_date ? formatDate(profile.target_regularization_date) : 'Not set'}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Training information is managed by your administrator.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
                    <p className="text-green-400 text-sm">Profile updated successfully!</p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
