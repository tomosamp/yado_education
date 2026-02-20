import { expect, type Page, test } from '@playwright/test'

type Role = 'user' | 'reviewer'

const quickLoginLabelByRole: Record<Role, string> = {
  user: '受講者でログイン',
  reviewer: 'レビュー担当でログイン',
}

const autojudgeCode = `<?php
$line = trim((string) fgets(STDIN));
[$a, $b] = array_map('intval', explode(' ', $line));
echo ($a + $b) . PHP_EOL;
`

async function quickLogin(page: Page, role: Role) {
  await page.goto('/login')
  await page.getByRole('button', { name: quickLoginLabelByRole[role] }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible()
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'ログアウト' }).click()
  await expect(page.getByRole('heading', { name: '社内教育システム' })).toBeVisible()
}

async function openAutojudgeSection(page: Page) {
  await page.getByRole('link', { name: 'コース' }).click()
  await expect(page).toHaveURL(/\/curriculum$/)

  await page.getByRole('link', { name: '詳細を見る' }).first().click()
  await expect(page.getByRole('heading', { name: '足し算問題' })).toBeVisible()
}

async function runJudgeAndSubmit(page: Page) {
  await page.getByPlaceholder('ここにコードを入力').fill(autojudgeCode)
  await page.getByRole('button', { name: '実行して判定' }).click()
  await expect(page.getByText('passed: true')).toBeVisible({ timeout: 20000 })

  await page.getByRole('button', { name: '提出する' }).click()
  await expect(page.getByText('現在の状態: レビュー待ち')).toBeVisible({ timeout: 15000 })
}

async function openPendingReview(page: Page) {
  await page.getByRole('link', { name: 'レビュー待ち' }).click()
  await expect(page.getByRole('heading', { name: 'レビュー待ちユーザー一覧' })).toBeVisible()
}

async function reviewLatestSubmission(page: Page, decision: '差戻し' | '合格') {
  const userCard = page
    .locator('div.rounded-xl.border')
    .filter({ hasText: '受講者ユーザー' })
    .first()

  await expect(userCard).toBeVisible({ timeout: 15000 })
  await userCard.getByRole('button', { name: 'レッスン一覧を見る' }).click()

  await expect(page.getByRole('heading', { name: /レビュー待ちレッスン/ })).toBeVisible({
    timeout: 15000,
  })

  const sectionCard = page.locator('div.rounded-xl.border').filter({ hasText: '足し算問題' }).first()
  await expect(sectionCard).toBeVisible({ timeout: 15000 })
  await sectionCard.getByRole('button', { name: 'レビューする' }).click()

  await expect(page.getByRole('heading', { name: '提出レビュー' })).toBeVisible({ timeout: 15000 })
  await page
    .getByPlaceholder('レビューコメント（必須）')
    .fill(`E2E ${decision} ${new Date().toISOString()}`)

  await page.getByRole('button', { name: decision }).click()
  await expect(page.getByText('レビューを保存しました。')).toBeVisible({ timeout: 10000 })
}

test('受講者提出→差戻し→再提出→合格の導線が動作する', async ({ page }) => {
  await quickLogin(page, 'user')
  await openAutojudgeSection(page)
  await runJudgeAndSubmit(page)
  await logout(page)

  await quickLogin(page, 'reviewer')
  await openPendingReview(page)
  await reviewLatestSubmission(page, '差戻し')
  await logout(page)

  await quickLogin(page, 'user')
  await openAutojudgeSection(page)
  await expect(page.getByText('現在の状態: やり直し')).toBeVisible({ timeout: 15000 })
  await runJudgeAndSubmit(page)
  await logout(page)

  await quickLogin(page, 'reviewer')
  await openPendingReview(page)
  await reviewLatestSubmission(page, '合格')
  await logout(page)

  await quickLogin(page, 'user')
  await openAutojudgeSection(page)
  await expect(page.getByText('現在の状態: 合格')).toBeVisible({ timeout: 15000 })
})
