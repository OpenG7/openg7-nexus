import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis, seedAuthenticatedSession } from './helpers/auth-session';

test.describe('Feed alert detail', () => {
  test('redirects anonymous users to login when subscribing from alert detail', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/feed/alerts/alert-001');
    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001/);

    await page.locator('[data-og7-id="alert-subscribe"]').click();

    await expect(page).toHaveURL(/\/login\?redirect=%2Ffeed%2Falerts%2Falert-001$/);
  });

  test('renders alert details with report flow and related links', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/feed/alerts/alert-001');
    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001/);

    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-detail-header"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-detail-body"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-context-aside"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-share"]').click();
    await page.locator('[data-og7-id="alert-report-update"]').click();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeVisible();
    await page.locator('[data-og7="alert-update-field"][data-og7-id="summary"]').fill(
      'Transmission icing confirmed by the latest operator update.'
    );
    await page.locator('[data-og7="alert-update-field"][data-og7-id="source-url"]').fill(
      'https://example.com/operator-update'
    );
    await page.locator('[data-og7-id="alert-update-submit"]').click();
    await expect(page.locator('[data-og7="alert-update-status"][data-og7-id="success"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();
    await expect(page.locator('[data-og7-id="alert-view-my-report"]')).toBeVisible();
    await expect(page.locator('[data-og7-id="alert-report-update-another"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-view-my-report"]').click();
    await expect(page.locator('[data-og7="alert-update-report-view"]')).toBeVisible();
    await expect(page.locator('[data-og7="alert-update-report-status"][data-og7-id="pending"]')).toBeVisible();

    await page.locator('[data-og7-id="alert-update-view-close"]').click();
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();

    await page.locator('[data-og7-id="alert-report-update-another"]').click();
    await expect(page.locator('[data-og7="alert-update-field"][data-og7-id="summary"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-og7="alert-update-drawer"]')).toBeHidden();

    await page.locator('[data-og7="alert-related-opportunities"] ul li button').first().click();
    await expect(page).toHaveURL(/\/feed\/opportunities\/[^/]+$/);
  });

  test('persists an authenticated alert subscription across reloads', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);
    await page.goto('/feed/alerts/alert-001');

    const subscribeButton = page.locator('[data-og7-id="alert-subscribe"]');
    await expect(subscribeButton).toHaveText(/S'abonner|Subscribe/i);
    await expect(subscribeButton).toBeEnabled();

    await subscribeButton.click();

    await expect(subscribeButton).toHaveText(/Abonne|Subscribed/i);
    await expect(subscribeButton).toBeDisabled();

    await page.reload();
    await expect(page.locator('[data-og7-id="alert-subscribe"]')).toHaveText(/Abonne|Subscribed/i);
    await expect(page.locator('[data-og7-id="alert-subscribe"]')).toBeDisabled();
  });

  test('opens the linked opportunity composer directly from the alert CTA', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);
    await page.goto('/feed/alerts/alert-001');

    await page.locator('[data-og7-id="alert-create-opportunity"]').click();

    await expect(page).toHaveURL(/\/feed\?.*draftSource=alert/);
    await expect(page).toHaveURL(/draftOriginType=alert/);
    await expect(page).toHaveURL(/draftOriginId=alert-001/);
    await expect(page.locator('[data-og7="feed-publish-drawer"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-composer"]')).toBeVisible();
    await expect(page.locator('#composer-title')).not.toHaveValue('');
    await expect(page.locator('#composer-summary')).not.toHaveValue('');
    await expect(page.locator('#composer-type')).toHaveValue(/REQUEST$/);
  });

  test('shows a success toast when the linked opportunity draft opens successfully', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/feed/alerts/alert-001');

    await page.locator('[data-og7-id="alert-create-opportunity"]').click();

    await expect(page).toHaveURL(/\/feed\?.*draftSource=alert/);
    await expect(page.locator('[data-og7="feed-publish-drawer"]')).toBeVisible();
    await expect(page.locator('[data-og7="feed-composer-auth-gate"]')).toBeVisible();
    await expect(page.locator('[data-og7="notification-toast"][data-og7-id="success"]')).toContainText(
      /Le brouillon d'opportunite liee est pret dans le fil\.|The linked opportunity draft is ready in the feed\./i
    );
  });

  test('shows an error toast when linked opportunity navigation fails', async ({ page }) => {
    await mockAuthenticatedSessionApis(page);
    await page.goto('/feed/alerts/alert-001');

    await page.evaluate(() => {
      const failNavigation = () => {
        throw new Error('e2e-forced-navigation-failure');
      };
      window.history.pushState = failNavigation as History['pushState'];
    });

    await page.locator('[data-og7-id="alert-create-opportunity"]').click();

    await expect(page).toHaveURL(/\/feed\/alerts\/alert-001$/);
    await expect(page.locator('[data-og7="alert-detail-page"]')).toBeVisible();
    await expect(
      page
        .locator('[data-og7="notification-toast"][data-og7-id="error"]')
        .filter({
          hasText:
            /Impossible de preparer l'opportunite liee\. Veuillez reessayer\.|Unable to prepare the linked opportunity\. Please try again\./i,
        })
    ).toBeVisible();
  });
});


