export type UserRole = "farmer" | "admin";

export interface AppUser {
  uid: string;
  phone: string;
  name?: string;
}

export interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  role: UserRole | null;
  roleLoading: boolean;
}

export interface SignupData {
  name: string;
  phone: string;
  state: string;
  district: string;
  mpin: string;
  language?: string;
}

export interface AuthContextType extends AuthState {
  signInWithPhone: (phone: string, mpin: string) => Promise<void>;
  signUpWithPhone: (data: SignupData) => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}
