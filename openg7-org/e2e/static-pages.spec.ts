import './setup';
import { expect, test } from '@playwright/test';

interface PageExpectation {
  readonly linkSelector: string;
  readonly urlPart: string;
  readonly pageAttr: string;
  readonly headings: readonly string[];
}

const staticPages: readonly PageExpectation[] = [
  {
    linkSelector: '[data-og7="footer-link-credits"]',
    urlPart: '/credits',
    pageAttr: 'credits',
    headings: ['An ecosystem built together', 'Un ecosysteme construit ensemble', 'pages.credits.title'],
  },
  {
    linkSelector: '[data-og7="footer-link-faq"]',
    urlPart: '/faq',
    pageAttr: 'faq',
    headings: ['Frequently asked questions', 'Foire aux questions', 'pages.faq.title'],
  },
  {
    linkSelector: '[data-og7="footer-link-terms"]',
    urlPart: '/terms',
    pageAttr: 'terms',
    headings: ['Terms of Service', "Conditions d'utilisation", 'pages.terms.title'],
  },
  {
    linkSelector: '[data-og7="footer-link-privacy"]',
    urlPart: '/privacy',
    pageAttr: 'privacy',
    headings: ['Privacy policy', 'Politique de confidentialite', 'pages.privacy.title'],
  },
  {
    linkSelector: '[data-og7="footer-link-legal"]',
    urlPart: '/legal',
    pageAttr: 'legal',
    headings: ['Legal notice', 'Mentions legales', 'pages.legal.title'],
  },
];

const normalizeHeading = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

test.describe('Static informational pages', () => {
  for (const pageExpectation of staticPages) {
    test(`navigates to ${pageExpectation.pageAttr} page from the footer`, async ({ page }) => {
      await page.goto('/');
      await page.locator(pageExpectation.linkSelector).click();
      await page.waitForURL(`**${pageExpectation.urlPart}`);

      const container = page.locator(`[data-og7-page="${pageExpectation.pageAttr}"]`);
      await expect(container).toBeVisible();

      const heading = container.locator('h1');
      await expect(heading).toBeVisible();
      const normalized = normalizeHeading((await heading.innerText()).trim());

      expect(
        pageExpectation.headings.some((expected) => {
          const normalizedExpected = normalizeHeading(expected);
          return normalized.includes(normalizedExpected);
        }),
      ).toBeTruthy();
    });
  }
});
