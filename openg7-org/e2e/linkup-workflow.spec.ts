import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser } from './helpers/auth-session';
import { mockConnectionsApis, mockProfileAndFavoritesApis } from './helpers/domain-mocks';

test.describe('Linkup workflow', () => {
  test('saves internal notes and status changes from detail view, then keeps them visible in history', async ({
    page,
  }) => {
    await mockProfileAndFavoritesApis(page);
    await mockConnectionsApis(page);

    await loginAsAuthenticatedE2eUser(page, '/linkups');
    await expect(page.locator('[data-og7="linkup-history-page"]')).toBeVisible();

    await page.locator('.og7-linkup-history__action').first().click();
    await expect(page).toHaveURL(/\/linkups\/lkp-001$/);
    await expect(page.locator('[data-og7="linkup-detail-page"]')).toBeVisible();

    const noteText = 'Partner confirmed the revised meeting slot.';
    await page.locator('[data-og7-id="linkup-note-input"]').fill(noteText);

    const [saveNoteRequest, saveNoteResponse] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method().toUpperCase() === 'PATCH' &&
          /\/api\/connections\/lkp-001\/status\/?$/i.test(new URL(request.url()).pathname)
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PATCH' &&
          /\/api\/connections\/lkp-001\/status\/?$/i.test(new URL(response.url()).pathname)
      ),
      page.locator('[data-og7-id="linkup-note-save"]').click(),
    ]);

    expect(saveNoteResponse.status()).toBe(200);
    expect(saveNoteRequest.postDataJSON()).toEqual({
      data: {
        status: 'inDiscussion',
        note: noteText,
      },
    });
    await expect(page.locator('[data-og7-id="linkup-note-input"]')).toHaveValue('');
    await expect(page.locator('.og7-linkup-detail__note').first()).toContainText(noteText);

    await page.locator('[data-og7-id="linkup-status-select"]').selectOption({ index: 1 });
    await expect(page.locator('[data-og7-id="linkup-status-save"]')).toBeEnabled();

    const [saveStatusRequest, saveStatusResponse] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.method().toUpperCase() === 'PATCH' &&
          /\/api\/connections\/lkp-001\/status\/?$/i.test(new URL(request.url()).pathname)
      ),
      page.waitForResponse(
        (response) =>
          response.request().method().toUpperCase() === 'PATCH' &&
          /\/api\/connections\/lkp-001\/status\/?$/i.test(new URL(response.url()).pathname)
      ),
      page.locator('[data-og7-id="linkup-status-save"]').click(),
    ]);

    expect(saveStatusResponse.status()).toBe(200);
    expect(saveStatusRequest.postDataJSON()).toEqual({
      data: {
        status: 'completed',
      },
    });
    await expect(page.locator('[data-og7="linkup-detail-page"] .og7-linkup-status--completed')).toBeVisible();

    await page.locator('.og7-linkup-detail__back').click();
    await expect(page).toHaveURL(/\/linkups$/);
    await expect(page.locator('[data-og7="linkup-history-page"]')).toBeVisible();
    await expect(
      page.locator('.og7-linkup-history__table tbody tr').first().locator('.og7-linkup-status--completed')
    ).toBeVisible();

    await page.locator('.og7-linkup-history__action').first().click();
    await expect(page.locator('[data-og7="linkup-detail-page"]')).toBeVisible();
    await expect(page.locator('.og7-linkup-detail__note').first()).toContainText(noteText);
    await expect(page.locator('[data-og7="linkup-detail-page"] .og7-linkup-status--completed')).toBeVisible();
  });
});
