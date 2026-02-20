# API仕様書

## 1. 認証
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## 2. 招待
- `POST /api/invitations/accept`
- `GET /api/admin/invitations`
- `POST /api/admin/invitations`
  - `role=user` の場合は `label_id` 必須

## 3. コース
- `GET /api/categories`
- `GET /api/categories/{category}/sections`
- `GET /api/sections/{section}`
- `POST /api/sections/{section}/hints/{hintOrder}/open`

## 4. 提出
- `POST /api/sections/{section}/judge-runs`
- `POST /api/sections/{section}/submissions`
- `GET /api/me/submissions`
- `GET /api/submissions/{submission}`

## 5. レビュー
- `GET /api/reviews/pending-users`
- `GET /api/reviews/pending`
- `GET /api/reviews/pending?user_id={userId}&per_page={n}`
- `POST /api/submissions/{submission}/reviews`

## 6. ダッシュボード
- `GET /api/me/dashboard`
- `GET /api/reviewer/dashboard`
- `GET /api/admin/dashboard`

## 7. 管理API
- `api/admin/categories*`
- `api/admin/sections*`
- `api/admin/users*`
- `api/admin/labels*`
- `POST /api/admin/users/{user}/labels`
- `POST /api/admin/labels/{label}/assign`

## 8. ファイル
- `GET /api/pdfs/{sectionPdf}`: 署名付きURLを返却

## 9. 備考
- 主要APIは `auth:sanctum` + `active` ミドルウェア配下。
- ロール制御は `role` ミドルウェアで実施。
