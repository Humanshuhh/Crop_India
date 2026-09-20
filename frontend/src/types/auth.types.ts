import type { User } from 'firebase/auth';

export type UserRole = "farmer" | "admin";

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  role: UserRole | null;
  roleLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}
