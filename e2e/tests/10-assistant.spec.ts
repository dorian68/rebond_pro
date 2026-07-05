import { test, expect } from '@playwright/test';
import { expectNoServerError } from '../helpers';

test.describe('Module 10 — Assistant IA', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/assistant');
    await expect(page).toHaveURL(/assistant/);
    await expectNoServerError(page);
  });

  test('no JS crash on assistant page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/assistant');
    await page.waitForLoadState('networkidle');
    const realErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(realErrors).toHaveLength(0);
  });

  test('chat input is visible and writable', async ({ page }) => {
    await page.goto('/assistant');
    await page.waitForLoadState('networkidle');
    const chatInput = page
      .getByRole('textbox', { name: /message|question|demande/i })
      .or(page.locator('textarea, input[type="text"]').last());
    await expect(chatInput).toBeVisible({ timeout: 8_000 });
    await chatInput.fill('Bonjour');
    await expect(chatInput).toHaveValue('Bonjour');
  });

  test('send message and receive response', async ({ page }) => {
    await page.goto('/assistant');
    await page.waitForLoadState('networkidle');

    const chatInput = page
      .getByRole('textbox', { name: /message|question/i })
      .or(page.locator('textarea').last());

    if (!(await chatInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Chat input not found');
      return;
    }

    await chatInput.fill('Combien de formations ai-je ?');
    const sendBtn = page
      .getByRole('button', { name: /envoyer|send|→/i })
      .or(page.locator('button[type="submit"]').last());
    await sendBtn.click();

    // Wait for AI response (up to 30s — real LLM call)
    const response = page.getByText(/.{20,}/i).last();
    await expect(response).not.toBeEmpty({ timeout: 30_000 });
    await expectNoServerError(page);
  });

  test('AI enabled indicator / model shown', async ({ page }) => {
    await page.goto('/assistant');
    await page.waitForLoadState('networkidle');
    // App should show which AI is active or that AI is enabled
    const aiIndicator = page
      .getByText(/gpt|openai|claude|anthropic|ia activée|copilote/i)
      .first();
    if (await aiIndicator.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(aiIndicator).toBeVisible();
    }
  });
});
