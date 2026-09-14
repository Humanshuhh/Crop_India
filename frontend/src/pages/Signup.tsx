import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Lock, Mail, RotateCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ErrorMessage } from '../components/common/ErrorMessage';

export const Signup: React.FC = () => {
  const { signUpWithEmail, error, clearAuthError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password.length < 6) {
      setClientError(t('authPasswordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setClientError(t('authPasswordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
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
            <label htmlFor="signup-email" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-12 pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="farmer@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Create Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-12 pl-10 pr-12 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="At least 6 characters"
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
            <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full min-h-12 pl-10 pr-12 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                placeholder="Re-type password"
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
