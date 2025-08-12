# 変更履歴

このファイルは、LIFF × Supabase 投稿管理アプリの変更履歴を記録します。

## [1.0.0] - 2025-01-03

### 🎉 初回リリース

#### 追加された機能
- **LINE認証機能**: LIFFを使用したLINE認証システム
- **投稿管理機能**: 投稿の表示・編集・削除機能
- **画像表示機能**: Supabase Storageからの画像表示
- **レスポンシブデザイン**: モバイル対応のUI/UX

#### 技術スタック
- **フロントエンド**: Next.js 15.3.4, React 18, TypeScript
- **スタイリング**: Tailwind CSS
- **認証**: LINE Front-end Framework (LIFF)
- **データベース**: Supabase (PostgreSQL)
- **ストレージ**: Supabase Storage

#### コンポーネント
- `LiffProvider`: LIFF認証プロバイダー
- `PostList`: 投稿一覧コンポーネント
- `PostCard`: 投稿カードコンポーネント

#### データベース設計
- `users`テーブル: ユーザー情報管理
- `posts`テーブル: 投稿データ管理
- Row Level Security (RLS) 対応

#### 主な機能
1. **認証フロー**
   - LIFF初期化
   - LINE認証
   - ユーザー情報の自動保存

2. **投稿管理**
   - 投稿一覧表示
   - コメント編集
   - 投稿削除

3. **画像処理**
   - パブリックURL生成
   - 画像読み込みエラーハンドリング
   - レスポンシブ画像表示

#### 開発環境
- **開発サーバー**: Next.js Dev Server
- **HTTPS対応**: ngrok トンネリング
- **型安全性**: TypeScript strict mode

### 🔧 技術的な実装

#### 認証システム
```typescript
// LIFF認証のみを使用
// Supabase認証は使用せず、LINE認証情報を直接利用
const handleLiffLogin = async () => {
  await liff.login();
  const profile = await liff.getProfile();
  await createOrUpdateUser(profile);
};
```

#### 画像URL生成
```typescript
// パブリックURL生成（署名付きURLから変更）
const { data } = supabase.storage
  .from('post-images')
  .getPublicUrl(storagePath);
```

#### データアクセス
```typescript
// LINE User IDベースのデータ管理
const { data: posts } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', supabaseUserId);
```

### 🐛 修正された問題

#### 1. 画像表示問題
- **問題**: 署名付きURLの期限切れで画像が表示されない
- **解決**: パブリックURLを使用するように変更

#### 2. Third Party Auth問題
- **問題**: SupabaseのLINE Provider未対応
- **解決**: LIFF認証のみを使用するアーキテクチャに変更

#### 3. Cross-Origin問題
- **問題**: ngrok使用時のCORSエラー
- **解決**: `next.config.ts`にallowedDevOriginsを追加

### 📋 既知の制限事項

1. **新規投稿作成機能**: 未実装
2. **写真アップロード機能**: 未実装
3. **GPS位置情報取得**: 未実装
4. **リアルタイム更新**: 未実装

### 🚀 今後の予定

#### v1.1.0 (予定)
- [ ] 新規投稿作成機能
- [ ] 写真アップロード機能
- [ ] GPS位置情報取得

#### v1.2.0 (予定)
- [ ] リアルタイム更新機能
- [ ] プッシュ通知機能
- [ ] 投稿検索機能

#### v2.0.0 (予定)
- [ ] 投稿の共有機能
- [ ] コメント機能
- [ ] いいね機能

### 📝 開発メモ

#### 環境変数
```env
NEXT_PUBLIC_SUPABASE_URL=https://uzosevijtyhvhmvkqvkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_LIFF_ID=1661488148-Wl764GG4
```

#### 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check

# Linting
npm run lint
```

#### デプロイ手順
1. Vercelにプロジェクトをインポート
2. 環境変数を設定
3. LIFF Endpoint URLを本番URLに変更
4. デプロイ実行

---

### 🤝 貢献者

- 開発: AI Assistant
- 企画・要件定義: User

### 📄 ライセンス

MIT License

---

**注意**: このプロジェクトは開発中のため、予告なく仕様が変更される可能性があります。 