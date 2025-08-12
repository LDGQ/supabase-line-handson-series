// @ts-nocheck

// ハンズオン2-4: LIFF 認証 Edge Function
// LINE ID トークンを検証し、Supabase セッションを作成するための認証機能
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';

// 型定義
interface LineProfile {
  sub: string;
  name: string;
  picture: string;
  email?: string;
}

interface Environment {
  LINE_CHANNEL_ID: string;
  EDGE_FUNCTION_JWT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

interface UserResponse {
  session: Session;
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
  };
}

// 定数
const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '30d',
  EXPIRES_IN_SECONDS: 86400 // 24時間（秒）
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
    EDGE_FUNCTION_JWT: Deno.env.get('EDGE_FUNCTION_JWT'),
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

// ハンズオン2-4: Supabase JWT トークン生成
// LINE認証情報を基にSupabaseで使用するJWTトークンを生成
const generateJwtTokens = async (user: User, jwtSecret: string): Promise<Session> => {
  try {
    const now = Math.floor(Date.now() / 1000);

    const customClaims = {
      sub: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      user_metadata: user.user_metadata
    };

    const accessToken = await new jose.SignJWT(customClaims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_CONFIG.ACCESS_TOKEN_EXPIRY)
      .sign(new TextEncoder().encode(jwtSecret));

    const refreshToken = await new jose.SignJWT({
      sub: user.id,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_CONFIG.REFRESH_TOKEN_EXPIRY)
      .sign(new TextEncoder().encode(jwtSecret));

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: JWT_CONFIG.EXPIRES_IN_SECONDS,
      expires_at: now + JWT_CONFIG.EXPIRES_IN_SECONDS
    };
  } catch (error) {
    throw new ApiError(500, `Error generating JWT: ${error.message}`);
  }
};

// ハンズオン3-3: Supabase ユーザー管理
// LINE ユーザー情報をSupabaseのユーザーテーブルと連携
class UserManager {
  constructor(private supabase: SupabaseClient) {}

  async findUserByLineId(lineUserId: string): Promise<User | null> {
    const { data: { users }, error } = await this.supabase.auth.admin.listUsers();
    if (error) throw new ApiError(500, `Error listing users: ${error.message}`);

    return users.find(u => u.user_metadata?.liff_user_id === lineUserId) || null;
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

    // ハンズオン2-4: Supabaseセッション生成
    const session = await generateJwtTokens(user, env.EDGE_FUNCTION_JWT);

    const response: UserResponse = {
      session,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
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
