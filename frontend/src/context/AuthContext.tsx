import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthContextType, AppUser, UserRole, SignupData } from '../types/auth.types';
import { loginApi, signupApi } from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState<boolean>(true);

  // Initialize from local storage on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const token = localStorage.getItem('kisan_auth_token');
        const uid = localStorage.getItem('kisan_user_id');
        const userRole = localStorage.getItem('kisan_role') as UserRole;
        const phone = localStorage.getItem('kisan_phone');
        const name = localStorage.getItem('kisan_name');

        if (token && uid && userRole && phone) {
          setUser({ uid, phone, name: name || undefined });
          setRole(userRole);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        console.error('[AuthProvider] Failed to load session from local storage', err);
      } finally {
        setLoading(false);
        setRoleLoading(false);
      }
    };

    initAuth();
  }, []);

  const signInWithPhone = async (phone: string, mpin: string) => {
    setError(null);
    setLoading(true);
    setRoleLoading(true);
    try {
      const response = await loginApi({ username_or_phone: phone, password: mpin });
      
      const newRole = response.role as UserRole;
      
      localStorage.setItem('kisan_auth_token', response.token);
      localStorage.setItem('kisan_user_id', response.user_id);
      localStorage.setItem('kisan_role', newRole);
      localStorage.setItem('kisan_phone', phone);
      // We might not get name from login API, but we clear it or leave it
      localStorage.removeItem('kisan_name');

      setUser({ uid: response.user_id, phone });
      setRole(newRole);
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
      setRoleLoading(false);
    }
  };

  const signUpWithPhone = async (data: SignupData) => {
    setError(null);
    setLoading(true);
    setRoleLoading(true);
    try {
      const response = await signupApi({
        name: data.name,
        phone: data.phone,
        state: data.state,
        district: data.district,
        pin: data.mpin,
        language: data.language || 'en'
      });

      const newRole = response.role as UserRole;
      
      localStorage.setItem('kisan_auth_token', response.token);
      localStorage.setItem('kisan_user_id', response.user_id);
      localStorage.setItem('kisan_role', newRole);
      localStorage.setItem('kisan_phone', data.phone);
      localStorage.setItem('kisan_name', data.name);

      setUser({ uid: response.user_id, phone: data.phone, name: data.name });
      setRole(newRole);
    } catch (err: any) {
      const msg = err?.userMessage || err?.message || 'Registration failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
      setRoleLoading(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      localStorage.removeItem('kisan_auth_token');
      localStorage.removeItem('kisan_user_id');
      localStorage.removeItem('kisan_role');
      localStorage.removeItem('kisan_phone');
      localStorage.removeItem('kisan_name');
      
      setUser(null);
      setRole(null);
    } catch (err) {
      console.error('[AuthProvider] Sign out error:', err);
      setError('Could not sign out completely. Please refresh.');
    }
  };

  const clearAuthError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        role,
        roleLoading,
        signInWithPhone,
        signUpWithPhone,
        signOutUser,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
