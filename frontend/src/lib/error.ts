export type AppErrorType = 'AUTH_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR';

export class AppError extends Error {
  constructor(
    message: string,
    public type: AppErrorType = 'API_ERROR',
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  static isIdTokenExpired(error: Error): boolean {
    // 従来のエラーメッセージ形式
    if (error.message.includes('IdToken expired')) {
      return true;
    }
    
    // 新しいエラーレスポンス形式（code: 'TOKEN_EXPIRED'）
    if (error.message && typeof error.message === 'object') {
      const messageObj = error.message as Record<string, unknown>;
      if ('code' in messageObj && messageObj.code === 'TOKEN_EXPIRED') {
        return true;
      }
    }
    
    // AuthErrorでTOKEN_EXPIREDコードの場合
    if (error instanceof AuthError && error.code === 'TOKEN_EXPIRED') {
      return true;
    }
    
    return false;
  }

  static isAuthError(error: Error): boolean {
    return error instanceof AppError && error.type === 'AUTH_ERROR';
  }

  static isNetworkError(error: Error): boolean {
    return error instanceof AppError && error.type === 'NETWORK_ERROR';
  }
}

export class AuthError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 'AUTH_ERROR', code);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 'VALIDATION_ERROR', code);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 'NETWORK_ERROR', code);
    this.name = 'NetworkError';
  }
} 