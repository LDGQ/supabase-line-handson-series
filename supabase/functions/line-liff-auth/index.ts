// @ts-nocheck

// ハンズオン2-4: LIFF 認証 Edge Function
// LINE ID トークンを検証し、Supabase セッションを作成するための認証機能
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';

// 型定義
interface LineProfile {
  sub: string;
  name: string;
  picture: string;
  email?: string;
}

interface Environment {
  LINE_CHANNEL_ID: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface UserResponse {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
    aud: string;
    role: string;
  };
}

// 定数
const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};


// ユーティリティ関数
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const getCorsHeaders = (origin: string): Record<string, string> => ({
  ...CORS_HEADERS,
  'Access-Control-Allow-Origin': origin
});

const createResponse = (data: unknown, status = 200, origin: string): Response => {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: {
        ...getCorsHeaders(origin),
        'Cache-Control': 'no-store'
      }
    }
  );
};

// 環境変数の検証
const validateEnvironment = (): Environment => {
  const env = {
    LINE_CHANNEL_ID: Deno.env.get('LINE_CHANNEL_ID'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  };

  const missing = Object.entries(env)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new ApiError(500, `Missing required environment variables: ${missing.join(', ')}`);
  }

  return env as Environment;
};

// ハンズオン2-4: LINE ID トークン検証
// LINE OAuth2 API を使用してIDトークンの有効性を確認
const verifyLineIdToken = async (idToken: string, channelId: string): Promise<LineProfile> => {
  if (!idToken) {
    throw new ApiError(400, 'ID token is required');
  }

  try {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, `LINE API error: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Error verifying ID token: ${error.message}`);
  }
};


// ハンズオン3-3: Supabase ユーザー管理
// LINE ユーザー情報をSupabaseのユーザーテーブルと連携
class UserManager {
  constructor(private supabase: SupabaseClient) {}

  async findUserByLineId(lineUserId: string): Promise<User | null> {
    // より効率的な検索: メールアドレスで直接検索
    const email = `${lineUserId}@line.user`;
    const { data: { users }, error } = await this.supabase.auth.admin.listUsers({
      email: email,
      limit: 1
    });
    
    if (error) throw new ApiError(500, `Error finding user: ${error.message}`);
    
    return users.length > 0 ? users[0] : null;
  }

  async updateUser(userId: string, lineProfile: LineProfile): Promise<User> {
    const { data: { user }, error } = await this.supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          liff_user_id: lineProfile.sub,
          liff_display_name: lineProfile.name,
          liff_picture_url: lineProfile.picture,
          provider: 'line'
        },
        app_metadata: {
          provider: 'line',
          providers: ['line']
        }
      }
    );

    if (error || !user) throw new ApiError(500, `Error updating user: ${error?.message}`);
    return user;
  }

  async createUser(lineProfile: LineProfile): Promise<User> {
    const { data: { user }, error } = await this.supabase.auth.admin.createUser({
      email: `${lineProfile.sub}@line.user`,
      email_confirm: true,
      user_metadata: {
        liff_user_id: lineProfile.sub,
        liff_display_name: lineProfile.name,
        liff_picture_url: lineProfile.picture,
        provider: 'line'
      },
      app_metadata: {
        provider: 'line',
        providers: ['line']
      }
    });

    // ユーザーが既に存在する場合は再検索して返す
    if (error?.message?.includes('already been registered')) {
      const existingUser = await this.findUserByLineId(lineProfile.sub);
      if (existingUser) {
        return await this.updateUser(existingUser.id, lineProfile);
      }
    }

    if (error || !user) throw new ApiError(500, `Error creating user: ${error?.message}`);
    return user;
  }
}

// ハンズオン2-4: メイン認証ハンドラー
// フロントエンドからのLIFF IDトークンを受け取り、Supabaseセッションを返す
const handleRequest = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }

  try {
    const env = validateEnvironment();
    const body = await req.json().catch(() => null);
    
    if (!body?.id_token) {
      throw new ApiError(400, 'Request body must contain id_token');
    }

    // ハンズオン2-4: LINE IDトークンの検証
    const lineProfile = await verifyLineIdToken(body.id_token, env.LINE_CHANNEL_ID);

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // ハンズオン3-3: ユーザー作成・更新処理
    const userManager = new UserManager(supabase);
    const existingUser = await userManager.findUserByLineId(lineProfile.sub);
    
    const user = existingUser
      ? await userManager.updateUser(existingUser.id, lineProfile)
      : await userManager.createUser(lineProfile);

    // Supabase Auth APIでセッションを作成
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateAccessToken(user.id);
    
    if (sessionError || !sessionData) {
      console.warn('Access token generation failed, using basic response');
      // フォールバック: ユーザー情報のみ返す
      const response = {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          aud: 'authenticated',
          role: 'authenticated'
        }
      };
      return createResponse(response, 200, origin);
    }

    // 正しいセッション情報を返す
    const response = {
      session: {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token || `refresh_${user.id}`,
        expires_in: sessionData.expires_in || 3600,
        expires_at: Math.floor(Date.now() / 1000) + (sessionData.expires_in || 3600),
        token_type: 'bearer'
      },
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        aud: 'authenticated',
        role: 'authenticated'
      }
    };

    return createResponse(response, 200, origin);

  } catch (error) {
    console.error('Error in verify-line function:', error);
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return createResponse({ error: message }, status, origin);
  }
};

serve(handleRequest); 
