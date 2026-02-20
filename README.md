# 社内教育システム（999_yado_education）

Laravel API + React SPA で構成した社内教育システムです。  
Docker Compose でローカル起動し、招待制認証・コース/レッスン管理・提出/レビュー・自動判定を確認できます。

## ディレクトリ構成

- `backend`: Laravel API（Sanctum Cookie認証 / Queue / Judge連携）
- `frontend`: React + TypeScript + Vite
- `infra`: Docker Compose / Dockerfile / 初期化スクリプト
- `docs`: 要件・設計・運用ドキュメント（日本語）

## 前提ソフトウェア

- Docker / Docker Compose
- `lsof`（ポート競合確認に使用）

## クイックスタート（推奨）

### 1. ルートへ移動

```bash
cd <このリポジトリを配置したパス>/999_yado_education
PROJECT_ROOT=$(pwd)
```

### 2. `.env` を自動生成（ポート競合を回避）

```bash
"$PROJECT_ROOT"/infra/scripts/setup-local-env.sh
```

このコマンドで以下が生成されます。

- `infra/.env`
- `backend/.env`
- `frontend/.env`

### 3. コンテナ起動

```bash
cd "$PROJECT_ROOT"/infra
docker compose up -d --build
```

### 4. 初期データ投入（初回 or 更新時）

```bash
cd "$PROJECT_ROOT"/infra
docker compose exec backend php artisan db:seed
```

DBを作り直したい場合:

```bash
cd "$PROJECT_ROOT"/infra
docker compose exec backend php artisan migrate:fresh --seed
```

## アクセス先

ポートは `./infra/scripts/setup-local-env.sh` が空きポートを自動選択します。  
まずは以下で実際の割り当てを確認してください。

```bash
grep '_HOST_PORT' "$PROJECT_ROOT"/infra/.env
```

既定値（未競合時）の例:

- Frontend: `http://localhost:15183`
- Backend API: `http://localhost:8000`
- Mailpit UI: `http://localhost:8025`
- MinIO API: `http://localhost:19000`
- MinIO Console: `http://localhost:19001`

## ログイン（開発用シード）

- 管理者: `admin@test.com / password`
- レビュアー: `reviewer@example.com / password`
- 受講者: `user@example.com / password`

ログインURL:

- `http://localhost:15183/login`（Frontendポートが変更された場合は読み替え）

## Sequel Ace 接続情報（ローカルDB）

接続先は `infra/.env` の値を使用します。既定値は以下です。

- Host: `127.0.0.1`
- Port: `13316`
- Database: `yado_education`
- User: `yado`
- Password: `secret`

確認コマンド:

```bash
grep -E 'MYSQL_HOST_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD' "$PROJECT_ROOT"/infra/.env
```

## よく使う運用コマンド

起動状態確認:

```bash
cd "$PROJECT_ROOT"/infra
docker compose ps
```

ログ確認:

```bash
cd "$PROJECT_ROOT"/infra
docker compose logs -f backend frontend queue-worker
```

停止:

```bash
cd "$PROJECT_ROOT"/infra
docker compose down
```

DB/MinIOボリュームを含めて完全初期化:

```bash
cd "$PROJECT_ROOT"/infra
docker compose down -v
```

## ドキュメント

詳細仕様は `docs` を参照してください。

- `docs/要件定義.md`
- `docs/環境構築手順.md`
- `docs/システム構成設計.md`
- `docs/データベース設計.md`
- `docs/API仕様書.md`
- `docs/画面仕様書.md`
- `docs/判定基盤仕様書.md`
- `docs/テスト計画書.md`
- `docs/運用手順書.md`
- `docs/受け入れ基準書.md`
