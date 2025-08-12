# LIFF × Supabase 投稿管理アプリ

LINE Front-end Framework (LIFF) と Supabase を組み合わせた投稿管理アプリケーションです。LINE認証を使用してユーザー管理を行い、投稿の作成・編集・削除機能を提供します。

## 🚀 機能

- **LINE認証**: LIFFを使用したLINE認証
- **投稿管理**: 投稿の表示・編集・削除
- **画像表示**: Supabase Storageからの画像表示
- **位置情報**: GPS情報の表示
- **レスポンシブデザイン**: モバイル対応UI

## 📋 前提条件

- Node.js 18.x 以上
- LINE Developers アカウント
- Supabase プロジェクト

## 🛠️ セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_LIFF_ID=your_liff_id
```

### 3. LINE Developers Console の設定

1. **LINE Login Channel** を作成
2. **LIFF アプリ** を作成
   - Endpoint URL: `https://your-domain.com` (開発時は ngrok URL)
   - Scope: `profile openid`
   - Bot link feature: オプション

### 4. Supabase の設定

#### データベーステーブル

```sql
-- usersテーブル
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- postsテーブル
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  image_url TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Row Level Security (RLS)

```sql
-- usersテーブルのRLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (true);

-- postsテーブルのRLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all posts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (true);
```

#### Storage バケット

```sql
-- post-images バケットの作成
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

-- Storage のポリシー設定
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images');
```

## 🔧 開発環境での実行

### 1. 開発サーバーの起動

```bash
npm run dev
```

### 2. HTTPS環境の準備

LIFFアプリはHTTPS環境が必要です。開発時は以下のいずれかを使用してください：

#### ngrok を使用する場合

```bash
# 別のターミナルで実行
npx ngrok http 3000
```

生成されたHTTPS URLをLIFF設定のEndpoint URLに設定してください。

#### Vercel を使用する場合

```bash
# Vercelにデプロイ
npx vercel
```

### 3. Next.js設定の調整

ngrokを使用する場合、`next.config.ts` に以下を追加してください：

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io']
  }
};

export default nextConfig;
```

## 📱 使用方法

### 1. アプリケーションへのアクセス

- LIFFアプリのURLにアクセス
- 自動的にLINE認証が開始されます

### 2. 投稿の管理

- **投稿一覧**: 自分の投稿一覧を表示
- **投稿編集**: コメントの編集が可能
- **投稿削除**: 投稿の削除が可能

### 3. 画像の表示

- Supabase Storageに保存された画像を表示
- 自動的にパブリックURLを生成
- 画像読み込みエラー時のフォールバック表示

## 🏗️ アーキテクチャ

### コンポーネント構成

```
src/
├── app/
│   ├── layout.tsx          # レイアウト
│   └── page.tsx            # メインページ
├── components/
│   ├── LiffProvider.tsx    # LIFF認証プロバイダー
│   ├── PostCard.tsx        # 投稿カード
│   └── PostList.tsx        # 投稿一覧
├── lib/
│   └── supabaseClient.ts   # Supabaseクライアント
└── types/
    └── database.ts         # データベース型定義
```

### 認証フロー

1. **LIFF初期化**: アプリ起動時にLIFF SDKを初期化
2. **LINE認証**: LIFFログイン状態を確認
3. **ユーザー登録**: LINE認証成功時にSupabaseにユーザー情報を保存
4. **データアクセス**: LINE User IDを使用してデータを管理

## 🔧 トラブルシューティング

### IDトークン期限切れエラー

**症状**: `IdToken expired` エラーが発生する

**原因**: ブラウザに古いIDトークンがキャッシュされている

**解決方法**:

1. **ブラウザのキャッシュをクリア**:
   - 開発者ツール → Application → Local Storage → クリア
   - 開発者ツール → Application → Session Storage → クリア

2. **手動でキャッシュクリア**:
   ```javascript
   // ブラウザのコンソールで実行
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **自動クリア機能**: アプリは自動的に古いキャッシュを検出してクリアします

### その他のよくある問題

- **認証エラー**: LIFF IDの設定を確認
- **画像表示エラー**: Supabase Storageの設定を確認
- **位置情報エラー**: ブラウザの位置情報許可を確認

## 🔍 トラブルシューティング

### よくある問題

#### 1. 画像が表示されない

**原因**: Supabase Storageの設定問題
**解決策**: 
- `post-images` バケットがパブリックに設定されているか確認
- Storage ポリシーが正しく設定されているか確認

#### 2. LIFF初期化エラー

**原因**: LIFF IDの設定問題
**解決策**:
- `.env.local` のLIFF IDが正しいか確認
- LINE Developers Console の設定を確認

#### 3. Cross-Origin エラー

**原因**: ngrok使用時のCORS問題
**解決策**:
- `next.config.ts` に `allowedDevOrigins` を追加
- ngrokのドメインを許可リストに追加

#### 4. フォント読み込みエラー

**原因**: Google Fonts接続問題
**解決策**:
- フォールバックフォントが使用されるため、機能に影響なし
- 必要に応じてローカルフォントを使用

### デバッグ方法

```bash
# 開発者ツールでコンソールを確認
# エラーログを確認してください

# Supabaseの接続テスト
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Supabase接続テスト:', supabase.supabaseUrl);
"
```

## 🚀 デプロイ

### Vercel へのデプロイ

1. **Vercelアカウント作成**
2. **GitHubリポジトリ連携**
3. **環境変数設定**
4. **デプロイ実行**

```bash
# Vercel CLI使用
npx vercel
```

### 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `NEXT_PUBLIC_LIFF_ID`

## 📝 今後の拡張予定

- [ ] 新規投稿作成機能
- [ ] 写真アップロード機能
- [ ] GPS位置情報取得
- [ ] リアルタイム更新
- [ ] プッシュ通知

## 🤝 貢献

プルリクエストや Issue の作成を歓迎します。

## 📄 ライセンス

MIT License

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. **環境変数**: `.env.local` の設定
2. **Supabase**: データベースとStorageの設定
3. **LINE**: LIFF設定とEndpoint URL
4. **ネットワーク**: HTTPS環境の確認

---

**最終更新**: 2025年1月3日
