import './setup';
import { expect, test } from '@playwright/test';

import { loginAsAuthenticatedE2eUser, mockAuthenticatedSessionApis } from './helpers/auth-session';

test.describe('Opportunity offer flow', () => {
  test('submits, tracks, withdraws, and persists an opportunity offer', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await loginAsAuthenticatedE2eUser(page, '/feed/opportunities/request-001');
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001/);

    const openAlertsFromProfileMenu = async () => {
      await page.locator('[data-og7="profile"] > button').click();
      await page.locator('[data-og7-id="alerts"]').first().click();
      await expect(page).toHaveURL(/\/alerts/);
    };

    await page.locator('[data-og7-id="opportunity-make-offer"]').click();
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeVisible();

    await page.locator('[data-og7-id="capacity"]').fill('280');
    await page.locator('[data-og7-id="start-date"]').fill('2026-03-16');
    await page.locator('[data-og7-id="end-date"]').fill('2026-03-30');
    await page.locator('[data-og7-id="pricing-model"]').selectOption('indexed');
    await page.locator('[data-og7-id="comment"]').fill('Indexed import block for the late-winter balancing window.');
    await page.locator('[data-og7-id="attachment"]').setInputFiles({
      name: 'term-sheet.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('offer-term-sheet'),
    });

    await page.locator('[data-og7-id="opportunity-offer-submit"]').click();
    await expect(page.locator('[data-og7="opportunity-offer-drawer"]')).toBeHidden();

    const qna = page.locator('[data-og7="opportunity-qna"]');
    await expect(qna).toContainText(/OG7-OFR-/);
    await expect(qna).toContainText('280 MW');
    await expect(qna).toContainText('indexed');
    await expect(qna).toContainText('term-sheet.pdf');

    await expect(page.locator('[data-og7-id="opportunity-make-offer"]')).toHaveAttribute('data-og7-state', 'existing');
    await page.locator('[data-og7-id="opportunity-make-offer"]').click();
    await expect(page).toHaveURL(/\/alerts\?section=offers&offerId=/);

    const offerItem = page.locator('[data-og7="opportunity-offer-item"]').first();
    await expect(offerItem).toBeVisible();
    await expect(offerItem).toContainText('Short-term import of 300 MW');
    await expect(offerItem).toContainText('IESO Ontario');
    await expect(offerItem).toContainText('term-sheet.pdf');
    await expect(offerItem).toContainText(/OG7-OFR-/);
    await expect(offerItem).toHaveAttribute('data-og7-state', 'submitted');
    await expect(offerItem.locator('[data-og7-id="opportunity-offer-last-activity"]')).toContainText(/Tracking active|Suivi active/);

    const thread = offerItem.locator('[data-og7="opportunity-offer-thread"]');
    await expect(thread).toBeVisible();
    await expect(thread.locator('[data-og7="opportunity-offer-activity"]')).toHaveCount(2);
    await expect(thread).toContainText(/Offer sent|Offre envoyee/);
    await expect(thread).toContainText(/Tracking active|Suivi active/);

    await offerItem.locator('[data-og7-id="opportunity-offer-open"]').click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001/);

    await openAlertsFromProfileMenu();
    const offerItemAfterReturn = page.locator('[data-og7="opportunity-offer-item"]').first();
    await offerItemAfterReturn.locator('[data-og7-id="opportunity-offer-withdraw"]').click();
    await expect(offerItemAfterReturn).toHaveAttribute('data-og7-state', 'withdrawn');
    await expect(offerItemAfterReturn.locator('[data-og7-id="opportunity-offer-last-activity"]')).toContainText(/Offer withdrawn|Offre retiree/);
    await offerItemAfterReturn.locator('[data-og7-id="opportunity-offer-toggle-thread"]').click();
    await expect(offerItemAfterReturn.locator('[data-og7="opportunity-offer-activity"]')).toHaveCount(3);
    await expect(offerItemAfterReturn.locator('[data-og7="opportunity-offer-thread"]')).toContainText(/Offer withdrawn|Offre retiree/);

    await page.goto('/feed/opportunities/request-001?refresh=1');
    await expect(page).toHaveURL(/\/feed\/opportunities\/request-001\?refresh=1/);
    await openAlertsFromProfileMenu();
    const persistedOfferItem = page.locator('[data-og7="opportunity-offer-item"]').first();
    await expect(persistedOfferItem).toHaveAttribute('data-og7-state', 'withdrawn');
    await expect(persistedOfferItem).toContainText(/OG7-OFR-/);
    await persistedOfferItem.locator('[data-og7-id="opportunity-offer-toggle-thread"]').click();
    await expect(persistedOfferItem.locator('[data-og7="opportunity-offer-thread"]')).toContainText(/Offer withdrawn|Offre retiree/);
  });
});
