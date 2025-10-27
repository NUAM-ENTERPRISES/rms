// Core User interface
export interface User {
  id: string;
  name: string;
  email: string;
  mobileNumber: string;
  countryCode: string;
  roles: string[];
  permissions: string[];
  teamIds?: string[];
  userVersion?: number;
}

// Authentication state interface
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  status: "idle" | "loading" | "authenticated" | "anonymous";
  userVersion?: number;
}

// API Request/Response types
export interface LoginRequest {
  countryCode: string; // Country calling code (e.g., "+91")
  mobileNumber: string; // Mobile number without country code
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
  message: string;
}

export interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
  message: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// Token storage types
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  userData: User;
}

// Auth action payload types
export interface SetCredentialsPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface StoreTokensPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Auth hook return types
export interface AuthInitializationResult {
  isInitializing: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

// Permission and role types
export type Role = 'admin' | 'recruiter' | 'manager' | 'user';
export type Permission = 
  | 'read:candidates' 
  | 'write:candidates'
  | 'read:jobs'
  | 'write:jobs'
  | 'read:interviews'
  | 'write:interviews'
  | 'admin:all';

// Auth status types
export type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

// Error types
export interface AuthError {
  message: string;
  code?: string;
  statusCode?: number;
}

// Registration types (if needed in the future)
export interface RegisterRequest {
  name: string;
  countryCode: string; // Country calling code (e.g., "+91")
  mobileNumber: string; // Mobile number without country code
  email?: string; // Optional email
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

// Password reset types (if needed in the future)
export interface ForgotPasswordRequest {
  countryCode: string; // Country calling code (e.g., "+91")
  mobileNumber: string; // Mobile number without country code
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface UserProfileResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
  message: string;
}
