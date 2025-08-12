## 📄 アプリケーション仕様書 - Supabase × LINE 写真投稿 BOT

---

### 🆕 推奨フォルダ名

```
line-photo-post-bot
```

> **理由**: 本 Edge Function は LINE からの Webhook を受け取り、写真 + 位置情報 + コメントを “投稿” として Supabase に保存する機能が中心です。`line-webhook` よりもドメインが明確かつリポジトリ検索もしやすいため、`line-photo-post-bot` を推奨します。

---

## 1️⃣ 概要

本プロジェクトは Supabase Edge Functions と LINE Messaging API を組み合わせ、ユーザーが **写真・位置情報・コメント** を段階的に投稿できる BOT を提供します。投稿は Supabase の

* PostgreSQL (テーブル: `posts`, `post_sessions`, `users`)
* Storage バケット (画像ファイル)

に保存され、Bot は Flex Message を用いてリッチに応答します。

---

## 2️⃣ アーキテクチャ

```
┌────────────┐              ┌────────────────┐
│   LINE App │───Webhook──▶│ Edge Function  │
└────────────┘              │  (/line-webhook)│
      ▲                     └────────┬───────┘
      │  Flex / QuickReply            │
      │                                ▼
┌────────────┐    Supabase JS    ┌──────────────┐
│   End User │◀──────────────────│  Supabase DB │
└────────────┘   (Admin & Public)│  & Storage   │
                                   └──────────────┘
```

* **Edge Function (`index.ts`)**: Webhook エンドポイント。署名検証 → イベント種別によるハンドリング。
* **Flex/QuickReply (`flexTemplates.ts`, `quickActions.ts`)**: ユーザー体験を向上させるテンプレート群。
* **Database**: PostGIS 拡張付き PostgreSQL 17 (行レベルセキュリティ有効)。
* **Storage**: バケット `post-images` に最適化済み JPEG を格納。

---

## 3️⃣ データモデリング

### 3.1 users
| 列             | 型          | 説明                               |
|----------------|-------------|------------------------------------|
| id (PK)        | uuid        | Auth と連携                         |
| line_user_id   | text uniq   | LINE UID                           |
| display_name   | text        | LINE 表示名                        |
| avatar_url     | text        | LINE プロフィール画像 URL          |

### 3.2 post_sessions (ステートマシン)
| 列              | 型          | 説明                                 |
|-----------------|-------------|--------------------------------------|
| id (PK)         | uuid        |                                      |
| user_id (FK)    | uuid        | `users.id`                           |
| line_user_id    | text        | 同上 (検索高速化用)                  |
| status          | text        | `photo_pending` / `gps_pending` / `comment_pending` / `completed` / `cancelled` |
| temp_image_url  | text        | Storage 仮 URL                       |
| temp_latitude   | double      |                                      |
| temp_longitude  | double      |                                      |
| temp_comment    | text        |                                      |
| created_at      | timestamptz |                                      |
| updated_at      | timestamptz |                                      |
| expires_at      | timestamptz | TTL 管理 (例: 30分)                  |

### 3.3 posts
| 列            | 型          | 説明                    |
|---------------|-------------|-------------------------|
| id (PK)       | uuid        |                         |
| user_id (FK)  | uuid        | 投稿者                   |
| image_url     | text        | Storage 公開 URL        |
| latitude      | double      |                         |
| longitude     | double      |                         |
| comment       | text null   |                         |
| created_at    | timestamptz |                         |

---

## 4️⃣ 環境変数 (.env)

```bash
# Supabase
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=pk_xxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=service_role_xxxxxxxxx
# LINE
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxx
# オプション
IMAGE_BUCKET=post-images # 変更する場合のみ
```

> Supabase Free プランでは Edge Functions ごとに 3 つの環境変数枠があります。多い場合は暗号化 Secret へ移動してください。

---

## 5️⃣ エッジ関数ロジック概要 (`index.ts`)

1. **署名検証**: `x-line-signature` ヘッダを HMAC-SHA256 で確認。
2. **ユーザー同期**: `ensureUser()` で `users` と Supabase Auth を自動作成/更新。
3. **セッション取得 / 作成**:
   * 新規 `post` コマンドで `photo_pending` セッションを作成。
   * 既存セッションがあれば状態に応じて処理を分岐。
4. **写真受領**:
   * LINE コンテンツ API からバイナリ取得 → JPEG 圧縮 → `post-images` にアップロード。
   * `gps_pending` へ遷移し、位置情報要求 Flex＋QuickReply を送信。
5. **位置情報受領**:
   * `comment_pending` へ遷移し、コメント入力を QuickReply (`💬 コメントなし`) と併せて要求。
6. **コメントまたはスキップ**:
   * `completed` へ遷移。`posts` テーブルへ INSERT。
   * 完了 Flex と最新投稿プレビュー (`buildLatestPostFlex`) を返信。
7. **キャンセル**: ユーザーが `キャンセル` と送ると `cancelled` に遷移しガイドを返す。

---

## 6️⃣ デプロイ & テスト手順

### 6.1 Supabase CLI
```bash
supabase link --project-ref <PROJECT_REF>
# Edge Function デプロイ
supabase functions deploy line-webhook --no-verify-jwt
# DB マイグレーション
supabase db push
```

### 6.2 LINE Developers Console
1. Messaging API チャネルを作成。
2. Webhook URL に `https://<PROJECT_REF>.functions.supabase.co/line-webhook` を設定。
3. Webhook を **有効化**。
4. 短期テストには `ngrok` + `supabase functions serve` も可。

### 6.3 動作確認
```bash
# ローカル
supabase functions serve line-webhook --env-file ./supabase/.env.local
# 別ターミナルで ngrok
ngrok http 54321
```

---

## 7️⃣ セキュリティ & 運用

| 項目                     | 対策                                                   |
|--------------------------|--------------------------------------------------------|
| 行レベルセキュリティ(RLS)| `posts`, `post_sessions` は `user_id = auth.uid()` 制限 |
| バケット公開範囲         | `public/read` もしくは CDN 署名 URL を推奨              |
| Edge Function 権限       | 書き込みは Service Role Key 利用 (環境変数で限定)      |
| 署名検証                 | リクエスト毎に必ず検証し、失敗時は 403 応答            |
| TTL                      | `expires_at` で未完了セッションをクリーンアップ        |

---

## 8️⃣ 再現手順 (Cursor プロンプト用テンプレート)

Cursor に以下を貼り付けると**ゼロから再現**できます。

```cursor
# 1. プロジェクト初期化
mkdir line-photo-post-bot && cd $_

# 2. Supabase セットアップ
supabase init
supabase link --project-ref <PROJECT_REF>
cp ../path/to/migrations/*.sql supabase/migrations/

# 3. Edge Function コード配置
mkdir -p supabase/functions/line-photo-post-bot
# index.ts, flexTemplates.ts, quickActions.ts を作成 (下記コードを展開)
# ...（コードはこの README 直下に配置）

# 4. env 設定
cat <<'EOF' > supabase/.env.local
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_ANON_KEY=pk_...
SUPABASE_SERVICE_ROLE_KEY=service_role_...
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
EOF

# 5. デプロイ
supabase db push
supabase functions deploy line-photo-post-bot --no-verify-jwt
```

---

## 9️⃣ 付録: ファイル構成 (推奨)

```
supabase/
  └─ functions/
      └─ line-photo-post-bot/
          ├─ index.ts
          ├─ flexTemplates.ts
          ├─ quickActions.ts
          └─ README.md   ← 本ファイル
```

---

### 📌 更新履歴
| 日付 | 変更内容 |
|------|-----------|
| 2025-08-02 | 仕様書初版作成 | 