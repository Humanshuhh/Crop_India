import { apiPostJson } from './apiClient';

export interface LoginPayload {
  username_or_phone: string;
  password: string; // The MPIN
}

export interface SignupPayload {
  name: string;
  phone: string;
  state: string;
  district: string;
  pin: string; // The MPIN — field name required by backend contract
  language?: string;
}

export interface AuthResponse {
  status: string;
  message: string;
  role: string;
  user_id: string;
  token: string;
}

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  return apiPostJson<LoginPayload, AuthResponse>('/api/v1/auth/login', payload);
}

export async function signupApi(payload: SignupPayload): Promise<AuthResponse> {
  return apiPostJson<SignupPayload, AuthResponse>('/api/v1/auth/signup', payload);
}

