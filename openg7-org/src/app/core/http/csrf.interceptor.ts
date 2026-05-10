import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'X-XSRF-TOKEN';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

function parseCookie(source: string, name: string): string | null {
  if (!source) {
    return null;
  }

  const prefix = `${name}=`;
  const match = source
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) {
    return null;
  }

  const [, value] = match.split('=');
  return value ? decodeURIComponent(value) : '';
}

function isRelativeUrl(url: string): boolean {
  return !/^([a-z][a-z0-9+\-.]*:)?\/\//i.test(url);
}

function isSameOrigin(url: string, origin: string): boolean {
  if (isRelativeUrl(url)) {
    return true;
  }

  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

/**
 * Contexte : Applied to mutable HTTP requests so browser-hosted sessions stay CSRF protected.
 * Raison d’être : Mirrors Angular’s legacy XSRF interceptor while supporting SSR-friendly guards.
 * @param req Original HTTP request emitted by Angular.
 * @param next Handler to forward the request.
 * @returns Observable with the request optionally enriched with CSRF headers.
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next(req);
  }

  const documentRef = inject(DOCUMENT, { optional: true });
  const cookieSource = documentRef?.cookie ?? '';
  const origin = documentRef?.defaultView?.location?.origin ?? '';

  if (!cookieSource || (!origin && !isRelativeUrl(req.url))) {
    return next(req);
  }

  if (!isSameOrigin(req.url, origin)) {
    return next(req);
  }

  const token = parseCookie(cookieSource, CSRF_COOKIE);
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { [CSRF_HEADER]: token },
      withCredentials: req.withCredentials !== false,
    }),
  );
};
