# LINE写真投稿Bot - Supabase Edge Function

LINE Messaging APIとSupabase Edge Functionsを使用して構築されたボットで、ユーザーが写真・位置情報・コメントを段階的に投稿できる機能を提供します。

## プロジェクト構成

```
supabase/functions/line-photo-post-bot/
├── index.ts                    # メインエントリーポイント・Webhookルーター
├── handlers/                   # 各メッセージタイプのイベントハンドラー
│   ├── textHandler.ts         # テキストメッセージ処理（コマンド、コメント）
│   ├── imageHandler.ts        # 画像アップロード・処理
│   └── locationHandler.ts     # GPS位置情報データ処理
├── messages/                  # LINEメッセージテンプレート
│   ├── flex/                  # Flex Messageテンプレート
│   │   ├── buildFlexMessageWithQuickReply.ts
│   │   ├── buildGpsReceivedFlex.ts
│   │   ├── buildPhotoReceivedFlex.ts
│   │   ├── buildPostCancelledFlex.ts
│   │   ├── buildPostCompletedFlex.ts
│   │   ├── buildRequestLocationFlex.ts
│   │   ├── buildStartPostGuideFlex.ts
│   │   └── index.ts
│   └── quickReplies.ts        # クイックリプライボタン定義
├── services/                  # ビジネスロジックサービス
│   ├── lineMessagingService.ts # LINE API通信
│   ├── sessionService.ts      # 投稿セッション状態管理
│   ├── storageService.ts      # Supabase Storage操作
│   ├── supabaseClient.ts      # データベースクライアント設定
│   └── userService.ts         # ユーザー管理
└── utils/                     # ユーティリティ関数
    ├── env.ts                 # 環境変数処理
    ├── types.ts               # TypeScript型定義
    └── validateSignature.ts   # LINE webhook署名検証
```

## 技術スタック

- **ランタイム**: Deno (Supabase Edge Functions)
- **データベース**: PostgreSQL (PostGIS拡張付き)
- **ストレージ**: Supabase Storage (画像ファイル用)
- **API**: LINE Messaging API
- **認証**: LINE User IDとSupabase Auth連携

## 核となる機能

### 投稿ワークフロー（状態機械）
1. **photo_pending**: ユーザーが画像送信 → Botがストレージにアップロード
2. **gps_pending**: Botが位置情報要求 → ユーザーがGPS座標共有
3. **comment_pending**: Botがコメント要求 → ユーザーがテキスト追加またはスキップ
4. **completed**: Botが完成した投稿をデータベースに保存
5. **cancelled**: ユーザーはいつでもキャンセル可能

### データベーススキーマ
- `users`: Supabase Authと同期されたLINEユーザープロフィール
- `post_sessions`: 投稿作成中の一時的なセッション状態
- `posts`: 画像・位置情報・コメントを含む完成した投稿

## 主要機能

- **多段階投稿作成**: 写真 + 位置情報 + コメントのガイド付きワークフロー
- **リッチUI**: インタラクティブなクイックリプライボタン付きFlex Messages
- **画像最適化**: ストレージアップロード前のJPEG圧縮
- **セッション管理**: 未完了投稿のTTLベースクリーンアップ
- **セキュリティ**: 全LINEウェブフックのHMAC-SHA256署名検証
- **RLS**: ユーザーが自分のデータのみアクセス可能な行レベルセキュリティ

## 環境変数

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
LINE_CHANNEL_SECRET=xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx
IMAGE_BUCKET=post-images  # オプション、デフォルトは"post-images"
```

## よく使うコマンド

```bash
# 関数をデプロイ
supabase functions deploy line-photo-post-bot --no-verify-jwt

# 開発用ローカルサーバー起動
supabase functions serve line-photo-post-bot --env-file ./supabase/.env.local

# データベースマイグレーション実行
supabase db push
```

## テスト

- ローカルウェブフックテスト用にngrokを設定
- LINE Developers ConsoleでウェブフックURLを設定
- 完全な投稿フローをテスト: 写真 → 位置情報 → コメント → 完了

## アーキテクチャメモ

- 迅速なプロトタイピング用に`@ts-nocheck`付きTypeScriptを使用
- 各メッセージタイプ用の分離されたハンドラーによるイベント駆動アーキテクチャ
- 多段階ユーザーインタラクション用のステートフルセッション管理
- Supabase DatabaseとStorageサービスの両方との統合
- LINEメッセージによる包括的なエラーハンドリングとユーザーフィードバック