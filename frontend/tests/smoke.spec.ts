import { expect, test } from '@playwright/test'

test('ログイン画面が表示される', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: '社内教育システム' })).toBeVisible()
})
