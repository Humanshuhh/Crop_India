import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Phone, RotateCw, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ErrorMessage } from '../components/common/ErrorMessage';

export const Login: React.FC = () => {
  const { signInWithPhone, error, clearAuthError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [phone, setPhone] = useState('');
  const [mpin, setMpin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  // Post-login redirect pattern per Addendum §3
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setClientError(null);
    setShowForgotNotice(false);
    
    if (!/^\d{10}$/.test(phone)) {
      setClientError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!/^\d{4}$/.test(mpin)) {
      setClientError('MPIN must be exactly 4 digits.');
      return;
    }

    setLoading(true);

    try {
      await signInWithPhone(phone, mpin);
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
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="/images/kisan-sahayak-logo.png"
              alt={t('appTitle')}
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {t('navLogin')} to {t('appTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Sign in to access your farmer account and synced records.
          </p>
        </div>

        {/* Auth Error Banner */}
        {(clientError || error) && <ErrorMessage error={clientError || error} />}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-phone" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-phone"
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

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-stone-700 mb-1.5">
              4-Digit MPIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                required
                value={mpin}
                onChange={(e) => {
                  setMpin(e.target.value.replace(/\D/g, ''));
                  if (showForgotNotice) setShowForgotNotice(false);
                }}
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

            {/* Forgot PIN Action */}
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={() => setShowForgotNotice(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-600 rounded px-1 py-0.5 transition-colors"
              >
                {t('loginForgotPin')}
              </button>
            </div>

            {/* Temporary PIN Recovery Notice */}
            {showForgotNotice && (
              <div
                role="status"
                className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                  <span className="font-medium">{t('loginForgotPinNotice')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(false)}
                  className="text-amber-700 hover:text-amber-900 font-bold p-1 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm leading-none"
                  aria-label="Dismiss notice"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 mt-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>{t('navLogin')}</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-stone-100 text-center text-xs text-stone-600">
          Don't have an account yet?{' '}
          <Link
            to="/signup"
            state={{ from: { pathname: from } }}
            className="font-semibold text-emerald-800 hover:underline"
          >
            {t('navSignup')} here
          </Link>
        </div>
      </div>
    </div>
  );
};
