import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('admin panel login page is reachable', async ({ page }) => {
    await page.goto('/admin')

    // Unauthenticated requests redirect to /admin/login
    await expect(page).toHaveURL(/\/admin(\/login)?/)

    // The Payload login form should render
    const emailField = page.locator('input[id="field-email"]')
    await expect(emailField).toBeVisible()
  })
})
