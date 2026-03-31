import './setup';
import { expect, test } from '@playwright/test';

import { mockAuthenticatedSessionApis, seedAuthenticatedSession } from './helpers/auth-session';

interface FeedApiItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: 'REQUEST';
  sectorId: string | null;
  title: string;
  summary: string;
  fromProvinceId: string | null;
  toProvinceId: string | null;
  mode: 'IMPORT';
  tags: string[];
  originType: 'alert';
  originId: string;
  source: {
    kind: 'USER';
    label: string;
  };
  status: 'confirmed';
}

const e2eOrigin = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4300';

test.describe('Feed publish panel', () => {
  test('publishes a prefilled exchange, clears the draft URL, and persists after reload', async ({ page }) => {
    const publishedItems: FeedApiItem[] = [];
    const corsHeaders = {
      'access-control-allow-origin': e2eOrigin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type, Idempotency-Key, Authorization',
    };

    await page.addInitScript(() => {
      class ConnectedEventSource {
        onopen = null;
        onerror = null;
        onmessage = null;

        constructor(_url: string) {
          setTimeout(() => {
            this.onopen?.(new Event('open'));
          }, 0);
        }

        close(): void {
          // No-op in tests.
        }
      }

      (window as Window & { EventSource?: typeof EventSource }).EventSource = ConnectedEventSource as unknown as typeof EventSource;
    });

    await page.route('**/runtime-config.js', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.__OG7_CONFIG__ = {
          FEATURE_FLAGS: {
            feedMocks: false,
            homeFeedMocks: false
          }
        };`,
      });
    });

    await mockAuthenticatedSessionApis(page);
    await seedAuthenticatedSession(page);

    await page.route('**/api/sectors', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'energy', name: 'Energy' }],
        }),
      });
    });

    await page.route('**/api/provinces', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'on', name: 'Ontario' },
            { id: 'qc', name: 'Quebec' },
          ],
        }),
      });
    });

    await page.route('**/api/feed**', async route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname !== '/api/feed') {
        await route.fallback();
        return;
      }
      const method = request.method().toUpperCase();

      if (method === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
        return;
      }

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            data: publishedItems,
            cursor: null,
          }),
        });
        return;
      }

      if (method === 'POST') {
        const payload = request.postDataJSON() as {
          type: 'REQUEST';
          sectorId: string | null;
          title: string;
          summary: string;
          fromProvinceId: string | null;
          toProvinceId: string | null;
          mode: 'IMPORT';
          tags?: string[];
          originType: 'alert';
          originId: string;
        };
        const created: FeedApiItem = {
          id: `feed-item-${publishedItems.length + 1}`,
          createdAt: '2026-03-17T10:00:00.000Z',
          updatedAt: '2026-03-17T10:00:00.000Z',
          type: payload.type,
          sectorId: payload.sectorId,
          title: payload.title,
          summary: payload.summary,
          fromProvinceId: payload.fromProvinceId ?? null,
          toProvinceId: payload.toProvinceId ?? null,
          mode: payload.mode,
          tags: payload.tags ?? [],
          originType: payload.originType,
          originId: payload.originId,
          source: {
            kind: 'USER',
            label: 'E2E User',
          },
          status: 'confirmed',
        };
        publishedItems.unshift(created);
        await route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            data: created,
          }),
        });
        return;
      }

      await route.fallback();
    });

    const title = 'Winter balancing support';
    const summary = 'Cross-border balancing support required after the weather alert.';
    await page.goto(
      `/feed?draftSource=alert&draftAlertId=alert-001&draftOriginType=alert&draftOriginId=alert-001&draftType=REQUEST&draftMode=IMPORT&draftSectorId=energy&draftFromProvinceId=on&draftToProvinceId=qc&draftTitle=${encodeURIComponent(title)}&draftSummary=${encodeURIComponent(summary)}&draftTags=linked-alert,grid`
    );

    await expect(page.locator('[data-og7="feed-publish-drawer"]')).toBeVisible();
    await expect(page.locator('#composer-title')).toHaveValue(title);
    await expect(page.locator('#composer-summary')).toHaveValue(summary);

    const publishResponse = page.waitForResponse(response =>
      response.url().includes('/api/feed') && response.request().method().toUpperCase() === 'POST'
    );
    await page.locator('.feed-composer__submit').click();
    await publishResponse;

    await expect(page.locator('[data-og7="feed-publish-drawer"]')).toBeHidden();
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.locator('.feed-card__title', { hasText: title })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.locator('.feed-card__title', { hasText: title })).toBeVisible();
  });
});
