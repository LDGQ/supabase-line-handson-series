import { User } from '@supabase/supabase-js';

export interface AuthProvider {
  name: string;
  isLoggedIn(): Promise<boolean>;
  login(): Promise<void> | void;
  logout(): Promise<void> | void;
  ensureSession(): Promise<User>;
}
