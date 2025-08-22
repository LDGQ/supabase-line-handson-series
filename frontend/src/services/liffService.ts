// LIFF サービス
// LINE Front-end Framework の初期化と認証管理
import { Liff } from '@line/liff';

export interface LiffConfig {
  liffId: string;
  withLoginOnExternalBrowser?: boolean;
}

export interface TokenInfo {
  token: string;
  expiresIn: number;
  isExpired: boolean;
}

export class LiffService {
  private static instance: LiffService;
  private liff: Liff | null = null;
  private config: LiffConfig | null = null;

  private constructor() {}

  static getInstance(): LiffService {
    if (!LiffService.instance) {
      LiffService.instance = new LiffService();
    }
    return LiffService.instance;
  }

  // LIFF 初期化処理
  // LINE Developers で作成した LIFF ID を使用してSDKを初期化
  async initialize(config: LiffConfig): Promise<Liff> {
    if (this.liff) {
      return this.liff;
    }
    
    if (typeof window === 'undefined') {
      throw new Error('LiffService can only be used in browser environment');
    }
    
    this.config = config;
    const { default: liff } = await import('@line/liff');
    
    try {
      // 初期化前にキャッシュクリア（LIFFインスタンスは保持）
      this.clearOldCache(false);
      
      // 初期化オプションの改善
      const initOptions = {
        liffId: config.liffId,
        withLoginOnExternalBrowser: config.withLoginOnExternalBrowser ?? true,
        logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'error'
      };
      
      await liff.init(initOptions);
      
      this.liff = liff;
      return liff;
    } catch (error) {
      // 初期化失敗時はインスタンスをクリア
      this.liff = null;
      throw new Error(`Failed to initialize LIFF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ID トークン取得
  // LINE ログインで取得したIDトークンを返す（Supabase認証で使用）
  async getIdToken(): Promise<string | null> {
    if (!this.liff) {
      throw new Error('LIFF is not initialized');
    }
    
    let token = this.liff.getIDToken();
    
    if (!token) {
      token = await this.refreshIdToken();
    }
    
    if (token) {
      const tokenInfo = this.validateToken(token);
      
      if (tokenInfo.isExpired) {
        this.logout();
        setTimeout(() => {
          this.login();
        }, 100);
        return null;
      }
      
      return token;
    }
    
    return null;
  }

  async getProfile() {
    if (!this.liff) {
      throw new Error('LIFF is not initialized');
    }
    return await this.liff.getProfile();
  }

  // Is系メソッド
  isLoggedIn(): boolean {
    const hasLiff = !!this.liff;
    const loggedIn = this.liff?.isLoggedIn() ?? false;
    return loggedIn;
  }

  isInitialized(): boolean {
    return this.liff !== null;
  }

  // 初期化状態の詳細確認
  getInitializationStatus(): {
    isInitialized: boolean;
    hasConfig: boolean;
    liffId: string | null;
    isLoggedIn: boolean;
  } {
    return {
      isInitialized: this.isInitialized(),
      hasConfig: this.config !== null,
      liffId: this.config?.liffId || null,
      isLoggedIn: this.isLoggedIn()
    };
  }

  // Login/Logout系メソッド
  login(): void {
    if (!this.liff) {
      throw new Error('LIFF is not initialized');
    }
    
    this.liff.login({ 
      redirectUri: window.location.href, 
      scope: 'openid profile email' 
    } as { redirectUri: string; scope: string });
  }

  logout(): void {
    if (this.liff) {
      this.liff.logout();
    }
  }

  // ログイン状態の強制更新
  async forceRefreshLogin(): Promise<boolean> {
    if (!this.liff) {
      return false;
    }

    const currentLoginStatus = this.liff.isLoggedIn();
    
    if (!currentLoginStatus) {
      this.login();
      return false;
    }
    
    const token = this.liff.getIDToken();
    
    if (token) {
      const tokenInfo = this.validateToken(token);
      if (tokenInfo.isExpired) {
        this.logout();
        setTimeout(() => {
          this.login();
        }, 100);
        return false;
      }
      
      return true;
    } else {
      this.login();
      return false;
    }
  }

  // Token系メソッド
  private validateToken(token: string): TokenInfo {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      
      return {
        token,
        expiresIn,
        isExpired: expiresIn < 0
      };
    } catch {
      // デコードエラーの場合は有効とみなす
      return {
        token,
        expiresIn: 3600, // デフォルト1時間
        isExpired: false
      };
    }
  }

  private async refreshIdToken(): Promise<string | null> {
    if (!this.liff) {
      return null;
    }

    return this.liff.getIDToken();
  }

  // ユーティリティメソッド
  private clearOldCache(resetInstance: boolean = true): void {
    // 1. localStorage のクリア
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('liff') || 
        key.includes('line') || 
        key.includes('auth') ||
        key.includes('supabase') ||
        key.includes('sb-')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // 2. sessionStorage のクリア
    sessionStorage.clear();
    
    // 3. LIFFインスタンスのリセット（条件付き）
    if (resetInstance && this.liff) {
      this.liff = null;
    }
    
    // 4. クッキーのクリア（LIFF関連）
    this.clearCookies();
    
    // 5. IndexedDBのクリア（存在する場合）
    this.clearIndexedDB();
  }

  // 手動キャッシュクリア用のパブリックメソッド
  public forceClearCache(): void {
    this.clearOldCache(true); // 手動実行時はインスタンスもリセット
    
    // ページリロードを提案
    if (confirm('キャッシュをクリアしました。ページを再読み込みしますか？')) {
      window.location.reload();
    }
  }

  private clearCookies(): void {
    try {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (name.includes('liff') || name.includes('line') || name.includes('auth')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch (error) {
      // エラーは無視
    }
  }

  private clearIndexedDB(): void {
    try {
      if ('indexedDB' in window) {
        const databases = indexedDB.databases();
        databases.then(dbs => {
          dbs.forEach(db => {
            if (db.name && (db.name.includes('liff') || db.name.includes('line'))) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        }).catch(() => {
          // エラーは無視
        });
      }
    } catch (error) {
      // エラーは無視
    }
  }
}

export type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}; 