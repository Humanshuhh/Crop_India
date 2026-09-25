import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Lock, Phone, User as UserIcon, MapPin, Map, RotateCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ErrorMessage } from '../components/common/ErrorMessage';

export const Signup: React.FC = () => {
  const { signUpWithPhone, error, clearAuthError } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [clientError, setClientError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Post-signup redirect pattern per Addendum §3
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setClientError(null);

    if (!/^\d{4}$/.test(mpin)) {
      setClientError('MPIN must be exactly 4 digits.');
      return;
    }

    if (mpin !== confirmMpin) {
      setClientError('MPINs do not match.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithPhone({
        name,
        phone,
        state: stateName,
        district,
        mpin,
        language
      });
      navigate(from, { replace: true });
    } catch {
      // Error is set in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-100 text-emerald-800">
            <Sprout className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Create {t('appTitle')} Account
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Register your farmer profile for verified digital agriculture.
          </p>
        </div>

        {/* Auth or Client Error */}
        {(clientError || error) && <ErrorMessage error={clientError || error} />}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-name" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-12 pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="Ramesh Kumar"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-phone" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-12 pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="10-digit phone number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="signup-state" className="block text-xs font-semibold text-stone-700 mb-1.5">
                State
              </label>
              <div className="relative">
                <Map className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-state"
                  type="text"
                  required
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full min-h-12 pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Maharashtra"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-district" className="block text-xs font-semibold text-stone-700 mb-1.5">
                District
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-district"
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full min-h-12 pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Pune"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="signup-mpin" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Create 4-Digit MPIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-mpin"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                required
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                className="w-full min-h-12 pl-10 pr-12 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                title={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="signup-confirm-mpin" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Confirm 4-Digit MPIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-confirm-mpin"
                type={showConfirmPassword ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                required
                value={confirmMpin}
                onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
                className="w-full min-h-12 pl-10 pr-12 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                title={showConfirmPassword ? t('hidePassword') : t('showPassword')}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 mt-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Creating profile...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-stone-100 text-center text-xs text-stone-600">
          Already have an account?{' '}
          <Link
            to="/login"
            state={{ from: { pathname: from } }}
            className="font-semibold text-emerald-800 hover:underline"
          >
            {t('navLogin')} here
          </Link>
        </div>
      </div>
    </div>
  );
};
