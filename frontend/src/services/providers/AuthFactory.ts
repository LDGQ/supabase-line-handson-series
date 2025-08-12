import { LineAuthProvider } from './LineAuthProvider';
import type { AuthProvider } from './IAuthProvider';

export type ProviderType = 'line';

export function createAuthProvider(type: ProviderType): AuthProvider {
  switch (type) {
    case 'line':
    default:
      return LineAuthProvider.getInstance();
  }
}
