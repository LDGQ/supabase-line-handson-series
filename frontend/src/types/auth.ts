import { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  setUser: (user: User | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: Error;
}