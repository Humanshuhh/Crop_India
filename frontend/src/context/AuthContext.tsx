import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { AuthContextType } from '../types/auth.types';
import { dictionaries } from '../i18n';
import type { SupportedLanguage } from '../types/i18n.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getActiveDictionary = () => {
  try {
    const lang = (localStorage.getItem('kisan_sahayak_lang') as SupportedLanguage) || 'en';
    return dictionaries[lang] || dictionaries.en;
  } catch {
    return dictionaries.en;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'farmer' | 'admin' | null>(null);
  const [roleLoading, setRoleLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          // Fetch or create user role in Firestore
          try {
            const { doc, getDoc, setDoc } = await import('firebase/firestore');
            const { db } = await import('../lib/firebase');
            const userRef = doc(db, 'users', currentUser.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              const data = snap.data();
              setRole(data.role as 'farmer' | 'admin');
            } else {
              // Create default profile with farmer role
              await setDoc(userRef, { role: 'farmer' });
              setRole('farmer');
            }
          } catch (e) {
            console.error('[AuthProvider] Error fetching role:', e);
            setRole(null);
          } finally {
            setRoleLoading(false);
          }
        } else {
          setRole(null);
          setRoleLoading(false);
        }
      },
      (authErr) => {
        console.error('[Kisan Sahayak Auth] Firebase listener error:', authErr);
        const dict = getActiveDictionary();
        setError(dict.authNetworkFailed);
        setLoading(false);
        setRole(null);
        setRoleLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const formatAuthError = (err: unknown): string => {
    const dict = getActiveDictionary();

    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: string }).code;
      switch (code) {
        case 'auth/email-already-in-use':
          return dict.authEmailInUse;
        case 'auth/invalid-email':
          return dict.authInvalidEmail;
        case 'auth/weak-password':
          return dict.authWeakPassword;
        case 'auth/invalid-credential':
          return dict.authInvalidCredential;
        case 'auth/user-not-found':
          return dict.authUserNotFound;
        case 'auth/wrong-password':
          return dict.authWrongPassword;
        case 'auth/too-many-requests':
          return dict.authTooManyRequests;
        case 'auth/network-request-failed':
          return dict.authNetworkFailed;
        case 'auth/operation-not-allowed':
          console.warn('[Kisan Sahayak Auth] Email/password registration is not enabled in Firebase Console:', err);
          return dict.authOperationNotAllowed;
        case 'auth/invalid-api-key':
        case 'auth/api-key-not-valid':
        case 'auth/app-not-authorized':
          console.error('[Kisan Sahayak Auth] Firebase API key or configuration error:', err);
          return dict.authConfigError;
        case 'auth/user-disabled':
          console.warn('[Kisan Sahayak Auth] User account has been disabled in Firebase Console:', err);
          return 'This farmer account has been disabled. Please contact support.';
        default:
          console.error('[Kisan Sahayak Auth] Unhandled Firebase Authentication error:', code, err);
          return dict.authGenericError;
      }
    }
    console.error('[Kisan Sahayak Auth] Unknown non-Firebase error:', err);
    return dict.authGenericError;
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      const msg = formatAuthError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      // After successful signup, create Firestore profile with default role
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { role: 'farmer' });
      }
    } catch (err) {
      const msg = formatAuthError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[Kisan Sahayak Auth] Sign out error:', err);
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
        signInWithEmail,
        signUpWithEmail,
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
