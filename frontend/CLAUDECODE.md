# LIFF × Supabase 写真投稿フロントエンド

LINE Front-end Framework (LIFF) と Supabase を統合したユーザー認証と写真投稿管理を行う Next.js アプリケーション。

## 🏗️ アーキテクチャ概要

このアプリケーションは LIFF ハンズオンチュートリアルの構造に従っています：

- **ハンズオン1-2**: Vercel デプロイ設定
- **ハンズオン2-4**: LIFF 認証統合  
- **ハンズオン3-3**: Supabase データベース接続
- **ハンズオン3-4**: 投稿データ管理
- **ハンズオン3-5**: ストレージ統合

## 📁 プロジェクト構造

```
src/
├── app/                    # Next.js 13+ App Router
│   ├── layout.tsx         # メタデータ付きルートレイアウト
│   └── page.tsx           # 認証フローメインページ
├── components/            # 再利用可能UIコンポーネント
│   ├── PostCard.tsx       # 個別投稿表示/編集
│   └── PostList.tsx       # CRUD操作付き投稿グリッド
├── hooks/                 # カスタムReactフック
│   ├── useLineUserAuth.ts # LIFF認証状態
│   └── usePost.ts         # 投稿データ管理
├── services/              # ビジネスロジック層
│   ├── liffService.ts     # LIFF SDKラッパー
│   ├── postService.ts     # 投稿CRUD操作
│   ├── supabaseClient.ts  # Supabaseクライアント設定
│   ├── supabaseAuthService.ts # 認証サービス
│   └── providers/         # 認証プロバイダー
└── types/                 # TypeScript型定義
    └── database.ts        # Supabaseテーブル型
```

## 🔧 主要コンポーネント

### 認証フロー

1. **LIFF初期化** (`useLineUserAuth.ts`)
   - 環境変数でLIFF SDKを初期化
   - LINEログイン状態を管理
   - トークンリフレッシュと有効期限を処理

2. **Supabase統合** (`supabaseAuthService.ts`)
   - LIFF IDトークンをSupabaseセッションに変換
   - `line-liff-auth` Edge Functionを呼び出し
   - ユーザーセッションとログアウトを管理

3. **プロバイダーパターン** (`services/providers/`)
   - 抽象化された認証インターフェース
   - 複数の認証プロバイダーをサポート
   - プロバイダー選択のファクトリーパターン

### データ管理

1. **投稿サービス** (`postService.ts`)
   - 投稿テーブルのCRUD操作
   - ストレージ統合によるイメージURL処理
   - エラーハンドリングとユーザー認証チェック

2. **カスタムフック** (`hooks/`)
   - `useLineUserAuth`: 認証状態管理
   - `usePost`: 投稿データ操作と状態

## 🌐 環境変数

```bash
# LIFF設定
NEXT_PUBLIC_LIFF_ID=1234567890-AbcdEfgH

# Supabase設定  
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🚀 開発環境セットアップ

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **環境変数の設定**
   ```bash
   cp env.example .env.local
   # あなたの認証情報で.env.localを編集
   ```

3. **開発サーバー**
   ```bash
   npm run dev
   ```

## 📱 LIFF統合詳細

### LIFFサービス (`liffService.ts`)

- **シングルトンパターン**: LIFFインスタンスの一意性を保証
- **トークン管理**: IDトークンの取得と検証を処理
- **キャッシュ管理**: 古い認証データをクリア
- **エラーハンドリング**: 包括的なエラーシナリオ

### 認証フック (`useLineUserAuth.ts`)

- **状態管理**: ユーザー、ログイン状態、読み込み、エラー
- **ライフサイクル管理**: 初期化、ログイン、ログアウト
- **トークンリフレッシュ**: 自動トークン更新
- **エラー復旧**: 期限切れトークンの適切な処理

## 🗄️ データベース統合

### 投稿管理 (`postService.ts`)

- **行レベルセキュリティ**: ユーザー固有のデータアクセス
- **イメージURL処理**: ストレージ署名URL
- **エラーバウンダリ**: 包括的なエラー処理
- **楽観的更新**: サーバー確認前のUI更新

### ストレージ統合

- **署名URL**: セキュアなイメージアクセス
- **パブリックURLフォールバック**: パフォーマンス最適化
- **エラー復旧**: 無いイメージの適切な処理

## 🎨 UIコンポーネント

### 投稿リスト (`PostList.tsx`)

- **グリッドレイアウト**: レスポンシブな投稿表示
- **ローディング状態**: スケルトンローディングインジケーター
- **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージ
- **空の状態**: 新規ユーザーへのガイダンス

### 投稿カード (`PostCard.tsx`)

- **インライン編集**: コンテンツの直接変更
- **イメージ表示**: 最適化されたイメージ読み込み
- **アクション**: 編集、削除、更新操作
- **デバウンス更新**: パフォーマンス最適化

## 🔒 セキュリティ配慮

- **トークン検証**: サーバーサイドIDトークン検証
- **RLSポリシー**: データベースレベルアクセス制御
- **CORS設定**: セキュアなクロスオリジンリクエスト
- **入力検証**: クライアントおよびサーバーサイド検証

## 🧪 一般的な開発タスク

### 新機能の追加

1. `services/`にサービスを作成
2. `hooks/`にカスタムフックを追加
3. `components/`にUIコンポーネントを作成
4. `types/`の型を更新

### 認証のデバッグ

1. LIFFエラーをブラウザー開発者ツールで確認
2. 環境変数が設定されているか確認
3. Edge Functionを直接テスト
4. Supabase Authログを確認

### データベース操作

1. `types/database.ts`の型定義を更新
2. `postService.ts`のサービスメソッドを変更
3. 新しいデータを処理するためにUIコンポーネントを更新

## 📈 パフォーマンス最適化

- **イメージ最適化**: Next.js Imageコンポーネント
- **デバウンス操作**: ユーザー入力処理
- **メモ化**: React最適化フック
- **バンドル分割**: 適用可能な場所での動的インポート

## 🐛 トラブルシューティング

### LIFF問題
- LIFF ID設定を確認
- LINE Developers Console設定を確認
- 本番環境URLのHTTPSを確保

### Supabase問題
- APIキーとプロジェクトURLを確認
- RLSポリシーを確認
- Edge Functionログを監視

### ビルド問題
- Next.jsキャッシュをクリア: `rm -rf .next`
- TypeScriptエラーを確認
- すべての環境変数を確認

## 🚢 デプロイ

### Vercelデプロイ

1. **リポジトリの接続**: GitHubリポジトリをリンク
2. **環境変数**: 必要な環境変数をすべて追加
3. **ビルド設定**: Next.js自動検出
4. **ドメイン設定**: LIFFエンドポイントURLを更新

### デプロイ後

1. LINE Developers ConsoleでLIFFアプリエンドポイントを更新
2. 認証フローをテスト
3. データベース接続を確認
4. アプリケーションログを監視

## 📖 関連ドキュメント

- [LIFF Documentation](https://developers.line.biz/en/docs/liff/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)

このアプリケーションは、モダンなReactとTypeScriptのベストプラクティスに従ったLIFF × Supabase統合のリファレンス実装として機能します。