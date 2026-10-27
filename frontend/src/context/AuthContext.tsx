import React, { createContext, useContext, useState } from 'react';
import type { AuthContextType, AppUser, UserRole, SignupData } from '../types/auth.types';
import { loginApi, signupApi } from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialSession(): { user: AppUser | null; role: UserRole | null } {
  try {
    if (typeof localStorage === 'undefined') {
      return { user: null, role: null };
    }
    const token = localStorage.getItem('kisan_auth_token');
    const uid = localStorage.getItem('kisan_user_id');
    const userRole = localStorage.getItem('kisan_role') as UserRole;
    const phone = localStorage.getItem('kisan_phone');
    const name = localStorage.getItem('kisan_name');
    let avatarUrl = localStorage.getItem('kisan_avatar') || undefined;

    if (!avatarUrl && uid) {
      try {
        const savedProfile = localStorage.getItem(`kisan_farmer_profile_${uid}`);
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.avatarUrl) {
            avatarUrl = String(parsed.avatarUrl);
            localStorage.setItem('kisan_avatar', avatarUrl);
          }
        }
      } catch {}
    }

    if (token && uid && userRole && phone) {
      return {
        user: { uid, phone, name: name || undefined, avatarUrl },
        role: userRole,
      };
    }
  } catch (err) {
    console.error('[AuthProvider] Failed to load session from local storage', err);
  }
  return { user: null, role: null };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialSession] = useState(getInitialSession);
  const [user, setUser] = useState<AppUser | null>(initialSession.user);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(initialSession.role);
  const [roleLoading, setRoleLoading] = useState<boolean>(false);

  const updateUserName = (name: string) => {
    const normalizedName = name.trim();

    try {
      localStorage.setItem('kisan_name', normalizedName);
    } catch {
      // The in-memory update should still work if storage is unavailable.
    }

    setUser((currentUser) =>
      currentUser
        ? { ...currentUser, name: normalizedName || undefined }
        : currentUser
    );
  };

  const updateUserAvatar = (avatarUrl: string) => {
    try {
      if (avatarUrl && avatarUrl.trim()) {
        localStorage.setItem('kisan_avatar', avatarUrl);
      }
    } catch {
      // The in-memory update should still work if storage is unavailable.
    }

    setUser((currentUser) =>
      currentUser
        ? { ...currentUser, avatarUrl: avatarUrl || currentUser.avatarUrl }
        : currentUser
    );
  };

  // Session is synchronously initialized via getInitialSession() to prevent auth flicker

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
      
      if (response.name) {
        localStorage.setItem('kisan_name', response.name);
      } else {
        localStorage.removeItem('kisan_name');
      }

      let avatarUrl = localStorage.getItem('kisan_avatar') || undefined;
      if (!avatarUrl) {
        try {
          const savedProfile = localStorage.getItem(`kisan_farmer_profile_${response.user_id}`);
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile);
            if (parsed.avatarUrl) {
              avatarUrl = String(parsed.avatarUrl);
              localStorage.setItem('kisan_avatar', avatarUrl);
            }
          }
        } catch {}
      }

      setUser({ 
        uid: response.user_id, 
        phone, 
        name: response.name,
        avatarUrl,
      });
      
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
      localStorage.removeItem('kisan_avatar');
      
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
        updateUserName,
        updateUserAvatar,
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
