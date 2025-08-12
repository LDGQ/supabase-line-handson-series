# 開発者向けセットアップガイド

このドキュメントは、LIFF × Supabase 投稿管理アプリの詳細な設定手順を説明します。

## 📋 必要なアカウント・サービス

### 1. LINE Developers アカウント
- [LINE Developers Console](https://developers.line.biz/console/)
- LINEアカウントが必要

### 2. Supabase アカウント
- [Supabase](https://supabase.com/)
- GitHubアカウントでの登録推奨

### 3. 開発環境
- Node.js 18.x 以上
- npm または yarn
- Git

## 🔧 詳細セットアップ手順

### STEP 1: プロジェクトのクローン・セットアップ

```bash
# プロジェクトのクローン
git clone <repository-url>
cd liff-next-supabase

# 依存関係のインストール
npm install

# 環境変数ファイルの作成
cp env.example .env.local
```

### STEP 2: Supabase プロジェクトの設定

#### 2.1 新しいプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. 「New Project」をクリック
3. プロジェクト名を入力（例：`liff-app`）
4. データベースパスワードを設定
5. リージョンを選択（Asia Pacific (Tokyo) 推奨）
6. 「Create new project」をクリック

#### 2.2 データベーステーブルの作成

**SQL Editor** で以下のSQLを実行：

```sql
-- usersテーブルの作成
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- postsテーブルの作成
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

-- インデックスの作成
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
```

#### 2.3 Row Level Security (RLS) の設定

```sql
-- usersテーブルのRLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- usersテーブルのポリシー
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (true);

-- postsテーブルのRLS有効化
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- postsテーブルのポリシー
CREATE POLICY "Users can view all posts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (true);
```

#### 2.4 Storage バケットの作成

**Storage** セクションで：

1. 「Create bucket」をクリック
2. バケット名：`post-images`
3. 「Public bucket」を有効にする
4. 「Save」をクリック

**SQL Editor** でStorageポリシーを設定：

```sql
-- Storage ポリシーの設定
CREATE POLICY "Public Access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Users can update their own objects" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'post-images');

CREATE POLICY "Users can delete their own objects" ON storage.objects 
  FOR DELETE USING (bucket_id = 'post-images');
```

#### 2.5 環境変数の取得

**Settings** → **API** で以下を取得：

- `Project URL`
- `anon public` key

### STEP 3: LINE Developers Console の設定

#### 3.1 LINE Login Channel の作成

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. プロバイダーを選択または作成
3. 「Create a new channel」をクリック
4. 「LINE Login」を選択
5. 必要な情報を入力：
   - Channel name: `LIFF App`
   - Channel description: `LIFF投稿管理アプリ`
   - App type: `Web app`
6. 「Create」をクリック

#### 3.2 LIFF アプリの作成

**LINE Login Channel** の設定画面で：

1. 「LIFF」タブをクリック
2. 「Add」をクリック
3. LIFF app設定：
   - LIFF app name: `投稿管理アプリ`
   - Size: `Full`
   - Endpoint URL: `https://your-domain.com` (後で変更)
   - Scope: `profile openid`
   - Bot link feature: `On (Normal)`（オプション）
4. 「Add」をクリック

#### 3.3 LIFF ID の取得

作成されたLIFFアプリの **LIFF ID** をコピーしてください。

### STEP 4: 環境変数の設定

`.env.local` ファイルを編集：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_LIFF_ID=your-liff-id
```

### STEP 5: 開発環境での動作確認

#### 5.1 開発サーバーの起動

```bash
npm run dev
```

#### 5.2 HTTPS環境の準備

**ngrok のインストール・使用**：

```bash
# ngrokのインストール（初回のみ）
npm install -g ngrok

# 別のターミナルで実行
ngrok http 3000
```

生成されたHTTPS URLをコピーしてください。

#### 5.3 LIFF設定の更新

LINE Developers Console で：

1. LIFF設定を開く
2. 「Edit」をクリック
3. Endpoint URL を ngrok のHTTPS URLに変更
4. 「Update」をクリック

#### 5.4 Next.js設定の調整

`next.config.ts` を編集：

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io']
  }
};

export default nextConfig;
```

### STEP 6: 動作テスト

1. ngrok URLにアクセス
2. LINE認証が正常に動作するか確認
3. ユーザー情報が表示されるか確認
4. 投稿一覧が表示されるか確認

## 🔍 トラブルシューティング

### よくあるエラーと解決策

#### 1. LIFF初期化エラー

```
LIFF initialization failed
```

**確認事項**：
- LIFF IDが正しく設定されているか
- Endpoint URLが正しく設定されているか
- HTTPS環境でアクセスしているか

#### 2. Supabase接続エラー

```
Invalid API key
```

**確認事項**：
- Supabase URLが正しいか
- Anon keyが正しいか
- プロジェクトが一時停止していないか

#### 3. 画像表示エラー

```
画像を読み込めませんでした
```

**確認事項**：
- Storage バケットが存在するか
- バケットがパブリックに設定されているか
- Storage ポリシーが正しく設定されているか

#### 4. Cross-Origin エラー

```
Cross origin request detected
```

**解決策**：
- `next.config.ts` に `allowedDevOrigins` を追加
- ngrokのドメインを許可リストに追加

### デバッグコマンド

```bash
# Supabase接続テスト
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Supabase URL:', supabase.supabaseUrl);
"

# 環境変数確認
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('LIFF_ID:', process.env.NEXT_PUBLIC_LIFF_ID);
"
```

## 🚀 本番環境へのデプロイ

### Vercel へのデプロイ

1. **GitHubリポジトリの作成**
2. **Vercelアカウント作成**
3. **プロジェクトのインポート**
4. **環境変数の設定**
5. **デプロイ実行**

詳細は [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview) を参照してください。

### 本番環境での設定変更

1. **LIFF Endpoint URL** を本番URLに変更
2. **Supabase RLS** の見直し
3. **Storage ポリシー** の見直し
4. **パフォーマンス最適化**

## 📝 開発のヒント

### コンポーネント開発

- **TypeScript** を活用した型安全性
- **Tailwind CSS** でのスタイリング
- **React Hooks** を使用した状態管理

### データベース設計

- **UUID** を主キーとして使用
- **外部キー制約** でデータ整合性を保証
- **インデックス** でクエリ性能を向上

### セキュリティ

- **RLS** でデータアクセス制御
- **環境変数** で機密情報を管理
- **HTTPS** での通信

---

このガイドに従って設定を行うことで、LIFF × Supabase アプリケーションが正常に動作するはずです。問題が発生した場合は、エラーメッセージを確認し、該当するトラブルシューティングセクションを参照してください。 