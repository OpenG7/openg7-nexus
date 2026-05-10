#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const routesFilePath = path.resolve(projectRoot, 'prerender-routes.txt');
const outputPath = path.resolve(projectRoot, 'public/sitemap.xml');
const defaultSiteUrl = 'https://www.openg7.org';
const noIndexRoutePrefixes = Object.freeze([
  '/admin',
  '/_dev',
  '/preview',
  '/profile',
  '/pro',
  '/alerts',
  '/favorites',
  '/saved-searches',
  '/companies/register',
  '/importation',
  '/import/companies',
  '/auth/callback',
]);
const companiesPageSize = 100;
const requestTimeoutMs = 5000;
const includeDynamicCompaniesFlag = '--include-dynamic-companies';

dotenv.config({ path: path.resolve(projectRoot, '.env') });

function normalizeBaseUrl(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) {
    return defaultSiteUrl;
  }

  const prefixed = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(prefixed);
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    throw new Error(`Invalid SITE_URL value: "${rawValue}"`);
  }
}

function normalizeApiUrl(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) {
    return null;
  }
  const prefixed = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(prefixed);
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    throw new Error(`Invalid API URL value: "${rawValue}"`);
  }
}

function normalizeRoute(route) {
  const value = route.trim();
  if (!value) {
    return null;
  }
  if (value === '/') {
    return '/';
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function routePriority(route) {
  return route === '/' ? '1.0' : '0.8';
}

function isExcludedRoute(route) {
  for (const prefix of noIndexRoutePrefixes) {
    if (route === prefix || route.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

async function readRoutes() {
  const fileContents = await readFile(routesFilePath, 'utf8');
  const uniqueRoutes = new Set();

  for (const line of fileContents.split(/\r?\n/)) {
    const stripped = line.replace(/#.*/, '');
    const route = normalizeRoute(stripped);
    if (route && !isExcludedRoute(route)) {
      uniqueRoutes.add(route);
    }
  }

  if (!uniqueRoutes.size) {
    throw new Error(`No routes found in ${routesFilePath}`);
  }

  return Array.from(uniqueRoutes);
}

function normalizeBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null) {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
}

function shouldIncludeDynamicCompanies(options = {}) {
  if (typeof options.includeDynamicCompanies === 'boolean') {
    return options.includeDynamicCompanies;
  }
  if (process.argv.includes(includeDynamicCompaniesFlag)) {
    return true;
  }
  return normalizeBoolean(process.env.SITEMAP_INCLUDE_DYNAMIC_COMPANIES, false);
}

function cleanSlug(rawValue) {
  if (typeof rawValue !== 'string') {
    return null;
  }
  const slug = rawValue.trim().replace(/^\/+|\/+$/g, '');
  if (!slug) {
    return null;
  }
  return slug;
}

function extractSlug(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const direct = cleanSlug(entry.slug);
  if (direct) {
    return direct;
  }
  const attributes = entry.attributes;
  if (!attributes || typeof attributes !== 'object') {
    return null;
  }
  return cleanSlug(attributes.slug);
}

function composeCompaniesEndpoint(apiUrl, page) {
  const parsed = new URL(apiUrl);
  const normalizedPath = parsed.pathname.replace(/\/+$/, '');
  const basePath = normalizedPath.endsWith('/api') ? normalizedPath : `${normalizedPath}/api`;

  parsed.pathname = `${basePath}/companies`;
  parsed.search = '';
  parsed.searchParams.set('fields[0]', 'slug');
  parsed.searchParams.set('filters[slug][$notNull]', 'true');
  parsed.searchParams.set('filters[status][$eq]', 'approved');
  parsed.searchParams.set('publicationState', 'live');
  parsed.searchParams.set('sort', 'slug:asc');
  parsed.searchParams.set('pagination[page]', String(page));
  parsed.searchParams.set('pagination[pageSize]', String(companiesPageSize));

  return parsed;
}

async function fetchJsonWithTimeout(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status} for ${url}: ${body || 'request failed'}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDynamicCompanyRoutes(options = {}) {
  if (!shouldIncludeDynamicCompanies(options)) {
    return [];
  }

  const rawApiUrl = options.apiUrl ?? process.env.SITEMAP_API_URL ?? process.env.API_URL;
  const apiUrl = normalizeApiUrl(rawApiUrl);
  if (!apiUrl) {
    console.warn('[sitemap] Dynamic company routes skipped: API_URL is not configured.');
    return [];
  }

  const token = (
    options.apiToken ??
    process.env.SITEMAP_API_TOKEN ??
    process.env.API_TOKEN ??
    ''
  ).trim();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const dynamicRoutes = new Set();

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const endpoint = composeCompaniesEndpoint(apiUrl, page).toString();
      const payload = await fetchJsonWithTimeout(endpoint, headers);
      const data = Array.isArray(payload?.data) ? payload.data : [];

      for (const entry of data) {
        const slug = extractSlug(entry);
        if (!slug) {
          continue;
        }
        const encodedSlug = slug
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/');
        const route = normalizeRoute(`/entreprise/${encodedSlug}`);
        if (route && !isExcludedRoute(route)) {
          dynamicRoutes.add(route);
        }
      }

      const pageCount = Number(payload?.meta?.pagination?.pageCount);
      if (Number.isFinite(pageCount) && pageCount > 0) {
        hasMore = page < pageCount;
      } else {
        hasMore = data.length >= companiesPageSize;
      }

      page += 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[sitemap] Dynamic company routes skipped due to fetch error: ${message}`);
    return [];
  }

  return Array.from(dynamicRoutes).sort((a, b) => a.localeCompare(b));
}

function renderUrlNode(baseUrl, route, lastmod) {
  const absoluteUrl = new URL(route, `${baseUrl}/`).toString();
  const lines = [
    '  <url>',
    `    <loc>${escapeXml(absoluteUrl)}</loc>`,
    '    <changefreq>weekly</changefreq>',
    `    <priority>${routePriority(route)}</priority>`,
    '  </url>',
  ];

  if (lastmod) {
    lines.splice(2, 0, `    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  }

  return lines.join('\n');
}

function normalizeLastmod(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid SITEMAP_LASTMOD value: "${rawValue}". Expected YYYY-MM-DD.`);
  }
  return value;
}

export async function createSitemapXml(options = {}) {
  const baseUrl = normalizeBaseUrl(options.siteUrl ?? process.env.SITE_URL);
  const lastmod = normalizeLastmod(options.lastmod ?? process.env.SITEMAP_LASTMOD);
  const staticRoutes = await readRoutes();
  const dynamicCompanyRoutes = await fetchDynamicCompanyRoutes(options);
  const routes = Array.from(new Set([...staticRoutes, ...dynamicCompanyRoutes]));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((route) => renderUrlNode(baseUrl, route, lastmod)),
    '</urlset>',
    '',
  ].join('\n');

  return {
    xml,
    routes,
    baseUrl,
    lastmod,
    dynamic: {
      companies: dynamicCompanyRoutes.length,
    },
  };
}

async function main() {
  const { xml, routes, baseUrl, lastmod, dynamic } = await createSitemapXml();

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, xml, 'utf8');

  const relativeOutput = path.relative(projectRoot, outputPath);
  console.log(`[sitemap] Wrote ${relativeOutput}`);
  console.log(`[sitemap] Base URL: ${baseUrl}`);
  console.log(`[sitemap] Lastmod: ${lastmod ?? '<omitted>'}`);
  console.log(`[sitemap] Dynamic company routes: ${dynamic.companies}`);
  console.log(`[sitemap] Routes: ${routes.length}`);
}

const isDirectRun = (() => {
  if (!process.argv[1]) {
    return false;
  }
  return path.resolve(process.argv[1]) === __filename;
})();

if (isDirectRun) {
  main().catch((error) => {
    console.error('[sitemap] Failed to generate sitemap');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  });
}
