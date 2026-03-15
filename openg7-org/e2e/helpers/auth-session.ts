import { expect, type Locator, type Page } from '@playwright/test';

export interface E2eAuthProfile {
  id: string;
  email: string;
  roles: string[];
  firstName: string;
  lastName: string;
  accountStatus?: 'active' | 'emailNotConfirmed' | 'disabled';
  premiumActive?: boolean;
  premiumPlan?: string | null;
  notificationPreferences: {
    emailOptIn: boolean;
    webhookUrl: string | null;
  };
}

const DEFAULT_PROFILE: E2eAuthProfile = {
  id: 'e2e-user-1',
  email: 'e2e.user@openg7.test',
  roles: ['editor'],
  firstName: 'E2E',
  lastName: 'User',
  accountStatus: 'active',
  premiumActive: true,
  premiumPlan: 'analyst',
  notificationPreferences: {
    emailOptIn: false,
    webhookUrl: null,
  },
};

export async function mockAuthenticatedSessionApis(
  page: Page,
  profile: E2eAuthProfile = DEFAULT_PROFILE
): Promise<void> {
  await page.route('**/api/sectors**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/provinces**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/companies**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/auth/local**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: profile,
      }),
    });
  });

  await page.route('**/api/users/me**', async route => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'GET') {
      if (path.endsWith('/saved-searches') || path.includes('/saved-searches/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      if (path.endsWith('/favorites') || path.includes('/favorites/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
          return;
      }

      if (path.endsWith('/alerts') || path.includes('/alerts/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
          return;
      }

      if (path.endsWith('/profile/export')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            exportedAt: '2026-03-14T10:00:00.000Z',
            formatVersion: 1,
            account: profile,
            favorites: [],
            savedSearches: [],
            alerts: [],
          }),
        });
        return;
      }

      if (path.endsWith('/profile/sessions') || path.includes('/profile/sessions/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version: 1,
            sessions: [],
          }),
        });
        return;
      }
    }

    if (method === 'POST' && path.endsWith('/profile/email-change')) {
      const payload = (request.postDataJSON?.() ?? {}) as { email?: string };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: payload.email ?? 'updated.user@openg7.test',
          sent: true,
          accountStatus: 'active',
        }),
      });
      return;
    }

    if (method === 'POST' && path.endsWith('/profile/sessions/logout-others')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
          user: profile,
          sessionsRevoked: 0,
          sessionVersion: 1,
          sessions: [],
        }),
      });
      return;
    }

    if (method === 'PUT' && path.endsWith('/profile')) {
      const payload = (request.postDataJSON?.() ?? {}) as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...profile,
          ...payload,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profile),
    });
  });

  await page.route('**/api/auth/change-password**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jwt: 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature',
        user: profile,
      }),
    });
  });

  await page.route('**/api/upload**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, url: '/uploads/e2e-avatar.png' }]),
    });
  });
}

export async function seedAuthenticatedSession(
  page: Page,
  profile: E2eAuthProfile = DEFAULT_PROFILE
): Promise<void> {
  const jwt = 'header.eyJleHAiOjQxMDI0NDQ4MDB9.signature';
  const hasSubtleCrypto = await page.evaluate(() => Boolean(window.crypto?.subtle));
  if (!hasSubtleCrypto) {
    await page.goto('/');
  }
  await page.evaluate(
    async ({ seededProfile, seededJwt }) => {
      const keyStorageKey = 'auth_crypto_key';
      const tokenStorageKey = 'auth_token';
      const userCacheKey = 'auth_user_cache_v1';
      const ivLength = 12;

      const toBase64 = (bytes: Uint8Array): string => {
        let binary = '';
        const chunkSize = 0x8000;
        for (let index = 0; index < bytes.length; index += chunkSize) {
          binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
        }
        return btoa(binary);
      };

      const keyMaterial = crypto.getRandomValues(new Uint8Array(32));
      const cryptoKey = await crypto.subtle.importKey('raw', keyMaterial, 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(ivLength));
      const plaintext = new TextEncoder().encode(seededJwt);
      const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext);
      const cipherBytes = new Uint8Array(cipherBuffer);
      const payload = new Uint8Array(iv.length + cipherBytes.length);
      payload.set(iv, 0);
      payload.set(cipherBytes, iv.length);

      window.localStorage.setItem(keyStorageKey, toBase64(keyMaterial));
      window.localStorage.setItem(
        tokenStorageKey,
        JSON.stringify({
          cipher: toBase64(payload),
          expiresAt: 4102444800000,
          createdAt: Date.now(),
        })
      );
      window.localStorage.setItem(userCacheKey, JSON.stringify(seededProfile));
    },
    { seededProfile: profile, seededJwt: jwt }
  );
}

export async function loginAsAuthenticatedE2eUser(
  page: Page,
  redirect = '/profile'
): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  const loginForm = page.locator('form[data-og7="auth-login"]');
  await expect(loginForm).toBeVisible();
  const emailField = loginForm.locator('#auth-login-email');
  const passwordField = loginForm.locator('#auth-login-password');
  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  await expect(emailField).toBeEditable();
  await expect(passwordField).toBeEditable();

  await fillInputStable(emailField, 'e2e.user@openg7.test');
  await fillInputStable(passwordField, 'StrongPass123!');

  const submitButton = loginForm.locator('[data-og7="auth-login-submit"]');
  await expect(submitButton).toBeEnabled();
  const authResponse = page.waitForResponse(response =>
    response.url().includes('/api/auth/local') && response.request().method().toUpperCase() === 'POST'
  );
  await submitButton.click();
  await authResponse;

  await page.waitForFunction(() => {
    try {
      return Boolean(
        window.localStorage.getItem('auth_user_cache_v1') ||
        window.sessionStorage.getItem('auth_user_cache_v1')
      );
    } catch {
      return false;
    }
  });

  try {
    await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/, { timeout: 5000 });
  } catch {
    await page.goto(redirect);
    await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/, { timeout: 15000 });
  }
}

async function fillInputStable(locator: Locator, value: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await locator.click();
    await locator.fill(value);
    try {
      await expect(locator).toHaveValue(value, { timeout: 1000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }
}
